import type { WhiteboardStroke } from "../types";

/**
 * Keeps the whiteboard stroke history per room so that late joiners can request
 * the current board state and replay it. Bounded to avoid unbounded growth.
 */
export class WhiteboardStore {
  private boards = new Map<string, WhiteboardStroke[]>();
  private readonly maxStrokes: number;

  constructor(maxStrokes = 5000) {
    this.maxStrokes = maxStrokes;
  }

  /** Appends a stroke to a room's board. */
  addStroke(roomId: string, stroke: WhiteboardStroke): void {
    let strokes = this.boards.get(roomId);
    if (!strokes) {
      strokes = [];
      this.boards.set(roomId, strokes);
    }
    strokes.push(stroke);
    // Drop the oldest strokes if we exceed the cap.
    if (strokes.length > this.maxStrokes) {
      strokes.splice(0, strokes.length - this.maxStrokes);
    }
  }

  /** Returns a copy of the current strokes for a room. */
  getStrokes(roomId: string): WhiteboardStroke[] {
    return [...(this.boards.get(roomId) ?? [])];
  }

  /** Clears a room's board. */
  clear(roomId: string): void {
    this.boards.delete(roomId);
  }
}
