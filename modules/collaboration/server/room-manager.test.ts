import { describe, it, expect, beforeEach } from "vitest";
import { RoomManager } from "./room-manager";
import type { Collaborator } from "../types";

function member(socketId: string, id: string, name: string): Collaborator {
  return {
    socketId,
    id,
    name,
    color: "#000000",
    activeFileId: null,
    activeFileName: null,
    cursor: null,
  };
}

describe("RoomManager", () => {
  let rm: RoomManager;
  beforeEach(() => {
    rm = new RoomManager();
  });

  it("adds members to a room", () => {
    rm.join("room-1", member("s1", "u1", "Alice"));
    rm.join("room-1", member("s2", "u2", "Bob"));
    expect(rm.getMembers("room-1")).toHaveLength(2);
    expect(rm.roomCount).toBe(1);
  });

  it("keeps rooms isolated from one another", () => {
    rm.join("room-1", member("s1", "u1", "Alice"));
    rm.join("room-2", member("s2", "u2", "Bob"));
    expect(rm.getMembers("room-1")).toHaveLength(1);
    expect(rm.getMembers("room-2")).toHaveLength(1);
    expect(rm.roomCount).toBe(2);
  });

  it("removes a member on leave and reports the remaining roster", () => {
    rm.join("room-1", member("s1", "u1", "Alice"));
    rm.join("room-1", member("s2", "u2", "Bob"));
    const result = rm.leave("s1");
    expect(result).not.toBeNull();
    expect(result!.roomId).toBe("room-1");
    expect(result!.left.id).toBe("u1");
    expect(result!.members).toHaveLength(1);
    expect(result!.members[0].id).toBe("u2");
  });

  it("drops the room once the last member leaves", () => {
    rm.join("room-1", member("s1", "u1", "Alice"));
    rm.leave("s1");
    expect(rm.roomCount).toBe(0);
    expect(rm.getMembers("room-1")).toEqual([]);
  });

  it("returns null when leaving with an untracked socket", () => {
    expect(rm.leave("ghost")).toBeNull();
  });

  it("tracks which room a socket is in", () => {
    rm.join("room-9", member("s1", "u1", "Alice"));
    expect(rm.getRoomIdForSocket("s1")).toBe("room-9");
    expect(rm.getRoomIdForSocket("nope")).toBeUndefined();
  });

  it("updates cursor position for a member", () => {
    rm.join("room-1", member("s1", "u1", "Alice"));
    const applied = rm.updateCursor("s1", "file.ts", { lineNumber: 3, column: 7 });
    expect(applied).toBe(true);
    const m = rm.getMembers("room-1")[0];
    expect(m.cursor).toEqual({ lineNumber: 3, column: 7 });
    expect(m.activeFileId).toBe("file.ts");
  });

  it("updates the active file for a member", () => {
    rm.join("room-1", member("s1", "u1", "Alice"));
    rm.updateActiveFile("s1", "main.ts", "main.ts");
    const m = rm.getMembers("room-1")[0];
    expect(m.activeFileId).toBe("main.ts");
    expect(m.activeFileName).toBe("main.ts");
  });

  it("ignores cursor updates for unknown sockets", () => {
    expect(rm.updateCursor("ghost", "f", { lineNumber: 1, column: 1 })).toBe(false);
  });
});
