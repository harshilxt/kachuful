// Mirrors backend/app/games/uno/types.py (the shapes that arrive over the wire
// after private_view: your own hand is populated, opponents' `hand` is []).

export type UnoColor = "red" | "yellow" | "green" | "blue" | "wild";
export type UnoKind =
  | "number"
  | "skip"
  | "reverse"
  | "draw2"
  | "wild"
  | "wild4";

export type UnoPhase =
  | "dealing"
  | "playing"
  | "choosing_color"
  | "round_over"
  | "game_over";

export interface UnoCard {
  id: string;
  color: UnoColor;
  kind: UnoKind;
  value: number | null;
}

export interface UnoPlayer {
  id: string;
  name: string;
  isBot: boolean;
  avatar: string;
  seat: number;
  hand: UnoCard[]; // populated only for the viewing player
  handCount: number;
  calledUno: boolean;
  score: number;
  netLastRound: number;
  finishedRank: number;
}

export interface UnoSettings {
  targetScore: number;
  stacking: boolean;
  startingHand: number;
}

export interface UnoLastEvent {
  kind: string; // play|draw|skip|reverse|draw2|wild|wild4|uno|color|forgot_uno|deal
  byId: string | null; // who performed the action (threw the card)
  playerId: string | null; // who it targets (skipped / drew)
  color: UnoColor | null;
  count: number | null;
  seq: number;
}

export interface UnoGameState {
  gameType: "uno";
  phase: UnoPhase;
  players: UnoPlayer[];
  drawPile: UnoCard[]; // always [] on the client
  drawCount: number;
  discardTop: UnoCard | null;
  discardCount: number;
  currentColor: UnoColor;
  direction: number; // 1 | -1
  currentPlayerIndex: number;
  colorChooserIndex: number;
  drawnPlayableId: string | null;
  winnerId: string | null;
  round: number;
  settings: UnoSettings;
  message: string;
  hostId: string;
  lastEvent: UnoLastEvent;
}

export const UNO_COLORS: Exclude<UnoColor, "wild">[] = [
  "red",
  "yellow",
  "green",
  "blue",
];

export const COLOR_HEX: Record<UnoColor, string> = {
  red: "#d63a32",
  yellow: "#e8a200",
  green: "#3aa13a",
  blue: "#2b6fd6",
  wild: "#1a1a1a",
};
