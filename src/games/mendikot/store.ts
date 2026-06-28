import { create } from "zustand";
import { sleep } from "../../lib/utils";
import {
  advanceAfterTrick,
  chooseTrump,
  createGame,
  playCard,
} from "./engine/engine";
import { botPlay } from "./engine/ai";
import { HUMAN_SEAT, type MendikotState, type Suit } from "./engine/types";

const BOT_DELAY = 650;
const TRICK_PAUSE = 1350;

interface MendikotStore {
  state: MendikotState | null;
  playerName: string;
  processing: boolean;

  setPlayerName: (n: string) => void;
  newGame: (name?: string) => void;
  chooseTrumpSuit: (suit: Suit) => void;
  playHumanCard: (cardId: string) => void;
  drive: () => Promise<void>;
}

export const useMendikotStore = create<MendikotStore>((set, get) => ({
  state: null,
  playerName: "You",
  processing: false,

  setPlayerName: (n) => set({ playerName: n }),

  newGame: (name) => {
    const youName = name ?? get().playerName;
    set({ state: createGame(youName), processing: false });
  },

  chooseTrumpSuit: (suit) => {
    const st = get().state;
    if (!st || st.phase !== "choose_trump") return;
    set({ state: chooseTrump(st, suit) });
    void get().drive();
  },

  playHumanCard: (cardId) => {
    const st = get().state;
    if (!st || st.phase !== "playing" || st.turnSeat !== HUMAN_SEAT) return;
    const ns = playCard(st, cardId);
    if (!ns) return;
    set({ state: ns });
    void get().drive();
  },

  drive: async () => {
    if (get().processing) return;
    set({ processing: true });
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const st = get().state;
        if (!st) break;

        if (st.phase === "trick_done") {
          await sleep(TRICK_PAUSE);
          const cur = get().state;
          if (!cur || cur.phase !== "trick_done") continue;
          set({ state: advanceAfterTrick(cur) });
          continue;
        }

        if (st.phase === "playing") {
          if (st.turnSeat === HUMAN_SEAT) break; // wait for the human
          await sleep(BOT_DELAY);
          const cur = get().state;
          if (!cur || cur.phase !== "playing" || cur.turnSeat === HUMAN_SEAT)
            continue;
          const card = botPlay(cur);
          const ns = playCard(cur, card.id);
          if (ns) set({ state: ns });
          continue;
        }

        break; // choose_trump or hand_over
      }
    } finally {
      set({ processing: false });
    }
  },
}));

if (typeof window !== "undefined" && import.meta.env.DEV) {
  (window as unknown as { __mendikot: typeof useMendikotStore }).__mendikot =
    useMendikotStore;
}
