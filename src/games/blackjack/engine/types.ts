// Render-only mirror of the server's Blackjack wire shapes
// (backend/app/games/blackjack/types.py, as filtered by Engine.public_view).
// The browser never computes blackjack logic — it just renders this.

export type Suit = "S" | "H" | "D" | "C";
export type Rank =
  | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10"
  | "J" | "Q" | "K" | "A";

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}

export type BjPhase =
  | "betting"
  | "dealing"
  | "player_turns"
  | "dealer_turn"
  | "settlement"
  | "round_over"
  | "game_over";

export type HandStatus =
  | "active"
  | "stand"
  | "bust"
  | "blackjack"
  | "doubled";

export type HandOutcome =
  | "win"
  | "lose"
  | "push"
  | "blackjack"
  | "bust"
  | "pending";

export interface Hand {
  cards: Card[];
  bet: number;
  status: HandStatus;
  outcome: HandOutcome;
  value: number;
  soft: boolean;
  payout: number;
}

export interface BjPlayer {
  id: string;
  name: string;
  isBot: boolean;
  avatar: string;
  seat: number;
  chips: number;
  hands: Hand[];
  pendingBet: number | null;
  hasBet: boolean;
  netLastRound: number;
  bust_out: boolean;
}

export interface Dealer {
  cards: Card[];
  holeHidden: boolean;
  // Number of face-down cards (server hides the hole card during play).
  hiddenCount: number;
  value: number;
  soft: boolean;
  status: "waiting" | "playing" | "stand" | "bust" | "blackjack";
}

export interface BjSettings {
  numDecks: number;
  minBet: number;
  maxBet: number;
  startingChips: number;
  dealerHitsSoft17: boolean;
  blackjackPayoutNum: number;
  blackjackPayoutDen: number;
}

export interface BjGameState {
  gameType: "blackjack";
  phase: BjPhase;
  players: BjPlayer[];
  dealer: Dealer;
  shoe: Card[]; // always [] in public view
  activePlayerIndex: number;
  activeHandIndex: number;
  round: number;
  settings: BjSettings;
  message: string;
  hostId: string;
}

export const CHIP_DENOMS = [10, 25, 100, 500];
