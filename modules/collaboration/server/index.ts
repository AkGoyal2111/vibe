import type { Server, Socket } from "socket.io";
import { RoomManager } from "./room-manager";
import {
  COLLAB_EVENTS,
  colorForUser,
  type ActiveFileChangePayload,
  type CodeChangePayload,
  type Collaborator,
  type CursorChangePayload,
  type JoinRoomPayload,
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

    const handleLeave = () => {
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
