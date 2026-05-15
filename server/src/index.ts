import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import {
  createInitialState,
  currentExpectedPlayerId,
  nextRoundOrEnd,
  placeBid,
  playCard,
  resolveTrick,
  startRound,
} from "../../src/game/engine";
import { RoomRegistry, IOServer, ServerRoom } from "./rooms.ts";
import { MIN_PLAYERS } from "../../src/lib/protocol";

const PORT = Number(process.env.PORT) || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

const httpServer = http.createServer(app);
const io: IOServer = new Server(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ["GET", "POST"] },
});

const registry = new RoomRegistry();

// Track each socket's current room+player (for disconnect handling)
const sessionByPlayer = new Map<string, { code: string; socketId: string }>();

function broadcastGame(room: ServerRoom) {
  if (!room.gameState) return;
  io.to(`room:${room.code}`).emit("game:state", room.gameState);
}

function startGame(room: ServerRoom) {
  if (room.players.size < MIN_PLAYERS) return;
  const players = registry.toGamePlayers(room);
  let state = createInitialState(players, room.settings);
  state = startRound(state);
  room.gameState = state;
  room.phase = "playing";
  registry.emitRoom(io, room);
  broadcastGame(room);
}

function autoResolveTrickIfNeeded(room: ServerRoom) {
  if (!room.gameState) return;
  if (room.gameState.phase !== "trick_resolution") return;
  setTimeout(() => {
    if (!room.gameState) return;
    if (room.gameState.phase !== "trick_resolution") return;
    room.gameState = resolveTrick(room.gameState);
    broadcastGame(room);
  }, 1500);
}

io.on("connection", (socket) => {
  let playerId: string | null = null;
  let roomCode: string | null = null;

  socket.on("room:create", (data, ack) => {
    const name = (data && data.name) || "Player";
    const { room, player } = registry.createRoom(name, socket.id);
    playerId = player.id;
    roomCode = room.code;
    sessionByPlayer.set(player.id, { code: room.code, socketId: socket.id });
    socket.join(`room:${room.code}`);
    ack({ ok: true, code: room.code, playerId: player.id });
    registry.emitRoom(io, room);
  });

  socket.on("room:join", (data, ack) => {
    const code = (data && data.code) || "";
    const name = (data && data.name) || "Player";
    const result = registry.joinRoom(code, name, socket.id);
    if (!result.ok) {
      ack({ ok: false, error: result.error });
      return;
    }
    playerId = result.player.id;
    roomCode = result.room.code;
    sessionByPlayer.set(result.player.id, { code: result.room.code, socketId: socket.id });
    socket.join(`room:${result.room.code}`);
    ack({ ok: true, playerId: result.player.id });
    registry.emitRoom(io, result.room);
  });

  socket.on("room:leave", () => {
    if (!roomCode || !playerId) return;
    const room = registry.leaveRoom(roomCode, playerId);
    socket.leave(`room:${roomCode}`);
    sessionByPlayer.delete(playerId);
    socket.emit("room:left");
    if (room) registry.emitRoom(io, room);
    playerId = null;
    roomCode = null;
  });

  socket.on("room:ready", ({ ready }) => {
    if (!roomCode || !playerId) return;
    const room = registry.setReady(roomCode, playerId, ready);
    if (room) registry.emitRoom(io, room);
  });

  socket.on("room:settings", ({ settings }) => {
    if (!roomCode || !playerId) return;
    const room = registry.updateSettings(roomCode, playerId, settings);
    if (room) registry.emitRoom(io, room);
  });

  socket.on("room:kick", ({ playerId: targetId }) => {
    if (!roomCode || !playerId) return;
    const result = registry.kickPlayer(roomCode, playerId, targetId);
    if (!result.ok) {
      socket.emit("room:error", { message: result.error });
      return;
    }
    sessionByPlayer.delete(targetId);
    // Notify the kicked player + make them leave the socket.io room
    io.sockets.sockets.get(result.targetSocketId)?.emit("room:left");
    io.sockets.sockets.get(result.targetSocketId)?.leave(`room:${roomCode}`);
    if (result.room) registry.emitRoom(io, result.room);
  });

  socket.on("room:start", () => {
    if (!roomCode || !playerId) return;
    const room = registry.getRoom(roomCode);
    if (!room || room.hostId !== playerId || room.phase !== "lobby") return;
    if (room.players.size < MIN_PLAYERS) {
      socket.emit("room:error", { message: `Need at least ${MIN_PLAYERS} players` });
      return;
    }
    const allReady = [...room.players.values()].every((p) => p.ready || p.id === room.hostId);
    if (!allReady) {
      socket.emit("room:error", { message: "Not all players are ready" });
      return;
    }
    startGame(room);
  });

  socket.on("game:bid", ({ bid }) => {
    if (!roomCode || !playerId) return;
    const room = registry.getRoom(roomCode);
    if (!room || !room.gameState) return;
    if (currentExpectedPlayerId(room.gameState) !== playerId) return;
    room.gameState = placeBid(room.gameState, playerId, bid);
    broadcastGame(room);
  });

  socket.on("game:play", ({ card }) => {
    if (!roomCode || !playerId) return;
    const room = registry.getRoom(roomCode);
    if (!room || !room.gameState) return;
    if (currentExpectedPlayerId(room.gameState) !== playerId) return;
    room.gameState = playCard(room.gameState, playerId, card);
    broadcastGame(room);
    if (room.gameState.phase === "trick_resolution") {
      autoResolveTrickIfNeeded(room);
    }
  });

  socket.on("game:next", () => {
    if (!roomCode || !playerId) return;
    const room = registry.getRoom(roomCode);
    if (!room || !room.gameState) return;
    if (room.gameState.phase !== "round_summary") return;
    if (room.hostId !== playerId) return;
    room.gameState = nextRoundOrEnd(room.gameState);
    if (room.gameState.phase === "game_over") {
      room.phase = "finished";
      registry.emitRoom(io, room);
    }
    broadcastGame(room);
  });

  socket.on("game:return-to-lobby", () => {
    if (!roomCode || !playerId) return;
    const room = registry.getRoom(roomCode);
    if (!room) return;
    if (room.hostId !== playerId) return;
    room.gameState = null;
    room.phase = "lobby";
    [...room.players.values()].forEach((p) => (p.ready = false));
    registry.emitRoom(io, room);
  });

  socket.on("disconnect", () => {
    if (!roomCode || !playerId) return;
    const room = registry.setConnected(roomCode, playerId, false);
    if (room) registry.emitRoom(io, room);
    setTimeout(() => {
      const r = roomCode ? registry.getRoom(roomCode) : null;
      if (!r || !playerId) return;
      const p = r.players.get(playerId);
      if (p && !p.connected) {
        const after = registry.leaveRoom(r.code, playerId);
        if (after) registry.emitRoom(io, after);
      }
    }, 30_000);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] Kachu Ful server listening on :${PORT}`);
});
