export type Suit = "S" | "H" | "D" | "C";
export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A";

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  avatar: string;
  seat: number;
}

export type GamePhase =
  | "idle"
  | "dealing"
  | "bidding"
  | "playing"
  | "trick_resolution"
  | "round_summary"
  | "game_over";

export interface BidEntry {
  playerId: string;
  bid: number;
}

export interface PlayedCard {
  playerId: string;
  card: Card;
}

export interface RoundResult {
  round: number;
  cardsPerPlayer: number;
  trump: Suit | null;
  perPlayer: Record<
    string,
    { bid: number; tricks: number; points: number; total: number }
  >;
}

export interface GameSettings {
  maxCards: number;
  scoringMode: "ten-plus-bid" | "one-per-trick-plus-bonus";
  enforceDealerConstraint: boolean;
  noTrumpRound: boolean;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  hands: Record<string, Card[]>;
  round: number;
  totalRounds: number;
  cardsPerPlayer: number;
  trump: Suit | null;
  dealerIndex: number;
  currentTurnIndex: number;
  bids: Record<string, number | null>;
  tricksWon: Record<string, number>;
  totals: Record<string, number>;
  history: RoundResult[];
  currentTrick: PlayedCard[];
  leadSuit: Suit | null;
  trickWinnerId: string | null;
  settings: GameSettings;
  message: string;
  bidOrder: string[];
  playOrder: string[];
}

export const SUITS: Suit[] = ["S", "H", "D", "C"];
export const RANKS: Rank[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];

export const SUIT_LABEL: Record<Suit, string> = {
  S: "Spades",
  H: "Hearts",
  D: "Diamonds",
  C: "Clubs",
};

export const SUIT_GLYPH: Record<Suit, string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
};

export const SUIT_COLOR: Record<Suit, "red" | "black"> = {
  S: "black",
  C: "black",
  H: "red",
  D: "red",
};
