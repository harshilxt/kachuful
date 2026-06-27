import { SUITS, SUIT_COLOR, type Rank } from "../../kachuful/engine/types";
import { uid } from "../../../lib/utils";
import type {
  Card,
  DrawMode,
  MoveSource,
  MoveTarget,
  SolitaireState,
  Suit,
} from "./types";

/** Foundation order: Ace (1) … King (13). */
const RANK_ORDER: Rank[] = [
  "A",
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
];

export function rankValue(r: Rank): number {
  return RANK_ORDER.indexOf(r) + 1; // A=1 … K=13
}

export function isRed(suit: Suit): boolean {
  return SUIT_COLOR[suit] === "red";
}

/** Standard Klondike scoring (Microsoft "Standard" style). */
const SCORE = {
  wasteToTableau: 5,
  wasteToFoundation: 10,
  tableauToFoundation: 10,
  flipCard: 5,
  foundationToTableau: -15,
};

function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANK_ORDER) {
      deck.push({ id: uid("c"), suit, rank });
    }
  }
  // Fisher–Yates shuffle.
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function createGame(drawMode: DrawMode): SolitaireState {
  const deck = freshDeck();
  const tableau = Array.from({ length: 7 }, () => ({
    down: [] as Card[],
    up: [] as Card[],
  }));

  let idx = 0;
  for (let col = 0; col < 7; col++) {
    for (let n = 0; n <= col; n++) {
      const card = deck[idx++];
      if (n === col) tableau[col].up.push(card);
      else tableau[col].down.push(card);
    }
  }

  return {
    drawMode,
    stock: deck.slice(idx),
    waste: [],
    foundations: { S: [], H: [], D: [], C: [] },
    tableau,
    moves: 0,
    score: 0,
    recycles: 0,
    startedAt: null,
    won: false,
  };
}

/* ---------- immutable-ish helpers ---------- */

function clone(s: SolitaireState): SolitaireState {
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

function startClock(s: SolitaireState) {
  if (s.startedAt === null) s.startedAt = Date.now();
}

function top<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

/* ---------- validation ---------- */

/** Is `cards` a valid movable run (descending rank, alternating colours)? */
export function isValidRun(cards: Card[]): boolean {
  for (let i = 1; i < cards.length; i++) {
    const prev = cards[i - 1];
    const cur = cards[i];
    if (rankValue(cur.rank) !== rankValue(prev.rank) - 1) return false;
    if (isRed(cur.suit) === isRed(prev.suit)) return false;
  }
  return true;
}

export function getMovingCards(
  s: SolitaireState,
  source: MoveSource
): Card[] | null {
  if (source.kind === "waste") {
    const c = top(s.waste);
    return c ? [c] : null;
  }
  if (source.kind === "foundation") {
    const c = top(s.foundations[source.suit]);
    return c ? [c] : null;
  }
  const col = s.tableau[source.col];
  if (!col || source.index < 0 || source.index >= col.up.length) return null;
  const run = col.up.slice(source.index);
  return isValidRun(run) ? run : null;
}

export function canDrop(
  s: SolitaireState,
  cards: Card[],
  target: MoveTarget
): boolean {
  if (cards.length === 0) return false;

  if (target.kind === "foundation") {
    if (cards.length !== 1) return false;
    const card = cards[0];
    if (card.suit !== target.suit) return false;
    const pile = s.foundations[target.suit];
    const t = top(pile);
    return t
      ? rankValue(card.rank) === rankValue(t.rank) + 1
      : card.rank === "A";
  }

  // tableau
  const col = s.tableau[target.col];
  if (!col) return false;
  const bottom = cards[0];
  const t = top(col.up);
  if (!t) {
    // empty column (no face-up and no face-down): only a King may land
    return col.down.length === 0 && bottom.rank === "K";
  }
  return (
    rankValue(bottom.rank) === rankValue(t.rank) - 1 &&
    isRed(bottom.suit) !== isRed(t.suit)
  );
}

/* ---------- actions (return new state, or null if invalid) ---------- */

export function draw(state: SolitaireState): SolitaireState | null {
  const s = clone(state);
  startClock(s);
  if (s.stock.length === 0) {
    if (s.waste.length === 0) return null; // nothing to do
    // recycle waste back into stock
    s.stock = [...s.waste].reverse();
    s.waste = [];
    s.recycles += 1;
    s.moves += 1;
    return s;
  }
  const n = Math.min(s.drawMode, s.stock.length);
  for (let i = 0; i < n; i++) {
    const card = s.stock.pop()!;
    s.waste.push(card);
  }
  s.moves += 1;
  return s;
}

export function applyMove(
  state: SolitaireState,
  source: MoveSource,
  target: MoveTarget
): SolitaireState | null {
  const cards = getMovingCards(state, source);
  if (!cards) return null;
  if (!canDrop(state, cards, target)) return null;

  const s = clone(state);
  startClock(s);

  // remove from source
  if (source.kind === "waste") {
    s.waste.pop();
  } else if (source.kind === "foundation") {
    s.foundations[source.suit].pop();
  } else {
    s.tableau[source.col].up.splice(source.index);
  }

  // add to target
  if (target.kind === "foundation") {
    s.foundations[target.suit].push(cards[0]);
  } else {
    s.tableau[target.col].up.push(...cards);
  }

  // scoring
  if (target.kind === "foundation") {
    s.score +=
      source.kind === "waste"
        ? SCORE.wasteToFoundation
        : source.kind === "tableau"
          ? SCORE.tableauToFoundation
          : 0;
  } else if (target.kind === "tableau") {
    if (source.kind === "waste") s.score += SCORE.wasteToTableau;
    else if (source.kind === "foundation") s.score += SCORE.foundationToTableau;
  }

  // flip a newly exposed tableau card
  if (source.kind === "tableau") {
    const col = s.tableau[source.col];
    if (col.up.length === 0 && col.down.length > 0) {
      col.up.push(col.down.pop()!);
      s.score += SCORE.flipCard;
    }
  }

  if (s.score < 0) s.score = 0;
  s.moves += 1;
  s.won = isWon(s);
  return s;
}

/** Try to send the top card of a source to its foundation (double-click). */
export function autoToFoundation(
  state: SolitaireState,
  source: MoveSource
): SolitaireState | null {
  const cards = getMovingCards(state, source);
  if (!cards || cards.length !== 1) return null;
  const suit = cards[0].suit;
  return applyMove(state, source, { kind: "foundation", suit });
}

export function isWon(s: SolitaireState): boolean {
  return SUITS.every((suit) => s.foundations[suit].length === 13);
}

/** Auto-finish is offered once every tableau card is face up. */
export function canAutoComplete(s: SolitaireState): boolean {
  if (s.won) return false;
  return s.tableau.every((c) => c.down.length === 0);
}

/**
 * One step of auto-finish: move the best available card to a foundation,
 * drawing through the stock when nothing is immediately playable.
 * Returns null when no further progress is possible.
 */
export function autoFinishStep(state: SolitaireState): SolitaireState | null {
  // 1) any tableau top that fits a foundation
  for (let col = 0; col < state.tableau.length; col++) {
    const up = state.tableau[col].up;
    if (up.length === 0) continue;
    const card = up[up.length - 1];
    const src: MoveSource = { kind: "tableau", col, index: up.length - 1 };
    if (canDrop(state, [card], { kind: "foundation", suit: card.suit })) {
      return applyMove(state, src, { kind: "foundation", suit: card.suit });
    }
  }
  // 2) waste top
  const w = top(state.waste);
  if (w && canDrop(state, [w], { kind: "foundation", suit: w.suit })) {
    return applyMove(state, { kind: "waste" }, { kind: "foundation", suit: w.suit });
  }
  // 3) draw to surface more cards (only if there are still cards to cycle)
  if (state.stock.length > 0 || state.waste.length > 0) {
    return draw(state);
  }
  return null;
}

/** Elapsed seconds for display. */
export function elapsedSeconds(s: SolitaireState, now: number): number {
  if (s.startedAt === null) return 0;
  return Math.max(0, Math.floor((now - s.startedAt) / 1000));
}
