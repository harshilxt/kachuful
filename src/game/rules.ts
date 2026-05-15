import { Card, PlayedCard, Suit } from "./types";
import { RANK_VALUE } from "./deck";

export function legalCards(hand: Card[], leadSuit: Suit | null): Card[] {
  if (!leadSuit) return hand;
  const inSuit = hand.filter((c) => c.suit === leadSuit);
  return inSuit.length > 0 ? inSuit : hand;
}

export function trickWinner(
  trick: PlayedCard[],
  trump: Suit | null,
  leadSuit: Suit
): PlayedCard {
  const trumpsPlayed = trick.filter((p) => trump && p.card.suit === trump);
  if (trumpsPlayed.length > 0) {
    return trumpsPlayed.reduce((best, cur) =>
      RANK_VALUE[cur.card.rank] > RANK_VALUE[best.card.rank] ? cur : best
    );
  }
  const inSuit = trick.filter((p) => p.card.suit === leadSuit);
  return inSuit.reduce((best, cur) =>
    RANK_VALUE[cur.card.rank] > RANK_VALUE[best.card.rank] ? cur : best
  );
}

export function scoreRound(bid: number, tricks: number): number {
  if (bid === tricks) return 10 + bid;
  return 0;
}

export function dealerForbiddenBid(
  cardsPerPlayer: number,
  bidsSoFar: number[]
): number | null {
  const sum = bidsSoFar.reduce((a, b) => a + b, 0);
  const forbidden = cardsPerPlayer - sum;
  if (forbidden < 0 || forbidden > cardsPerPlayer) return null;
  return forbidden;
}

export function generateRoundPattern(
  numPlayers: number,
  maxCardsCap = 8
): number[] {
  const physicalMax = Math.floor(52 / numPlayers);
  const peak = Math.min(maxCardsCap, physicalMax);
  const up = Array.from({ length: peak }, (_, i) => i + 1);
  const down = Array.from({ length: peak - 1 }, (_, i) => peak - 1 - i);
  return [...up, ...down];
}

export const TRUMP_CYCLE: (Suit | null)[] = ["S", "H", "D", "C", null];

export function trumpForRound(roundIndex: number, useNoTrump: boolean): Suit | null {
  if (useNoTrump) return TRUMP_CYCLE[roundIndex % TRUMP_CYCLE.length];
  const cycle: Suit[] = ["S", "H", "D", "C"];
  return cycle[roundIndex % cycle.length];
}
