"use client";

import { useEffect, useRef } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebRTC } from "../hooks/useWebRTC";

interface VideoCallPanelProps {
  roomId: string;
  /** Collaboration must be active for signalling to work. */
  enabled: boolean;
}

/** Attaches a MediaStream to a <video> element. */
function VideoTile({
  stream,
  muted,
  label,
}: {
  stream: MediaStream;
  muted?: boolean;
  label: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-md bg-black">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className="h-full w-full object-cover"
      />
      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
        {label}
      </span>
    </div>
  );
}

/**
 * Mesh audio/video call panel. Uses WebRTC peer connections signalled over the
 * collaboration socket; media is peer-to-peer.
 */
export default function VideoCallPanel({ roomId, enabled }: VideoCallPanelProps) {
  const {
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
  } = useWebRTC({ roomId, enabled });

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Video call</h3>
        {inCall ? (
          <span className="text-xs text-green-500">
            {remoteStreams.length + 1} in call
          </span>
        ) : null}
      </div>

      {!enabled && (
        <p className="text-xs text-muted-foreground">
          Collaboration is connecting…
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {inCall ? (
        <>
          <div className="grid flex-1 grid-cols-2 gap-2 overflow-y-auto">
            {localStream && (
              <VideoTile stream={localStream} muted label="You" />
            )}
            {remoteStreams.map((r) => (
              <VideoTile key={r.socketId} stream={r.stream} label="Peer" />
            ))}
          </div>

          <div className="flex items-center justify-center gap-2">
            <Button
              size="icon"
              variant={audioEnabled ? "outline" : "secondary"}
              onClick={toggleAudio}
              title={audioEnabled ? "Mute" : "Unmute"}
            >
              {audioEnabled ? (
                <Mic className="h-4 w-4" />
              ) : (
                <MicOff className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant={videoEnabled ? "outline" : "secondary"}
              onClick={toggleVideo}
              title={videoEnabled ? "Turn camera off" : "Turn camera on"}
            >
              {videoEnabled ? (
                <Video className="h-4 w-4" />
              ) : (
                <VideoOff className="h-4 w-4" />
              )}
            </Button>
            <Button size="icon" variant="destructive" onClick={leaveCall} title="Leave call">
              <PhoneOff className="h-4 w-4" />
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-xs text-muted-foreground">
            Start a call with everyone in this playground.
          </p>
          <Button size="sm" onClick={joinCall} disabled={!enabled}>
            <Phone className="mr-2 h-4 w-4" />
            Join call
          </Button>
        </div>
      )}
    </div>
  );
}
