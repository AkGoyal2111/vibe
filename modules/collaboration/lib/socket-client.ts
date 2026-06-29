"use client";

import { io, type Socket } from "socket.io-client";

/**
 * Returns a lazily-created singleton Socket.io client connected to the custom
 * server (path: /api/socket). A single connection is shared across the app so
 * we don't open a new socket per component mount.
 */
let socket: Socket | null = null;

export function getCollabSocket(): Socket {
  if (!socket) {
    const url =
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");

    socket = io(url, {
      path: "/api/socket",
      autoConnect: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function disconnectCollabSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
