"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCollabSocket } from "../lib/socket-client";
import {
  COLLAB_EVENTS,
  type Collaborator,
  type CollaboratorIdentity,
  type CursorPosition,
  type RemoteCodeChange,
  type RemoteCursorChange,
} from "../types";

interface UseCollaborationOptions {
  /** The playground id used as the room id. */
  roomId: string;
  /** The current authenticated user. Collaboration is disabled when absent. */
  user?: CollaboratorIdentity | null;
  /** Whether collaboration is enabled (e.g. toggled on by the user). */
  enabled?: boolean;
  /** Called when another user edits a file. */
  onRemoteCodeChange?: (change: RemoteCodeChange) => void;
  /** Called when another user moves their cursor. */
  onRemoteCursorChange?: (change: RemoteCursorChange) => void;
}

interface UseCollaborationResult {
  isConnected: boolean;
  /** Everyone in the room (including the local user). */
  collaborators: Collaborator[];
  /** Other participants only. */
  others: Collaborator[];
  broadcastCodeChange: (fileId: string, content: string) => void;
  broadcastCursor: (fileId: string, position: CursorPosition) => void;
  setActiveFile: (fileId: string | null, fileName: string | null) => void;
}

/**
 * Connects to the collaboration room for a playground and exposes presence plus
 * broadcast helpers. Remote events are surfaced via callbacks so the editor can
 * apply incoming changes.
 */
export function useCollaboration({
  roomId,
  user,
  enabled = true,
  onRemoteCodeChange,
  onRemoteCursorChange,
}: UseCollaborationOptions): UseCollaborationResult {
  const [isConnected, setIsConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  // Keep latest callbacks in refs so the connect effect doesn't re-run on every
  // render when callers pass inline functions.
  const codeCb = useRef(onRemoteCodeChange);
  const cursorCb = useRef(onRemoteCursorChange);
  codeCb.current = onRemoteCodeChange;
  cursorCb.current = onRemoteCursorChange;

  const active = Boolean(enabled && user?.id && roomId);

  useEffect(() => {
    if (!active || !user) return;

    const socket = getCollabSocket();

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit(COLLAB_EVENTS.JOIN_ROOM, {
        roomId,
        user: { id: user.id, name: user.name, image: user.image },
      });
    };

    const handleDisconnect = () => setIsConnected(false);
    const handleRoomUsers = (members: Collaborator[]) =>
      setCollaborators(members);
    const handleRemoteCode = (change: RemoteCodeChange) =>
      codeCb.current?.(change);
    const handleRemoteCursor = (change: RemoteCursorChange) =>
      cursorCb.current?.(change);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on(COLLAB_EVENTS.ROOM_USERS, handleRoomUsers);
    socket.on(COLLAB_EVENTS.REMOTE_CODE_CHANGE, handleRemoteCode);
    socket.on(COLLAB_EVENTS.REMOTE_CURSOR_CHANGE, handleRemoteCursor);

    // If the socket is already connected, join immediately.
    if (socket.connected) handleConnect();

    return () => {
      socket.emit(COLLAB_EVENTS.LEAVE_ROOM, { roomId });
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off(COLLAB_EVENTS.ROOM_USERS, handleRoomUsers);
      socket.off(COLLAB_EVENTS.REMOTE_CODE_CHANGE, handleRemoteCode);
      socket.off(COLLAB_EVENTS.REMOTE_CURSOR_CHANGE, handleRemoteCursor);
      setCollaborators([]);
    };
    // user.id/name/image are primitives; depend on them rather than the object.
  }, [active, roomId, user?.id, user?.name, user?.image, user]);

  const broadcastCodeChange = useCallback(
    (fileId: string, content: string) => {
      if (!active) return;
      getCollabSocket().emit(COLLAB_EVENTS.CODE_CHANGE, {
        roomId,
        fileId,
        content,
      });
    },
    [active, roomId]
  );

  const broadcastCursor = useCallback(
    (fileId: string, position: CursorPosition) => {
      if (!active) return;
      getCollabSocket().emit(COLLAB_EVENTS.CURSOR_CHANGE, {
        roomId,
        fileId,
        position,
      });
    },
    [active, roomId]
  );

  const setActiveFile = useCallback(
    (fileId: string | null, fileName: string | null) => {
      if (!active) return;
      getCollabSocket().emit(COLLAB_EVENTS.ACTIVE_FILE_CHANGE, {
        roomId,
        fileId,
        fileName,
      });
    },
    [active, roomId]
  );

  const others = collaborators.filter((c) => c.id !== user?.id);

  return {
    isConnected,
    collaborators,
    others,
    broadcastCodeChange,
    broadcastCursor,
    setActiveFile,
  };
}
