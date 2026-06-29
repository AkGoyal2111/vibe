/**
 * Shared types for the real-time collaboration layer. Imported by both the
 * Socket.io server (server.ts / socket handler) and the browser client so the
 * event payloads stay in sync.
 */

export interface CursorPosition {
  lineNumber: number;
  column: number;
}

export interface CollaboratorIdentity {
  /** Stable user id (from the auth session). */
  id: string;
  name: string;
  image?: string | null;
}

/** A participant as tracked by the server and broadcast to peers. */
export interface Collaborator extends CollaboratorIdentity {
  /** The socket connection id (a user may have multiple tabs). */
  socketId: string;
  /** Deterministic display colour derived from the user id. */
  color: string;
  /** Id of the file the user is currently viewing, if any. */
  activeFileId?: string | null;
  activeFileName?: string | null;
  /** Latest known cursor position in their active file. */
  cursor?: CursorPosition | null;
}

// ---- Client -> Server payloads -------------------------------------------

export interface JoinRoomPayload {
  roomId: string;
  user: CollaboratorIdentity;
}

export interface CodeChangePayload {
  roomId: string;
  fileId: string;
  content: string;
}

export interface CursorChangePayload {
  roomId: string;
  fileId: string;
  position: CursorPosition;
}

export interface ActiveFileChangePayload {
  roomId: string;
  fileId: string | null;
  fileName: string | null;
}

// ---- Server -> Client payloads -------------------------------------------

export interface RemoteCodeChange {
  fileId: string;
  content: string;
  userId: string;
}

export interface RemoteCursorChange {
  userId: string;
  fileId: string;
  position: CursorPosition;
}

/** Socket.io event name constants to avoid stringly-typed mistakes. */
export const COLLAB_EVENTS = {
  JOIN_ROOM: "collab:join-room",
  LEAVE_ROOM: "collab:leave-room",
  CODE_CHANGE: "collab:code-change",
  CURSOR_CHANGE: "collab:cursor-change",
  ACTIVE_FILE_CHANGE: "collab:active-file-change",
  ROOM_USERS: "collab:room-users",
  USER_JOINED: "collab:user-joined",
  USER_LEFT: "collab:user-left",
  REMOTE_CODE_CHANGE: "collab:remote-code-change",
  REMOTE_CURSOR_CHANGE: "collab:remote-cursor-change",

  // ---- WebRTC signalling (mesh audio/video call) ----
  RTC_JOIN_CALL: "rtc:join-call",
  RTC_LEAVE_CALL: "rtc:leave-call",
  RTC_CALL_PARTICIPANTS: "rtc:call-participants",
  RTC_PEER_JOINED: "rtc:peer-joined",
  RTC_PEER_LEFT: "rtc:peer-left",
  RTC_OFFER: "rtc:offer",
  RTC_ANSWER: "rtc:answer",
  RTC_ICE_CANDIDATE: "rtc:ice-candidate",

  // ---- Collaborative whiteboard ----
  WB_DRAW: "wb:draw",
  WB_CLEAR: "wb:clear",
  WB_REQUEST_STATE: "wb:request-state",
  WB_STATE: "wb:state",
} as const;

// ---- WebRTC payloads -------------------------------------------------------

export interface RtcSignalPayload {
  /** Target peer socket id the signal is addressed to. */
  to: string;
  /** SDP offer/answer or ICE candidate (kept loose to avoid DOM types here). */
  data: unknown;
}

export interface RtcRelayedSignal {
  /** Socket id the signal originated from. */
  from: string;
  data: unknown;
}

// ---- Whiteboard payloads ---------------------------------------------------

export interface WhiteboardStroke {
  /** Unique id (used to de-duplicate on replay). */
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  width: number;
}

/** A small palette of distinguishable, accessible colours for presence. */
export const COLLAB_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];

/** Deterministically map a user id to one of the presence colours. */
export function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  return COLLAB_COLORS[Math.abs(hash) % COLLAB_COLORS.length];
}
