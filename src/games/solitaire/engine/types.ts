import type { Card, Suit } from "../../kachuful/engine/types";

export type { Card, Suit };

export type DrawMode = 1 | 3;

/** A tableau column: face-down cards plus the face-up run on top. */
export interface TableauColumn {
  down: Card[];
  up: Card[];
}

export interface SolitaireState {
  drawMode: DrawMode;
  stock: Card[]; // face-down draw pile; top = last element
  waste: Card[]; // face-up; top = last element
  foundations: Record<Suit, Card[]>; // one pile per suit; top = last
  tableau: TableauColumn[]; // 7 columns
  moves: number;
  score: number;
  recycles: number;
  /** Epoch ms of the first move, or null before play starts. */
  startedAt: number | null;
  won: boolean;
}

/** Where a drag/move starts from. */
export type MoveSource =
  | { kind: "waste" }
  | { kind: "tableau"; col: number; index: number } // index into up[]
  | { kind: "foundation"; suit: Suit };

/** Where a move lands. */
export type MoveTarget =
  | { kind: "tableau"; col: number }
  | { kind: "foundation"; suit: Suit };
