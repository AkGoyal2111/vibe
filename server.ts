/**
 * Custom Next.js server that also hosts the Socket.io collaboration server.
 *
 * Next.js route handlers run in a serverless-style request/response model and
 * cannot hold the long-lived WebSocket connections that real-time collaboration
 * needs. Wrapping Next in a plain Node HTTP server lets us attach Socket.io on
 * the same port/origin (path: /api/socket).
 *
 * Run with `npm run dev` (development) or `npm run build && npm start`
 * (production). Note: this requires a long-running Node host — it will not work
 * on a purely serverless platform.
 */
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { registerCollaboration } from "./modules/collaboration/server";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url || "", true);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling request:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  const io = new SocketIOServer(httpServer, {
    path: "/api/socket",
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || `http://${hostname}:${port}`,
      methods: ["GET", "POST"],
    },
  });

  registerCollaboration(io);

  httpServer.listen(port, () => {
    console.log(
      `> Ready on http://${hostname}:${port} (socket.io on /api/socket)`
    );
  });
});
