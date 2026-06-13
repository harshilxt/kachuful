import { create } from "zustand";
import { Card } from "../games/kachuful/engine/types";
import type { AnyGameState, GameType, RoomPublic } from "../lib/protocol";
import { AppSocket, getSocket, disconnectSocket } from "../lib/socket";
import { mpNavigate } from "../lib/mpNavigator";

interface MpStore {
  socket: AppSocket | null;
  connected: boolean;

  name: string;
  roomCode: string | null;
  playerId: string | null;
  room: RoomPublic | null;
  gameState: AnyGameState | null;
  errorMessage: string | null;
  pending: boolean;
  // Which game the user picked on Home before entering the online flow.
  pendingGameType: GameType;

  setName: (n: string) => void;
  setPendingGameType: (g: GameType) => void;
  clearError: () => void;

  ensureConnected: () => AppSocket;
  createRoom: (name: string, gameType?: GameType) => Promise<string>;
  joinRoom: (code: string, name: string) => Promise<string>;
  leaveRoom: () => void;
  kickPlayer: (playerId: string) => void;
  toggleReady: (ready: boolean) => void;
  startGame: () => void;
  updateSettings: (settings: Record<string, unknown>) => void;
  sendBid: (bid: number) => void;
  sendPlay: (card: Card) => void;
  // Generic action for Blackjack and future games.
  sendAction: (action: Record<string, unknown>) => void;
  acknowledgeRound: () => void;
  returnToLobby: () => void;
  reset: () => void;
}

export const useMpStore = create<MpStore>((set, get) => ({
  socket: null,
  connected: false,
  name: "",
  roomCode: null,
  playerId: null,
  room: null,
  gameState: null,
  errorMessage: null,
  pending: false,
  pendingGameType: "kachuful",

  setName: (n) => set({ name: n.slice(0, 18) }),
  setPendingGameType: (g) => set({ pendingGameType: g }),
  clearError: () => set({ errorMessage: null }),

  ensureConnected: () => {
    let s = get().socket;
    if (s) return s;
    s = getSocket();
    s.on("connect", () => set({ connected: true }));
    s.on("disconnect", () => set({ connected: false }));
    s.on("room:state", (room) => {
      set({ room });
    });
    s.on("room:left", () => {
      set({
        room: null,
        roomCode: null,
        playerId: null,
        gameState: null,
      });
      mpNavigate("/online");
    });
    s.on("room:error", ({ message }) => {
      set({ errorMessage: message });
    });
    s.on("game:state", (state) => {
      set({ gameState: state });
    });
    set({ socket: s });
    return s;
  },

  createRoom: async (name, gameType = "kachuful") => {
    const sock = get().ensureConnected();
    set({ pending: true, errorMessage: null, name: name.slice(0, 18) });
    return new Promise<string>((resolve, reject) => {
      sock.emit("room:create", { name, gameType }, (resp) => {
        set({ pending: false });
        if (!resp.ok) {
          set({ errorMessage: resp.error || "Failed to create room" });
          reject(new Error(resp.error));
          return;
        }
        set({ roomCode: resp.code!, playerId: resp.playerId! });
        resolve(resp.code!);
      });
    });
  },

  joinRoom: async (code, name) => {
    const sock = get().ensureConnected();
    const upper = code.toUpperCase().trim();
    set({ pending: true, errorMessage: null, name: name.slice(0, 18) });
    return new Promise<string>((resolve, reject) => {
      sock.emit("room:join", { code: upper, name }, (resp) => {
        set({ pending: false });
        if (!resp.ok) {
          set({ errorMessage: resp.error || "Failed to join room" });
          reject(new Error(resp.error));
          return;
        }
        set({ roomCode: upper, playerId: resp.playerId! });
        resolve(upper);
      });
    });
  },

  leaveRoom: () => {
    const s = get().socket;
    s?.emit("room:leave");
  },

  kickPlayer: (targetId) => {
    const s = get().socket;
    s?.emit("room:kick", { playerId: targetId });
  },

  toggleReady: (ready) => {
    const s = get().socket;
    s?.emit("room:ready", { ready });
  },

  startGame: () => {
    const s = get().socket;
    s?.emit("room:start");
  },

  updateSettings: (settings) => {
    const s = get().socket;
    s?.emit("room:settings", { settings });
  },

  sendBid: (bid) => {
    const s = get().socket;
    s?.emit("game:bid", { bid });
  },

  sendPlay: (card) => {
    const s = get().socket;
    s?.emit("game:play", { card });
  },

  sendAction: (action) => {
    const s = get().socket;
    s?.emit("game:action", action);
  },

  acknowledgeRound: () => {
    const s = get().socket;
    s?.emit("game:next");
  },

  returnToLobby: () => {
    const s = get().socket;
    s?.emit("game:return-to-lobby");
  },

  reset: () => {
    disconnectSocket();
    set({
      socket: null,
      connected: false,
      room: null,
      roomCode: null,
      playerId: null,
      gameState: null,
      errorMessage: null,
    });
  },
}));
