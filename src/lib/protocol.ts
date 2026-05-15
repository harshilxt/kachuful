import type { GameState, GameSettings, Card } from "../game/types";

export interface RoomPlayer {
  id: string;
  name: string;
  avatar: string;
  ready: boolean;
  connected: boolean;
  isHost: boolean;
  seat: number;
}

export interface RoomPublic {
  code: string;
  hostId: string;
  players: RoomPlayer[];
  settings: GameSettings;
  phase: "lobby" | "playing" | "finished";
  maxPlayers: number;
  minPlayers: number;
  createdAt: number;
}

export interface ServerToClientEvents {
  "room:state": (room: RoomPublic) => void;
  "room:joined": (data: { code: string; playerId: string }) => void;
  "room:left": () => void;
  "room:error": (data: { message: string }) => void;
  "game:state": (state: GameState) => void;
  "game:ended": () => void;
}

export interface ClientToServerEvents {
  "room:create": (
    data: { name: string; settings?: Partial<GameSettings> },
    ack: (response: { ok: boolean; code?: string; playerId?: string; error?: string }) => void
  ) => void;
  "room:join": (
    data: { code: string; name: string },
    ack: (response: { ok: boolean; playerId?: string; error?: string }) => void
  ) => void;
  "room:leave": () => void;
  "room:ready": (data: { ready: boolean }) => void;
  "room:start": () => void;
  "room:settings": (data: { settings: Partial<GameSettings> }) => void;
  "room:kick": (data: { playerId: string }) => void;
  "game:bid": (data: { bid: number }) => void;
  "game:play": (data: { card: Card }) => void;
  "game:next": () => void;
  "game:return-to-lobby": () => void;
}

export const ROOM_CODE_LENGTH = 6;
// Practical maximum: floor(52/2) = 26 players (2 cards minimum per round).
// Beyond that the deck can't deal one card to each player.
export const MAX_PLAYERS = 26;
export const MIN_PLAYERS = 2;
