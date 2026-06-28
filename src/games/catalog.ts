import type { GameType } from "../lib/protocol";

export interface GameInfo {
  id: GameType | string;
  name: string;
  tagline: string;
  emoji: string;
  players: string;
  /** Tailwind gradient classes for the tile background. */
  accent: string;
  /** Glow/ring color for hover. */
  ring: string;
  available: boolean;
  route?: string;
}

export const GAMES: GameInfo[] = [
  {
    id: "kachuful",
    name: "Kachu Ful",
    tagline: "Judgement · trick-taking. Bid exactly right.",
    emoji: "🃏",
    players: "2–7 players",
    accent: "from-emerald-600/40 to-felt-700/60",
    ring: "group-hover:shadow-[0_0_0_2px_rgba(52,211,153,0.5),0_0_28px_rgba(52,211,153,0.35)]",
    available: true,
    route: "/game/kachuful",
  },
  {
    id: "blackjack",
    name: "Blackjack",
    tagline: "Beat the dealer. Closest to 21 wins.",
    emoji: "♠️",
    players: "1–7 players",
    accent: "from-rose-700/40 to-ink-900/70",
    ring: "group-hover:shadow-[0_0_0_2px_rgba(244,114,182,0.5),0_0_28px_rgba(244,114,182,0.3)]",
    available: true,
    route: "/game/blackjack",
  },
  {
    id: "uno",
    name: "UNO",
    tagline: "Match colour or number. Last card? Shout UNO!",
    emoji: "🎴",
    players: "2–10 players",
    accent: "from-amber-600/40 to-ink-900/70",
    ring: "group-hover:shadow-[0_0_0_2px_rgba(251,191,36,0.5),0_0_28px_rgba(251,191,36,0.35)]",
    available: true,
    route: "/game/uno",
  },
  {
    id: "mendikot",
    name: "Mendikot",
    tagline: "Dehla Pakad · catch the four 10s with your partner.",
    emoji: "🔟",
    players: "4 players (you + 3 AI)",
    accent: "from-emerald-700/40 to-ink-900/70",
    ring: "group-hover:shadow-[0_0_0_2px_rgba(52,211,153,0.5),0_0_28px_rgba(52,211,153,0.32)]",
    available: true,
    route: "/game/mendikot",
  },
  {
    id: "solitaire",
    name: "Solitaire",
    tagline: "Klondike patience. Sort all cards Ace to King.",
    emoji: "🂡",
    players: "1 player",
    accent: "from-sky-700/40 to-felt-800/70",
    ring: "group-hover:shadow-[0_0_0_2px_rgba(125,211,252,0.5),0_0_28px_rgba(125,211,252,0.3)]",
    available: true,
    route: "/game/solitaire",
  },
  {
    id: "teenpatti",
    name: "Teen Patti",
    tagline: "3-card Indian poker. Blind or seen.",
    emoji: "🂡",
    players: "3–6 players",
    accent: "from-amber-700/30 to-ink-900/70",
    ring: "",
    available: false,
  },
  {
    id: "rummy",
    name: "Rummy",
    tagline: "Form sequences & sets. Be first to meld.",
    emoji: "🂮",
    players: "2–6 players",
    accent: "from-sky-700/30 to-ink-900/70",
    ring: "",
    available: false,
  },
];
