"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCollabSocket } from "../lib/socket-client";
import { COLLAB_EVENTS, type WhiteboardStroke } from "../types";

interface WhiteboardProps {
  roomId: string;
  enabled: boolean;
}

const COLORS = ["#111827", "#ef4444", "#22c55e", "#3b82f6", "#eab308", "#ffffff"];
const SIZES = [2, 4, 8];

/**
 * Collaborative whiteboard. Strokes are stored as normalised coordinates (0..1)
 * so peers with different canvas sizes render identically. Local strokes are
 * drawn immediately and broadcast; remote strokes are drawn on receipt. New
 * joiners request the current board state and replay it.
 */
export default function Whiteboard({ roomId, enabled }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState(COLORS[1]);
  const [width, setWidth] = useState(SIZES[1]);

  const drawSegment = useCallback((stroke: WhiteboardStroke) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(stroke.from.x * canvas.width, stroke.from.y * canvas.height);
    ctx.lineTo(stroke.to.x * canvas.width, stroke.to.y * canvas.height);
    ctx.stroke();
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Size the canvas backing store to its rendered size once mounted.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }, []);

  // Socket wiring: replay existing board, then apply remote strokes/clears.
  useEffect(() => {
    if (!enabled) return;
    const socket = getCollabSocket();

    const onState = ({ strokes }: { strokes: WhiteboardStroke[] }) => {
      clearCanvas();
      strokes.forEach(drawSegment);
    };
    const onDraw = ({ stroke }: { stroke: WhiteboardStroke }) =>
      drawSegment(stroke);
    const onClear = () => clearCanvas();

    socket.on(COLLAB_EVENTS.WB_STATE, onState);
    socket.on(COLLAB_EVENTS.WB_DRAW, onDraw);
    socket.on(COLLAB_EVENTS.WB_CLEAR, onClear);

    socket.emit(COLLAB_EVENTS.WB_REQUEST_STATE, { roomId });

    return () => {
      socket.off(COLLAB_EVENTS.WB_STATE, onState);
      socket.off(COLLAB_EVENTS.WB_DRAW, onDraw);
      socket.off(COLLAB_EVENTS.WB_CLEAR, onClear);
    };
  }, [enabled, roomId, drawSegment, clearCanvas]);

  const toNorm = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    lastPoint.current = toNorm(e);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !lastPoint.current) return;
    const point = toNorm(e);
    const stroke: WhiteboardStroke = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      from: lastPoint.current,
      to: point,
      color,
      width,
    };
    drawSegment(stroke);
    if (enabled) getCollabSocket().emit(COLLAB_EVENTS.WB_DRAW, { roomId, stroke });
    lastPoint.current = point;
  };

  const endStroke = () => {
    drawing.current = false;
    lastPoint.current = null;
  };

  const handleClear = () => {
    clearCanvas();
    if (enabled) getCollabSocket().emit(COLLAB_EVENTS.WB_CLEAR, { roomId });
  };

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className="flex items-center gap-2">
        <h3 className="mr-auto text-sm font-medium">Whiteboard</h3>
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`h-5 w-5 rounded-full border ${
              color === c ? "ring-2 ring-offset-1" : ""
            }`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
        <select
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          className="rounded border bg-background px-1 py-0.5 text-xs"
          title="Brush size"
        >
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {s}px
            </option>
          ))}
        </select>
        <Button size="icon" variant="outline" onClick={handleClear} title="Clear board">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
        className="flex-1 touch-none rounded-md border bg-white"
      />

      {!enabled && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Eraser className="h-3 w-3" /> Connecting…
        </p>
      )}
    </div>
  );
}
