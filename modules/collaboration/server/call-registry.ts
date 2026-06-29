/**
 * Tracks which sockets are currently in the audio/video call for each room.
 *
 * WebRTC itself is peer-to-peer; the server only needs to know who is in a call
 * so it can introduce new participants to existing ones (mesh topology). Pure
 * data structure, unit tested in isolation.
 */
export class CallRegistry {
  private calls = new Map<string, Set<string>>();

  /**
   * Adds a socket to a room's call and returns the *other* participants that
   * were already in the call (the newcomer initiates offers to them).
   */
  join(roomId: string, socketId: string): string[] {
    let participants = this.calls.get(roomId);
    if (!participants) {
      participants = new Set();
      this.calls.set(roomId, participants);
    }
    const existing = Array.from(participants).filter((id) => id !== socketId);
    participants.add(socketId);
    return existing;
  }

  /** Removes a socket from a room's call. Returns the room id if it was in one. */
  leave(roomId: string, socketId: string): boolean {
    const participants = this.calls.get(roomId);
    if (!participants || !participants.has(socketId)) return false;
    participants.delete(socketId);
    if (participants.size === 0) this.calls.delete(roomId);
    return true;
  }

  /** Removes a socket from every call it might be in (used on disconnect). */
  removeFromAll(socketId: string): string[] {
    const affected: string[] = [];
    for (const [roomId, participants] of this.calls) {
      if (participants.delete(socketId)) {
        affected.push(roomId);
        if (participants.size === 0) this.calls.delete(roomId);
      }
    }
    return affected;
  }

  /** Returns the participants currently in a room's call. */
  participants(roomId: string): string[] {
    return Array.from(this.calls.get(roomId) ?? []);
  }
}
