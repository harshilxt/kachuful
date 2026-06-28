import { RANK_VALUE } from "../../kachuful/engine/deck";
import {
  activeTrump,
  legalCards,
  suitCounts,
  trickWinnerSeat,
} from "./engine";
import { teamOf, type Card, type MendikotState, type Suit } from "./types";

const SUITS: Suit[] = ["S", "H", "D", "C"];

function isTen(c: Card) {
  return c.rank === "10";
}
function lowest(cards: Card[]) {
  return [...cards].sort((a, b) => RANK_VALUE[a.rank] - RANK_VALUE[b.rank])[0];
}
function highest(cards: Card[]) {
  return [...cards].sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank])[0];
}

/** Bot picks trump = its longest suit (tie-break by total rank strength). */
export function botChooseTrump(hand: Card[]): Suit {
  const counts = suitCounts(hand);
  let best: Suit = "S";
  let bestScore = -1;
  for (const s of SUITS) {
    const strength = hand
      .filter((c) => c.suit === s)
      .reduce((sum, c) => sum + RANK_VALUE[c.rank], 0);
    const score = counts[s] * 100 + strength;
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}

/** Choose a card for the bot whose turn it is. */
export function botPlay(s: MendikotState): Card {
  const seat = s.turnSeat;
  const myTeam = teamOf(seat);
  const legal = legalCards(s, seat);
  const trump = activeTrump(s);

  // Leading the trick.
  if (s.currentTrick.length === 0) {
    const nonTens = legal.filter((c) => !isTen(c));
    const pool = nonTens.length > 0 ? nonTens : legal;
    // Lead a strong card (Ace/King) to pull tens; prefer non-trump leads.
    const offTrump = pool.filter((c) => c.suit !== s.trump);
    const candidates = offTrump.length > 0 ? offTrump : pool;
    const aces = candidates.filter((c) => c.rank === "A");
    if (aces.length > 0) return aces[0];
    return highest(candidates);
  }

  // Following.
  const leadSuit = s.leadSuit!;
  const winningSeat = trickWinnerSeat(s.currentTrick, trump, leadSuit);
  const partnerWinning = teamOf(winningSeat) === myTeam;
  const trickHasTen = s.currentTrick.some((t) => isTen(t.card));
  const canFollow = legal.some((c) => c.suit === leadSuit);

  if (canFollow) {
    const suitCards = legal.filter((c) => c.suit === leadSuit);
    const winCard = s.currentTrick.find((t) => t.seat === winningSeat)!.card;

    if (partnerWinning) {
      // Partner safe → dump a ten of this suit to bank it, else play low.
      const myTen = suitCards.find((c) => isTen(c));
      if (myTen) return myTen;
      return lowest(suitCards);
    }
    // Opponent winning → try to beat (cheaply); secure tens for our team.
    const beats = suitCards.filter(
      (c) => RANK_VALUE[c.rank] > RANK_VALUE[winCard.rank]
    );
    if (beats.length > 0) {
      // win with lowest sufficient card, preferring not to waste our ten
      const nonTenBeats = beats.filter((c) => !isTen(c));
      if (trickHasTen || nonTenBeats.length === 0) return lowest(beats);
      return lowest(nonTenBeats);
    }
    // can't beat → throw lowest non-ten
    const nonTens = suitCards.filter((c) => !isTen(c));
    return lowest(nonTens.length > 0 ? nonTens : suitCards);
  }

  // Void in lead suit.
  const trumpsInHand = trump ? legal.filter((c) => c.suit === trump) : [];
  if (!partnerWinning && trumpsInHand.length > 0) {
    // ruff to win (especially if a ten is at stake)
    const trumpsBeating = trumpsInHand.filter((c) => {
      const winCard = s.currentTrick.find((t) => t.seat === winningSeat)!.card;
      if (winCard.suit !== trump) return true; // any trump beats a non-trump
      return RANK_VALUE[c.rank] > RANK_VALUE[winCard.rank];
    });
    if (trumpsBeating.length > 0) return lowest(trumpsBeating);
  }
  // discard lowest non-ten (keep tens out of opponents' hands)
  const nonTens = legal.filter((c) => !isTen(c));
  return lowest(nonTens.length > 0 ? nonTens : legal);
}
