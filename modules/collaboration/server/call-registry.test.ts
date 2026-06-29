import { describe, it, expect, beforeEach } from "vitest";
import { CallRegistry } from "./call-registry";

describe("CallRegistry", () => {
  let cr: CallRegistry;
  beforeEach(() => {
    cr = new CallRegistry();
  });

  it("returns no existing participants for the first joiner", () => {
    expect(cr.join("room", "s1")).toEqual([]);
    expect(cr.participants("room")).toEqual(["s1"]);
  });

  it("returns prior participants to a later joiner", () => {
    cr.join("room", "s1");
    cr.join("room", "s2");
    const existing = cr.join("room", "s3");
    expect(existing.sort()).toEqual(["s1", "s2"]);
    expect(cr.participants("room")).toHaveLength(3);
  });

  it("does not list the joiner among existing participants", () => {
    cr.join("room", "s1");
    expect(cr.join("room", "s1")).toEqual([]); // re-join is idempotent-ish
  });

  it("removes a participant on leave", () => {
    cr.join("room", "s1");
    cr.join("room", "s2");
    expect(cr.leave("room", "s1")).toBe(true);
    expect(cr.participants("room")).toEqual(["s2"]);
  });

  it("returns false when leaving a call the socket is not in", () => {
    expect(cr.leave("room", "ghost")).toBe(false);
  });

  it("removeFromAll clears the socket from every room and reports them", () => {
    cr.join("room-a", "s1");
    cr.join("room-b", "s1");
    cr.join("room-b", "s2");
    const affected = cr.removeFromAll("s1");
    expect(affected.sort()).toEqual(["room-a", "room-b"]);
    expect(cr.participants("room-a")).toEqual([]);
    expect(cr.participants("room-b")).toEqual(["s2"]);
  });

  it("keeps rooms isolated", () => {
    cr.join("room-a", "s1");
    cr.join("room-b", "s2");
    expect(cr.participants("room-a")).toEqual(["s1"]);
    expect(cr.participants("room-b")).toEqual(["s2"]);
  });
});
