import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import {
  createInitialState,
  currentExpectedPlayerId,
  getForbiddenDealerBid,
  nextRoundOrEnd,
  placeBid,
  playCard,
  resolveTrick,
  startRound,
} from "../../src/game/engine";
import { botBid, botPlay } from "../../src/game/ai";
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

// Track which rooms have an active bot loop so we don't spawn duplicates
const botLoopActive = new Set<string>();

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
  void advanceBotMoves(room);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Drives moves for any seat that is currently AI-controlled. Runs in a loop
 * until the next expected player is a human, the game ends, or the phase
 * leaves bidding/playing. Re-entrant-safe via the botLoopActive set.
 */
async function advanceBotMoves(room: ServerRoom) {
  if (botLoopActive.has(room.code)) return;
  botLoopActive.add(room.code);
  try {
    while (room.gameState) {
      const state = room.gameState;
      if (state.phase !== "bidding" && state.phase !== "playing") {
        if (state.phase === "trick_resolution") {
          await sleep(1500);
          if (!room.gameState) break;
          room.gameState = resolveTrick(room.gameState);
          broadcastGame(room);
          continue;
        }
        break;
      }
      const expectedId = currentExpectedPlayerId(state);
      if (!expectedId) break;
      const player = room.players.get(expectedId);
      if (!player || !player.isAi) break;

      // Thinking time
      await sleep(state.phase === "bidding" ? 700 : 900);
      if (!room.gameState) break;
      const stillExpected = currentExpectedPlayerId(room.gameState);
      if (stillExpected !== expectedId) continue;
      const refreshedPlayer = room.players.get(expectedId);
      if (!refreshedPlayer || !refreshedPlayer.isAi) break;

      if (room.gameState.phase === "bidding") {
        const isDealer =
          room.gameState.players[room.gameState.dealerIndex].id === expectedId;
        const forbidden = isDealer ? getForbiddenDealerBid(room.gameState) : null;
        const bid = botBid(
          room.gameState.hands[expectedId] || [],
          room.gameState.trump,
          room.gameState.cardsPerPlayer,
          forbidden
        );
        room.gameState = placeBid(room.gameState, expectedId, bid);
        broadcastGame(room);
        continue;
      }
      if (room.gameState.phase === "playing") {
        const card = botPlay({
          hand: room.gameState.hands[expectedId] || [],
          leadSuit: room.gameState.leadSuit,
          trump: room.gameState.trump,
          trick: room.gameState.currentTrick,
          bid: room.gameState.bids[expectedId] ?? 0,
          tricksWon: room.gameState.tricksWon[expectedId] ?? 0,
          cardsLeft: room.gameState.hands[expectedId]?.length ?? 0,
        });
        room.gameState = playCard(room.gameState, expectedId, card);
        broadcastGame(room);
        if (room.gameState.phase === "trick_resolution") {
          await sleep(1500);
          if (!room.gameState) break;
          room.gameState = resolveTrick(room.gameState);
          broadcastGame(room);
        }
        continue;
      }
      break;
    }
  } finally {
    botLoopActive.delete(room.code);
  }
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

    // If they were AI-controlled (reclaimed slot mid-game), restore human control
    if (result.room.phase === "playing" && result.player.isAi) {
      registry.setAiControlled(result.room, result.player.id, false);
      if (result.room.gameState) broadcastGame(result.room);
    }
    registry.emitRoom(io, result.room);
  });

  socket.on("room:leave", () => {
    if (!roomCode || !playerId) return;
    const room = registry.getRoom(roomCode);
    if (!room) return;

    if (room.phase === "playing" && room.gameState) {
      // Don't disrupt the game — AI takes over this seat
      registry.setAiControlled(room, playerId, true);
      registry.setConnected(roomCode, playerId, false);
      socket.leave(`room:${roomCode}`);
      sessionByPlayer.delete(playerId);
      socket.emit("room:left");
      registry.emitRoom(io, room);
      broadcastGame(room);
      void advanceBotMoves(room);
    } else {
      const after = registry.leaveRoom(roomCode, playerId);
      socket.leave(`room:${roomCode}`);
      sessionByPlayer.delete(playerId);
      socket.emit("room:left");
      if (after) registry.emitRoom(io, after);
    }
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
    void advanceBotMoves(room);
  });

  socket.on("game:play", ({ card }) => {
    if (!roomCode || !playerId) return;
    const room = registry.getRoom(roomCode);
    if (!room || !room.gameState) return;
    if (currentExpectedPlayerId(room.gameState) !== playerId) return;
    room.gameState = playCard(room.gameState, playerId, card);
    broadcastGame(room);
    void advanceBotMoves(room);
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
    void advanceBotMoves(room);
  });

  socket.on("game:return-to-lobby", () => {
    if (!roomCode || !playerId) return;
    const room = registry.getRoom(roomCode);
    if (!room) return;
    if (room.hostId !== playerId) return;
    room.gameState = null;
    room.phase = "lobby";
    [...room.players.values()].forEach((p) => {
      p.ready = false;
      p.isAi = false;
    });
    registry.emitRoom(io, room);
  });

  socket.on("disconnect", () => {
    if (!roomCode || !playerId) return;
    const room = registry.getRoom(roomCode);
    if (!room) return;
    const player = room.players.get(playerId);
    if (!player) return;

    // CRITICAL: if a newer socket has already reclaimed this player's slot
    // (via the client's auto-rejoin), the player record now points to that
    // newer socket — NOT this one. Don't touch them; the previous
    // disconnect was already handled when the new socket reclaimed.
    if (player.socketId !== socket.id) return;

    registry.setConnected(roomCode, playerId, false);

    if (room.phase === "playing" && room.gameState) {
      // Player vanished mid-game → AI takes over their seat
      registry.setAiControlled(room, playerId, true);
      registry.emitRoom(io, room);
      broadcastGame(room);
      void advanceBotMoves(room);
    } else {
      // Lobby/finished: keep slot for 30s grace then remove.
      // Re-check that no newer socket has taken over the slot before
      // actually evicting them.
      registry.emitRoom(io, room);
      const disconnectingSocketId = socket.id;
      setTimeout(() => {
        const r = roomCode ? registry.getRoom(roomCode) : null;
        if (!r || !playerId) return;
        const p = r.players.get(playerId);
        if (!p) return;
        // Still disconnected AND still bound to us → safe to evict
        if (!p.connected && p.socketId === disconnectingSocketId) {
          const after = registry.leaveRoom(r.code, playerId);
          if (after) registry.emitRoom(io, after);
        }
      }, 30_000);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] Kachu Ful server listening on :${PORT}`);
});
