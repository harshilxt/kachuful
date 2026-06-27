import { create } from "zustand";
import {
  applyMove,
  autoFinishStep,
  autoToFoundation,
  createGame,
  draw,
} from "./engine/engine";
import type {
  DrawMode,
  MoveSource,
  MoveTarget,
  SolitaireState,
} from "./engine/types";

const HISTORY_LIMIT = 200;

function snapshot(s: SolitaireState): SolitaireState {
  return {
    ...s,
    stock: [...s.stock],
    waste: [...s.waste],
    foundations: {
      S: [...s.foundations.S],
      H: [...s.foundations.H],
      D: [...s.foundations.D],
      C: [...s.foundations.C],
    },
    tableau: s.tableau.map((c) => ({ down: [...c.down], up: [...c.up] })),
  };
}

interface SolitaireStore {
  state: SolitaireState | null;
  /** Past states for undo. */
  history: SolitaireState[];
  /** The original deal, for "Restart". */
  initial: SolitaireState | null;
  drawMode: DrawMode;
  autoFinishing: boolean;

  setDrawMode: (m: DrawMode) => void;
  newGame: (mode?: DrawMode) => void;
  restart: () => void;
  drawCard: () => void;
  move: (source: MoveSource, target: MoveTarget) => boolean;
  sendToFoundation: (source: MoveSource) => boolean;
  undo: () => void;
  autoFinish: () => Promise<void>;
}

export const useSolitaireStore = create<SolitaireStore>((set, get) => ({
  state: null,
  history: [],
  initial: null,
  drawMode: 1,
  autoFinishing: false,

  setDrawMode: (m) => set({ drawMode: m }),

  newGame: (mode) => {
    const drawMode = mode ?? get().drawMode;
    const state = createGame(drawMode);
    set({
      state,
      initial: snapshot(state),
      history: [],
      drawMode,
      autoFinishing: false,
    });
  },

  restart: () => {
    const { initial } = get();
    if (!initial) return;
    set({ state: snapshot(initial), history: [], autoFinishing: false });
  },

  drawCard: () => {
    const { state, history } = get();
    if (!state || state.won) return;
    const next = draw(state);
    if (!next) return;
    set({ state: next, history: [...history, state].slice(-HISTORY_LIMIT) });
  },

  move: (source, target) => {
    const { state, history } = get();
    if (!state || state.won) return false;
    const next = applyMove(state, source, target);
    if (!next) return false;
    set({ state: next, history: [...history, state].slice(-HISTORY_LIMIT) });
    return true;
  },

  sendToFoundation: (source) => {
    const { state, history } = get();
    if (!state || state.won) return false;
    const next = autoToFoundation(state, source);
    if (!next) return false;
    set({ state: next, history: [...history, state].slice(-HISTORY_LIMIT) });
    return true;
  },

  undo: () => {
    const { history } = get();
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    set({ state: prev, history: history.slice(0, -1) });
  },

  autoFinish: async () => {
    if (get().autoFinishing) return;
    const start = get().state;
    if (!start) return;
    // Keep one undo point from before the auto-finish.
    set((s) => ({
      autoFinishing: true,
      history: [...s.history, start].slice(-HISTORY_LIMIT),
    }));

    let guard = 0;
    while (guard++ < 400) {
      const cur = get().state;
      if (!cur || cur.won) break;
      const next = autoFinishStep(cur);
      if (!next) break;
      set({ state: next });
      // small delay so the moves animate
      await new Promise((r) => setTimeout(r, 90));
      if (!get().autoFinishing) break; // cancelled (e.g. new game)
    }
    set({ autoFinishing: false });
  },
}));

if (typeof window !== "undefined" && import.meta.env.DEV) {
  (window as unknown as { __solitaire: typeof useSolitaireStore }).__solitaire =
    useSolitaireStore;
}
