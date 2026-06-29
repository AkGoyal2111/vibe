import type { Collaborator, CursorPosition } from "../types";

/**
 * In-memory registry of collaboration rooms and their members.
 *
 * Pure data structure with no Socket.io dependency so it can be unit tested in
 * isolation. One instance is shared by the socket server. For a horizontally
 * scaled deployment this would be backed by Redis pub/sub instead.
 */
export class RoomManager {
  // roomId -> (socketId -> collaborator)
  private rooms = new Map<string, Map<string, Collaborator>>();
  // socketId -> roomId, for fast disconnect cleanup
  private socketRoom = new Map<string, string>();

  /** Adds (or replaces) a member in a room and returns the full member list. */
  join(roomId: string, collaborator: Collaborator): Collaborator[] {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Map();
      this.rooms.set(roomId, room);
    }
    room.set(collaborator.socketId, collaborator);
    this.socketRoom.set(collaborator.socketId, roomId);
    return this.getMembers(roomId);
  }

  /**
   * Removes a member by socket id. Returns the room they were in and the
   * remaining members, or null if the socket was not tracked.
   */
  leave(socketId: string): { roomId: string; members: Collaborator[]; left: Collaborator } | null {
    const roomId = this.socketRoom.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    const left = room?.get(socketId);
    this.socketRoom.delete(socketId);

    if (!room || !left) return null;

    room.delete(socketId);
    if (room.size === 0) this.rooms.delete(roomId);

    return { roomId, members: this.getMembers(roomId), left };
  }

  /** Returns the room id a socket currently belongs to, if any. */
  getRoomIdForSocket(socketId: string): string | undefined {
    return this.socketRoom.get(socketId);
  }

  /** Returns all members of a room (empty array if the room is unknown). */
  getMembers(roomId: string): Collaborator[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.values()) : [];
  }

  /** Updates the cursor of a socket's collaborator. Returns true if applied. */
  updateCursor(socketId: string, fileId: string, position: CursorPosition): boolean {
    const collaborator = this.find(socketId);
    if (!collaborator) return false;
    collaborator.activeFileId = fileId;
    collaborator.cursor = position;
    return true;
  }

  /** Updates which file a socket's collaborator is viewing. */
  updateActiveFile(
    socketId: string,
    fileId: string | null,
    fileName: string | null
  ): boolean {
    const collaborator = this.find(socketId);
    if (!collaborator) return false;
    collaborator.activeFileId = fileId;
    collaborator.activeFileName = fileName;
    return true;
  }

  /** Total number of active rooms (for diagnostics/tests). */
  get roomCount(): number {
    return this.rooms.size;
  }

  private find(socketId: string): Collaborator | undefined {
    const roomId = this.socketRoom.get(socketId);
    if (!roomId) return undefined;
    return this.rooms.get(roomId)?.get(socketId);
  }
}
