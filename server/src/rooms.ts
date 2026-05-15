import type {
  RoomPublic,
  RoomPlayer,
  ServerToClientEvents,
  ClientToServerEvents,
} from "../../src/lib/protocol";
import { ROOM_CODE_LENGTH, MAX_PLAYERS, MIN_PLAYERS } from "../../src/lib/protocol";
import { DEFAULT_SETTINGS } from "../../src/game/engine";
import type { GameSettings, GameState, Player } from "../../src/game/types";
import type { Server, Socket } from "socket.io";

const AVATARS = ["🦊", "🐼", "🦁", "🐯", "🐺", "🦉"];
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let s = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return s;
}

export interface ServerRoom {
  code: string;
  hostId: string;
  players: Map<string, RoomPlayer & { socketId: string }>;
  settings: GameSettings;
  phase: "lobby" | "playing" | "finished";
  gameState: GameState | null;
  createdAt: number;
}

export class RoomRegistry {
  private rooms = new Map<string, ServerRoom>();

  createRoom(hostName: string, hostSocketId: string): { room: ServerRoom; player: RoomPlayer } {
    let code = generateCode();
    while (this.rooms.has(code)) code = generateCode();
    const playerId = `p_${Math.random().toString(36).slice(2, 10)}`;
    const player: RoomPlayer & { socketId: string } = {
      id: playerId,
      name: hostName.slice(0, 18) || "Player",
      avatar: AVATARS[0],
      ready: false,
      connected: true,
      isHost: true,
      seat: 0,
      socketId: hostSocketId,
    };
    const room: ServerRoom = {
      code,
      hostId: playerId,
      players: new Map([[playerId, player]]),
      settings: { ...DEFAULT_SETTINGS },
      phase: "lobby",
      gameState: null,
      createdAt: Date.now(),
    };
    this.rooms.set(code, room);
    return { room, player };
  }

  joinRoom(
    code: string,
    name: string,
    socketId: string
  ): { ok: false; error: string } | { ok: true; room: ServerRoom; player: RoomPlayer } {
    if (!code || typeof code !== "string") return { ok: false, error: "Invalid code" };
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return { ok: false, error: "Room not found" };
    const trimmed = (name || "Player").slice(0, 18);

    // If someone with this name is already in the room, decide:
    // - they are connected   → name is taken, reject
    // - they are disconnected → treat this join as a reconnect, reclaim the slot
    const existing = [...room.players.values()].find(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      // Same socket trying to rejoin the same room → idempotent
      if (existing.connected && existing.socketId === socketId) {
        return { ok: true, room, player: existing };
      }
      if (existing.connected) {
        return { ok: false, error: "That name is already taken in this room" };
      }
      // Disconnected — reclaim the slot (preserves host status, seat, etc.)
      existing.connected = true;
      existing.socketId = socketId;
      return { ok: true, room, player: existing };
    }

    if (room.phase !== "lobby") return { ok: false, error: "Game already in progress" };
    if (room.players.size >= MAX_PLAYERS) {
      return { ok: false, error: `Room full (${MAX_PLAYERS} players max — deck size limit)` };
    }

    const seat = [...room.players.values()].length;
    const playerId = `p_${Math.random().toString(36).slice(2, 10)}`;
    const player: RoomPlayer & { socketId: string } = {
      id: playerId,
      name: trimmed,
      avatar: AVATARS[seat % AVATARS.length],
      ready: false,
      connected: true,
      isHost: false,
      seat,
      socketId,
    };
    room.players.set(playerId, player);
    return { ok: true, room, player };
  }

  kickPlayer(
    roomCode: string,
    hostId: string,
    targetId: string
  ): { ok: false; error: string } | { ok: true; room: ServerRoom | null; targetSocketId: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { ok: false, error: "Room not found" };
    if (room.hostId !== hostId) return { ok: false, error: "Only the host can kick" };
    if (room.phase !== "lobby") return { ok: false, error: "Can't kick once the game starts" };
    if (targetId === hostId) return { ok: false, error: "Host cannot kick themselves" };
    const target = room.players.get(targetId);
    if (!target) return { ok: false, error: "Player not in room" };
    const socketId = target.socketId;
    room.players.delete(targetId);
    if (room.players.size === 0) this.rooms.delete(roomCode);
    return { ok: true, room: room.players.size === 0 ? null : room, targetSocketId: socketId };
  }

  leaveRoom(roomCode: string, playerId: string): ServerRoom | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    room.players.delete(playerId);
    if (room.players.size === 0) {
      this.rooms.delete(roomCode);
      return null;
    }
    if (room.hostId === playerId) {
      const next = [...room.players.values()][0];
      room.hostId = next.id;
      next.isHost = true;
    }
    return room;
  }

  setReady(roomCode: string, playerId: string, ready: boolean): ServerRoom | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    const p = room.players.get(playerId);
    if (!p) return null;
    p.ready = ready;
    return room;
  }

  updateSettings(
    roomCode: string,
    playerId: string,
    settings: Partial<GameSettings>
  ): ServerRoom | null {
    const room = this.rooms.get(roomCode);
    if (!room || room.hostId !== playerId || room.phase !== "lobby") return null;
    room.settings = { ...room.settings, ...settings };
    return room;
  }

  setConnected(roomCode: string, playerId: string, connected: boolean): ServerRoom | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    const p = room.players.get(playerId);
    if (!p) return null;
    p.connected = connected;
    return room;
  }

  getRoom(code: string): ServerRoom | undefined {
    return this.rooms.get(code);
  }

  toPublic(room: ServerRoom): RoomPublic {
    return {
      code: room.code,
      hostId: room.hostId,
      players: [...room.players.values()].map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        ready: p.ready,
        connected: p.connected,
        isHost: p.isHost,
        seat: p.seat,
      })),
      settings: room.settings,
      phase: room.phase,
      maxPlayers: MAX_PLAYERS,
      minPlayers: MIN_PLAYERS,
      createdAt: room.createdAt,
    };
  }

  toGamePlayers(room: ServerRoom): Player[] {
    return [...room.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isBot: false,
      seat: p.seat,
    }));
  }

  emitRoom(io: Server<ClientToServerEvents, ServerToClientEvents>, room: ServerRoom) {
    io.to(`room:${room.code}`).emit("room:state", this.toPublic(room));
  }
}

export type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
export type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
