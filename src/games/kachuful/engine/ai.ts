import { Card, PlayedCard, Suit } from "./types";
import { RANK_VALUE } from "./deck";
import { legalCards } from "./rules";

export function botBid(
  hand: Card[],
  trump: Suit | null,
  cardsPerPlayer: number,
  forbidden: number | null
): number {
  let expected = 0;
  for (const c of hand) {
    if (trump && c.suit === trump) {
      if (RANK_VALUE[c.rank] >= 12) expected += 0.85;
      else if (RANK_VALUE[c.rank] >= 9) expected += 0.55;
      else expected += 0.25;
    } else {
      if (RANK_VALUE[c.rank] === 14) expected += 0.7;
      else if (RANK_VALUE[c.rank] === 13) expected += 0.45;
      else if (RANK_VALUE[c.rank] === 12) expected += 0.25;
    }
  }
  let bid = Math.max(0, Math.min(cardsPerPlayer, Math.round(expected)));
  if (forbidden !== null && bid === forbidden) {
    if (bid === 0) bid = 1;
    else if (bid === cardsPerPlayer) bid = cardsPerPlayer - 1;
    else bid = Math.random() < 0.5 ? bid - 1 : bid + 1;
  }
  return bid;
}

export interface BotPlayContext {
  hand: Card[];
  leadSuit: Suit | null;
  trump: Suit | null;
  trick: PlayedCard[];
  bid: number;
  tricksWon: number;
  cardsLeft: number;
}

export function botPlay(ctx: BotPlayContext): Card {
  const { hand, leadSuit, trump, trick, bid, tricksWon } = ctx;
  const legal = legalCards(hand, leadSuit);
  if (legal.length === 1) return legal[0];

  const tricksRemaining = ctx.cardsLeft;
  const need = Math.max(0, bid - tricksWon);
  const wantWin = need > 0 && (need >= tricksRemaining || Math.random() < need / tricksRemaining);

  const sorted = [...legal].sort(
    (a, b) => RANK_VALUE[a.rank] - RANK_VALUE[b.rank]
  );

  const isLeader = trick.length === 0;
  if (isLeader) {
    if (wantWin) {
      const trumpHigh = sorted.filter((c) => trump && c.suit === trump);
      if (trumpHigh.length > 0) return trumpHigh[trumpHigh.length - 1];
      return sorted[sorted.length - 1];
    }
    return sorted[0];
  }

  const currentBest = (() => {
    const trumps = trick.filter((p) => trump && p.card.suit === trump);
    if (trumps.length > 0) {
      return trumps.reduce((best, cur) =>
        RANK_VALUE[cur.card.rank] > RANK_VALUE[best.card.rank] ? cur : best
      );
    }
    const inSuit = trick.filter((p) => p.card.suit === leadSuit);
    return inSuit.reduce((best, cur) =>
      RANK_VALUE[cur.card.rank] > RANK_VALUE[best.card.rank] ? cur : best
    );
  })();

  const beats = (c: Card) => {
    const isTrumpInPlay =
      trump && trick.some((p) => p.card.suit === trump);
    if (c.suit === trump && currentBest.card.suit !== trump) return true;
    if (c.suit === currentBest.card.suit) {
      return RANK_VALUE[c.rank] > RANK_VALUE[currentBest.card.rank];
    }
    if (isTrumpInPlay) return false;
    return false;
  };

  if (wantWin) {
    const winners = sorted.filter(beats);
    if (winners.length > 0) return winners[0];
    return sorted[0];
  } else {
    const losers = sorted.filter((c) => !beats(c));
    if (losers.length > 0) return losers[losers.length - 1];
    return sorted[0];
  }
}
