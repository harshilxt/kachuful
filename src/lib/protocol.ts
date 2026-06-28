import type { GameState, GameSettings, Card } from "../games/kachuful/engine/types";
import type { BjGameState } from "../games/blackjack/engine/types";
import type { MendikotView } from "../games/mendikot/engine/types";

export type GameType = "kachuful" | "blackjack" | "uno" | "mendikot";

/** Either game's state — the active game is determined by RoomPublic.gameType. */
export type AnyGameState = GameState | BjGameState | MendikotView;

export interface RoomPlayer {
  id: string;
  name: string;
  avatar: string;
  ready: boolean;
  connected: boolean;
  isHost: boolean;
  seat: number;
  /**
   * True when this seat is currently being played by a server-side AI bot.
   * Happens when a human player disconnects or explicitly leaves during an
   * in-progress game. Cleared when they reconnect.
   */
  isAi: boolean;
}

export interface RoomPublic {
  code: string;
  hostId: string;
  gameType: GameType;
  players: RoomPlayer[];
  settings: Record<string, unknown>;
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
  "game:state": (state: AnyGameState) => void;
  "game:ended": () => void;
}

export interface ClientToServerEvents {
  "room:create": (
    data: {
      name: string;
      gameType?: GameType;
      settings?: Partial<GameSettings>;
      bots?: number;
      autostart?: boolean;
    },
    ack: (response: {
      ok: boolean;
      code?: string;
      playerId?: string;
      gameType?: GameType;
      error?: string;
    }) => void
  ) => void;
  "room:join": (
    data: { code: string; name: string },
    ack: (response: { ok: boolean; playerId?: string; error?: string }) => void
  ) => void;
  "room:leave": () => void;
  "room:ready": (data: { ready: boolean }) => void;
  "room:start": () => void;
  "room:settings": (data: { settings: Record<string, unknown> }) => void;
  "room:kick": (data: { playerId: string }) => void;
  "game:bid": (data: { bid: number }) => void;
  "game:play": (data: { card: Card }) => void;
  // Generic action channel used by Blackjack (bet/hit/stand/double/split).
  "game:action": (data: Record<string, unknown>) => void;
  "game:next": () => void;
  "game:return-to-lobby": () => void;
}

export const ROOM_CODE_LENGTH = 6;
// Practical maximum: floor(52/2) = 26 players (2 cards minimum per round).
// Beyond that the deck can't deal one card to each player.
export const MAX_PLAYERS = 26;
export const MIN_PLAYERS = 2;
