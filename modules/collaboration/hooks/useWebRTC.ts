"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCollabSocket } from "../lib/socket-client";
import { COLLAB_EVENTS, type RtcRelayedSignal } from "../types";

interface UseWebRTCOptions {
  roomId: string;
  /** Collaboration must be active (socket joined to the room) for signalling. */
  enabled: boolean;
}

export interface RemotePeerStream {
  socketId: string;
  stream: MediaStream;
}

interface UseWebRTCResult {
  inCall: boolean;
  localStream: MediaStream | null;
  remoteStreams: RemotePeerStream[];
  audioEnabled: boolean;
  videoEnabled: boolean;
  error: string | null;
  joinCall: () => Promise<void>;
  leaveCall: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
}

// Public STUN server is enough for same-network / localhost demos. Cross-NAT
// calls would additionally need a TURN server.
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

/**
 * Mesh WebRTC audio/video calling layered on the collaboration socket. Each
 * participant maintains one RTCPeerConnection per peer. The server only does
 * signalling (introductions + SDP/ICE relay); media flows peer-to-peer.
 */
export function useWebRTC({ roomId, enabled }: UseWebRTCOptions): UseWebRTCResult {
  const [inCall, setInCall] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemotePeerStream[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const peers = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const inCallRef = useRef(false);

  const upsertRemote = useCallback((socketId: string, stream: MediaStream) => {
    setRemoteStreams((prev) => {
      const next = prev.filter((p) => p.socketId !== socketId);
      next.push({ socketId, stream });
      return next;
    });
  }, []);

  const removeRemote = useCallback((socketId: string) => {
    setRemoteStreams((prev) => prev.filter((p) => p.socketId !== socketId));
  }, []);

  const closePeer = useCallback(
    (socketId: string) => {
      const pc = peers.current.get(socketId);
      if (pc) {
        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.close();
        peers.current.delete(socketId);
      }
      removeRemote(socketId);
    },
    [removeRemote]
  );

  // Creates (or returns) a peer connection wired up with local tracks + handlers.
  const createPeer = useCallback(
    (socketId: string) => {
      const existing = peers.current.get(socketId);
      if (existing) return existing;

      const socket = getCollabSocket();
      const pc = new RTCPeerConnection(ICE_SERVERS);

      localStreamRef.current
        ?.getTracks()
        .forEach((track) => pc.addTrack(track, localStreamRef.current!));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit(COLLAB_EVENTS.RTC_ICE_CANDIDATE, {
            to: socketId,
            data: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        upsertRemote(socketId, event.streams[0]);
      };

      peers.current.set(socketId, pc);
      return pc;
    },
    [upsertRemote]
  );

  const leaveCall = useCallback(() => {
    const socket = getCollabSocket();
    socket.emit(COLLAB_EVENTS.RTC_LEAVE_CALL, { roomId });

    peers.current.forEach((_, id) => closePeer(id));
    peers.current.clear();

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStreams([]);
    inCallRef.current = false;
    setInCall(false);
  }, [roomId, closePeer]);

  const joinCall = useCallback(async () => {
    if (inCallRef.current) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setAudioEnabled(true);
      setVideoEnabled(true);
      inCallRef.current = true;
      setInCall(true);

      getCollabSocket().emit(COLLAB_EVENTS.RTC_JOIN_CALL, { roomId });
    } catch (err) {
      setError(
        err instanceof Error
          ? `Could not access camera/microphone: ${err.message}`
          : "Could not access camera/microphone."
      );
    }
  }, [roomId]);

  const toggleAudio = useCallback(() => {
    const tracks = localStreamRef.current?.getAudioTracks() ?? [];
    const next = !audioEnabled;
    tracks.forEach((t) => (t.enabled = next));
    setAudioEnabled(next);
  }, [audioEnabled]);

  const toggleVideo = useCallback(() => {
    const tracks = localStreamRef.current?.getVideoTracks() ?? [];
    const next = !videoEnabled;
    tracks.forEach((t) => (t.enabled = next));
    setVideoEnabled(next);
  }, [videoEnabled]);

  // Wire up signalling listeners while in a call.
  useEffect(() => {
    if (!enabled || !inCall) return;
    const socket = getCollabSocket();

    // Existing participants -> we initiate an offer to each.
    const onParticipants = async ({
      participants,
    }: {
      participants: string[];
    }) => {
      for (const peerId of participants) {
        const pc = createPeer(peerId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit(COLLAB_EVENTS.RTC_OFFER, { to: peerId, data: offer });
      }
    };

    // A new peer joined; we just prepare a connection and await their offer.
    const onPeerJoined = ({ socketId }: { socketId: string }) => {
      createPeer(socketId);
    };

    const onOffer = async ({ from, data }: RtcRelayedSignal) => {
      const pc = createPeer(from);
      await pc.setRemoteDescription(
        new RTCSessionDescription(data as RTCSessionDescriptionInit)
      );
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit(COLLAB_EVENTS.RTC_ANSWER, { to: from, data: answer });
    };

    const onAnswer = async ({ from, data }: RtcRelayedSignal) => {
      const pc = peers.current.get(from);
      if (pc) {
        await pc.setRemoteDescription(
          new RTCSessionDescription(data as RTCSessionDescriptionInit)
        );
      }
    };

    const onIce = async ({ from, data }: RtcRelayedSignal) => {
      const pc = peers.current.get(from);
      if (pc && data) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data as RTCIceCandidateInit));
        } catch {
          /* ignore late/duplicate candidates */
        }
      }
    };

    const onPeerLeft = ({ socketId }: { socketId: string }) =>
      closePeer(socketId);

    socket.on(COLLAB_EVENTS.RTC_CALL_PARTICIPANTS, onParticipants);
    socket.on(COLLAB_EVENTS.RTC_PEER_JOINED, onPeerJoined);
    socket.on(COLLAB_EVENTS.RTC_OFFER, onOffer);
    socket.on(COLLAB_EVENTS.RTC_ANSWER, onAnswer);
    socket.on(COLLAB_EVENTS.RTC_ICE_CANDIDATE, onIce);
    socket.on(COLLAB_EVENTS.RTC_PEER_LEFT, onPeerLeft);

    return () => {
      socket.off(COLLAB_EVENTS.RTC_CALL_PARTICIPANTS, onParticipants);
      socket.off(COLLAB_EVENTS.RTC_PEER_JOINED, onPeerJoined);
      socket.off(COLLAB_EVENTS.RTC_OFFER, onOffer);
      socket.off(COLLAB_EVENTS.RTC_ANSWER, onAnswer);
      socket.off(COLLAB_EVENTS.RTC_ICE_CANDIDATE, onIce);
      socket.off(COLLAB_EVENTS.RTC_PEER_LEFT, onPeerLeft);
    };
  }, [enabled, inCall, createPeer, closePeer]);

  // Tear down on unmount.
  useEffect(() => {
    return () => {
      if (inCallRef.current) leaveCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    inCall,
    localStream,
    remoteStreams,
    audioEnabled,
    videoEnabled,
    error,
    joinCall,
    leaveCall,
    toggleAudio,
    toggleVideo,
  };
}
