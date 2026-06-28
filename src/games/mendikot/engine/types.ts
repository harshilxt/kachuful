import type { Card, Suit } from "../../kachuful/engine/types";

export type { Card, Suit };

export type Team = 0 | 1;
export type Phase = "choose_trump" | "playing" | "trick_done" | "hand_over";

export interface MPlayer {
  id: string;
  name: string;
  seat: number; // 0=you (bottom), 1=right, 2=partner (top), 3=left
  isBot: boolean;
  team: Team; // seat % 2
  avatar: string;
}

export interface PlayedCard {
  seat: number;
  card: Card;
}

export type WinKind = "mendikot" | "whitewash" | "tens" | "tricks";

export interface HandResult {
  winnerTeam: Team;
  kind: WinKind;
  tens: [number, number]; // tens captured per team
  tricks: [number, number]; // tricks won per team
  humanWon: boolean;
  message: string;
}

export interface MendikotState {
  players: MPlayer[]; // ordered by seat 0..3
  hands: Record<string, Card[]>;
  trump: Suit | null; // chosen suit (kept secret until revealed)
  trumpRevealed: boolean;
  chooserSeat: number; // who picks trump & leads first
  leaderSeat: number; // who leads the current trick
  turnSeat: number; // whose turn it is now
  currentTrick: PlayedCard[];
  leadSuit: Suit | null;
  tensByTeam: [number, number];
  tricksByTeam: [number, number];
  lastTrick: PlayedCard[] | null;
  lastTrickWinnerSeat: number | null;
  phase: Phase;
  message: string;
  result: HandResult | null;
}

/** Server-shipped per-player view (multiplayer). Other hands are hidden;
 *  trump is null unless revealed or you are the chooser. */
export interface MendikotView {
  players: MPlayer[];
  hands: Record<string, Card[]>;
  handCounts: Record<string, number>;
  trump: Suit | null;
  trumpRevealed: boolean;
  chooserSeat: number;
  leaderSeat: number;
  turnSeat: number;
  currentTrick: PlayedCard[];
  leadSuit: Suit | null;
  tensByTeam: [number, number];
  tricksByTeam: [number, number];
  lastTrickWinnerSeat: number | null;
  phase: Phase;
  message: string;
  result: HandResult | null;
  hostId?: string | null;
}

export const HUMAN_SEAT = 0;

export function teamOf(seat: number): Team {
  return (seat % 2) as Team;
}

export function nextSeat(seat: number): number {
  return (seat + 1) % 4;
}
