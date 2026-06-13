import { create } from "zustand";
import { GameSettings, GameState, Player } from "../games/kachuful/engine/types";
import {
  DEFAULT_SETTINGS,
  createInitialState,
  currentExpectedPlayerId,
  getForbiddenDealerBid,
  nextRoundOrEnd,
  placeBid,
  playCard,
  resolveTrick,
  startRound,
} from "../games/kachuful/engine/engine";
import { botBid, botPlay } from "../games/kachuful/engine/ai";
import { sleep, uid } from "../lib/utils";

const BOT_AVATARS = ["🦊", "🐼", "🦁", "🐯", "🐺", "🦉", "🦅"];
const BOT_NAMES = ["Priya", "Rohan", "Sara", "Arjun", "Meera", "Vikram"];

interface UiSlice {
  playerName: string;
  numBots: number;
  setPlayerName: (n: string) => void;
  setNumBots: (n: number) => void;
}

interface GameSlice {
  state: GameState | null;
  humanId: string | null;
  isProcessing: boolean;

  newGame: (humanName: string, numBots: number, settings?: GameSettings) => void;
  beginRound: () => void;
  submitBid: (bid: number) => void;
  submitPlay: (cardId: string) => void;
  acknowledgeRoundSummary: () => void;
  resetGame: () => void;

  driveBots: () => Promise<void>;
}

export type Store = UiSlice & GameSlice;

export const useGameStore = create<Store>((set, get) => ({
  playerName: "You",
  numBots: 3,

  setPlayerName: (n) => set({ playerName: n || "You" }),
  setNumBots: (n) => set({ numBots: Math.max(2, Math.min(5, n)) }),

  state: null,
  humanId: null,
  isProcessing: false,

  newGame: (humanName, numBots, settings = DEFAULT_SETTINGS) => {
    const humanId = uid("p");
    const players: Player[] = [
      { id: humanId, name: humanName || "You", isBot: false, avatar: "🧑‍🎓", seat: 0 },
    ];
    const usedNames = new Set<string>();
    for (let i = 0; i < numBots; i++) {
      let name = BOT_NAMES[i % BOT_NAMES.length];
      while (usedNames.has(name)) name = `${name}${Math.floor(Math.random() * 99)}`;
      usedNames.add(name);
      players.push({
        id: uid("b"),
        name,
        isBot: true,
        avatar: BOT_AVATARS[i % BOT_AVATARS.length],
        seat: i + 1,
      });
    }
    const initial = createInitialState(players, settings);
    set({ state: initial, humanId });
  },

  beginRound: () => {
    const s = get().state;
    if (!s) return;
    if (s.phase !== "idle") return;
    const next = startRound(s);
    set({ state: next });
    get().driveBots();
  },

  submitBid: (bid) => {
    const s = get().state;
    const humanId = get().humanId;
    if (!s || !humanId) return;
    const expected = currentExpectedPlayerId(s);
    if (expected !== humanId) return;
    const next = placeBid(s, humanId, bid);
    set({ state: next });
    get().driveBots();
  },

  submitPlay: (cardId) => {
    const s = get().state;
    const humanId = get().humanId;
    if (!s || !humanId) return;
    if (s.phase !== "playing") return;
    const expected = currentExpectedPlayerId(s);
    if (expected !== humanId) return;
    const card = (s.hands[humanId] || []).find((c) => c.id === cardId);
    if (!card) return;
    const next = playCard(s, humanId, card);
    set({ state: next });
    if (next.phase === "trick_resolution") {
      void (async () => {
        await sleep(1400);
        const after = resolveTrick(get().state!);
        set({ state: after });
        if (after.phase === "playing") get().driveBots();
      })();
    } else {
      get().driveBots();
    }
  },

  acknowledgeRoundSummary: () => {
    const s = get().state;
    if (!s) return;
    const next = nextRoundOrEnd(s);
    set({ state: next });
    if (next.phase !== "game_over") {
      get().driveBots();
    }
  },

  resetGame: () => set({ state: null, humanId: null }),

  driveBots: async () => {
    if (get().isProcessing) return;
    set({ isProcessing: true });
    try {
      while (true) {
        const s = get().state;
        if (!s) break;
        if (s.phase === "bidding") {
          const expectedId = currentExpectedPlayerId(s);
          if (!expectedId) break;
          const player = s.players.find((p) => p.id === expectedId);
          if (!player || !player.isBot) break;
          await sleep(700);
          const isDealer = s.players[s.dealerIndex].id === expectedId;
          const forbidden = isDealer ? getForbiddenDealerBid(s) : null;
          const bid = botBid(
            s.hands[expectedId] || [],
            s.trump,
            s.cardsPerPlayer,
            forbidden
          );
          const next = placeBid(s, expectedId, bid);
          set({ state: next });
          continue;
        }
        if (s.phase === "playing") {
          const expectedId = currentExpectedPlayerId(s);
          if (!expectedId) break;
          const player = s.players.find((p) => p.id === expectedId);
          if (!player || !player.isBot) break;
          await sleep(900);
          const card = botPlay({
            hand: s.hands[expectedId] || [],
            leadSuit: s.leadSuit,
            trump: s.trump,
            trick: s.currentTrick,
            bid: s.bids[expectedId] ?? 0,
            tricksWon: s.tricksWon[expectedId] ?? 0,
            cardsLeft: s.hands[expectedId]?.length ?? 0,
          });
          const next = playCard(s, expectedId, card);
          set({ state: next });
          if (next.phase === "trick_resolution") {
            await sleep(1400);
            const after = resolveTrick(get().state!);
            set({ state: after });
          }
          continue;
        }
        break;
      }
    } finally {
      set({ isProcessing: false });
    }
  },
}));
