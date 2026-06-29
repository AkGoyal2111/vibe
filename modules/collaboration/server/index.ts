import type { Server, Socket } from "socket.io";
import { RoomManager } from "./room-manager";
import { CallRegistry } from "./call-registry";
import { WhiteboardStore } from "./whiteboard-store";
import {
  COLLAB_EVENTS,
  colorForUser,
  type ActiveFileChangePayload,
  type CodeChangePayload,
  type Collaborator,
  type CursorChangePayload,
  type JoinRoomPayload,
  type RtcSignalPayload,
  type WhiteboardStroke,
} from "../types";

/**
 * Registers all collaboration event handlers on a Socket.io server.
 *
 * Room model: one room per playground id. The server keeps an in-memory
 * presence list (who is here, what file they're on, where their cursor is) and
 * relays code/cursor changes to the other members. Code sync uses a
 * last-write-wins strategy keyed by file id — see README for the CRDT roadmap.
 */
export function registerCollaboration(io: Server): RoomManager {
  const rooms = new RoomManager();
  const calls = new CallRegistry();
  const whiteboards = new WhiteboardStore();

  io.on("connection", (socket: Socket) => {
    socket.on(COLLAB_EVENTS.JOIN_ROOM, (payload: JoinRoomPayload) => {
      const { roomId, user } = payload ?? {};
      if (!roomId || !user?.id) return;

      socket.join(roomId);

      const collaborator: Collaborator = {
        id: user.id,
        name: user.name,
        image: user.image ?? null,
        socketId: socket.id,
        color: colorForUser(user.id),
        activeFileId: null,
        activeFileName: null,
        cursor: null,
      };

      const members = rooms.join(roomId, collaborator);

      // Send the full roster to the joiner and announce them to everyone else.
      socket.emit(COLLAB_EVENTS.ROOM_USERS, members);
      socket.to(roomId).emit(COLLAB_EVENTS.USER_JOINED, collaborator);
      io.to(roomId).emit(COLLAB_EVENTS.ROOM_USERS, members);
    });

    socket.on(COLLAB_EVENTS.CODE_CHANGE, (payload: CodeChangePayload) => {
      const { roomId, fileId, content } = payload ?? {};
      if (!roomId || !fileId) return;
      const member = rooms
        .getMembers(roomId)
        .find((m) => m.socketId === socket.id);
      socket.to(roomId).emit(COLLAB_EVENTS.REMOTE_CODE_CHANGE, {
        fileId,
        content,
        userId: member?.id ?? socket.id,
      });
    });

    socket.on(COLLAB_EVENTS.CURSOR_CHANGE, (payload: CursorChangePayload) => {
      const { roomId, fileId, position } = payload ?? {};
      if (!roomId || !fileId || !position) return;
      rooms.updateCursor(socket.id, fileId, position);
      const member = rooms
        .getMembers(roomId)
        .find((m) => m.socketId === socket.id);
      socket.to(roomId).emit(COLLAB_EVENTS.REMOTE_CURSOR_CHANGE, {
        userId: member?.id ?? socket.id,
        fileId,
        position,
      });
    });

    socket.on(
      COLLAB_EVENTS.ACTIVE_FILE_CHANGE,
      (payload: ActiveFileChangePayload) => {
        const { roomId, fileId, fileName } = payload ?? {};
        if (!roomId) return;
        rooms.updateActiveFile(socket.id, fileId, fileName);
        io.to(roomId).emit(COLLAB_EVENTS.ROOM_USERS, rooms.getMembers(roomId));
      }
    );

    // ---- WebRTC signalling (mesh audio/video) ----------------------------

    socket.on(COLLAB_EVENTS.RTC_JOIN_CALL, ({ roomId }: { roomId: string }) => {
      if (!roomId) return;
      const existing = calls.join(roomId, socket.id);
      // Tell the newcomer who is already on the call (they will send offers).
      socket.emit(COLLAB_EVENTS.RTC_CALL_PARTICIPANTS, { participants: existing });
      // Tell existing participants a new peer joined (they wait for the offer).
      socket
        .to(roomId)
        .emit(COLLAB_EVENTS.RTC_PEER_JOINED, { socketId: socket.id });
    });

    const leaveCall = (roomId: string) => {
      if (!calls.leave(roomId, socket.id)) return;
      socket
        .to(roomId)
        .emit(COLLAB_EVENTS.RTC_PEER_LEFT, { socketId: socket.id });
    };

    socket.on(COLLAB_EVENTS.RTC_LEAVE_CALL, ({ roomId }: { roomId: string }) =>
      leaveCall(roomId)
    );

    // Relay SDP/ICE directly to the addressed peer.
    const relaySignal =
      (event: string) => (payload: RtcSignalPayload) => {
        if (!payload?.to) return;
        io.to(payload.to).emit(event, { from: socket.id, data: payload.data });
      };
    socket.on(COLLAB_EVENTS.RTC_OFFER, relaySignal(COLLAB_EVENTS.RTC_OFFER));
    socket.on(COLLAB_EVENTS.RTC_ANSWER, relaySignal(COLLAB_EVENTS.RTC_ANSWER));
    socket.on(
      COLLAB_EVENTS.RTC_ICE_CANDIDATE,
      relaySignal(COLLAB_EVENTS.RTC_ICE_CANDIDATE)
    );

    // ---- Collaborative whiteboard ----------------------------------------

    socket.on(
      COLLAB_EVENTS.WB_DRAW,
      ({ roomId, stroke }: { roomId: string; stroke: WhiteboardStroke }) => {
        if (!roomId || !stroke) return;
        whiteboards.addStroke(roomId, stroke);
        socket.to(roomId).emit(COLLAB_EVENTS.WB_DRAW, { stroke });
      }
    );

    socket.on(COLLAB_EVENTS.WB_CLEAR, ({ roomId }: { roomId: string }) => {
      if (!roomId) return;
      whiteboards.clear(roomId);
      io.to(roomId).emit(COLLAB_EVENTS.WB_CLEAR);
    });

    socket.on(
      COLLAB_EVENTS.WB_REQUEST_STATE,
      ({ roomId }: { roomId: string }) => {
        if (!roomId) return;
        socket.emit(COLLAB_EVENTS.WB_STATE, {
          strokes: whiteboards.getStrokes(roomId),
        });
      }
    );

    // ---- Disconnect / leave ----------------------------------------------

    const handleLeave = () => {
      // Clean up any call membership and notify peers.
      for (const roomId of calls.removeFromAll(socket.id)) {
        socket
          .to(roomId)
          .emit(COLLAB_EVENTS.RTC_PEER_LEFT, { socketId: socket.id });
      }

      const result = rooms.leave(socket.id);
      if (!result) return;
      socket.to(result.roomId).emit(COLLAB_EVENTS.USER_LEFT, {
        userId: result.left.id,
        socketId: socket.id,
      });
      io.to(result.roomId).emit(COLLAB_EVENTS.ROOM_USERS, result.members);
    };

    socket.on(COLLAB_EVENTS.LEAVE_ROOM, handleLeave);
    socket.on("disconnect", handleLeave);
  });

  return rooms;
}
