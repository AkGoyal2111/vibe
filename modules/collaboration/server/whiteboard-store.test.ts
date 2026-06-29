import { describe, it, expect } from "vitest";
import { WhiteboardStore } from "./whiteboard-store";
import type { WhiteboardStroke } from "../types";

const stroke = (id: string): WhiteboardStroke => ({
  id,
  from: { x: 0, y: 0 },
  to: { x: 1, y: 1 },
  color: "#000",
  width: 2,
});

describe("WhiteboardStore", () => {
  it("stores and returns strokes per room", () => {
    const wb = new WhiteboardStore();
    wb.addStroke("room", stroke("a"));
    wb.addStroke("room", stroke("b"));
    expect(wb.getStrokes("room").map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("returns an empty array for an unknown room", () => {
    expect(new WhiteboardStore().getStrokes("nope")).toEqual([]);
  });

  it("returns a copy so callers cannot mutate internal state", () => {
    const wb = new WhiteboardStore();
    wb.addStroke("room", stroke("a"));
    const list = wb.getStrokes("room");
    list.push(stroke("x"));
    expect(wb.getStrokes("room")).toHaveLength(1);
  });

  it("clears a room's board", () => {
    const wb = new WhiteboardStore();
    wb.addStroke("room", stroke("a"));
    wb.clear("room");
    expect(wb.getStrokes("room")).toEqual([]);
  });

  it("keeps rooms isolated", () => {
    const wb = new WhiteboardStore();
    wb.addStroke("a", stroke("1"));
    wb.addStroke("b", stroke("2"));
    expect(wb.getStrokes("a").map((s) => s.id)).toEqual(["1"]);
    expect(wb.getStrokes("b").map((s) => s.id)).toEqual(["2"]);
  });

  it("caps history at maxStrokes, dropping the oldest", () => {
    const wb = new WhiteboardStore(3);
    ["a", "b", "c", "d"].forEach((id) => wb.addStroke("room", stroke(id)));
    expect(wb.getStrokes("room").map((s) => s.id)).toEqual(["b", "c", "d"]);
  });
});
