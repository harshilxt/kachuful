import { createDeck, shuffle, RANK_VALUE, sortHand } from "../../kachuful/engine/deck";
import {
  HUMAN_SEAT,
  nextSeat,
  teamOf,
  type Card,
  type HandResult,
  type MendikotState,
  type MPlayer,
  type PlayedCard,
  type Suit,
} from "./types";

const BOT_NAMES = ["Rahul", "Anjali", "Vikram"];
const BOT_AVATARS = ["🦊", "🐼", "🦉"];

/** Build the 4 seated players (you bottom, partner top). */
function makePlayers(youName: string): MPlayer[] {
  const you: MPlayer = {
    id: "you",
    name: youName || "You",
    seat: HUMAN_SEAT,
    isBot: false,
    team: teamOf(HUMAN_SEAT),
    avatar: "🧑‍🎓",
  };
  const bots: MPlayer[] = [1, 2, 3].map((seat, i) => ({
    id: `bot${seat}`,
    name: seat === 2 ? `${BOT_NAMES[i]} (Partner)` : BOT_NAMES[i],
    seat,
    isBot: true,
    team: teamOf(seat),
    avatar: BOT_AVATARS[i],
  }));
  return [you, ...bots].sort((a, b) => a.seat - b.seat);
}

export function createGame(youName: string): MendikotState {
  const deck = shuffle(createDeck());
  const players = makePlayers(youName);
  const hands: Record<string, Card[]> = {};
  players.forEach((p, i) => {
    hands[p.id] = sortHand(deck.slice(i * 13, i * 13 + 13));
  });

  return {
    players,
    hands,
    trump: null,
    trumpRevealed: false,
    chooserSeat: HUMAN_SEAT,
    leaderSeat: HUMAN_SEAT,
    turnSeat: HUMAN_SEAT,
    currentTrick: [],
    leadSuit: null,
    tensByTeam: [0, 0],
    tricksByTeam: [0, 0],
    lastTrick: null,
    lastTrickWinnerSeat: null,
    phase: "choose_trump",
    message: "Choose the trump suit",
    result: null,
  };
}

function clone(s: MendikotState): MendikotState {
  const hands: Record<string, Card[]> = {};
  for (const k of Object.keys(s.hands)) hands[k] = [...s.hands[k]];
  return {
    ...s,
    players: s.players.map((p) => ({ ...p })),
    hands,
    currentTrick: s.currentTrick.map((t) => ({ ...t })),
    tensByTeam: [...s.tensByTeam] as [number, number],
    tricksByTeam: [...s.tricksByTeam] as [number, number],
    lastTrick: s.lastTrick ? s.lastTrick.map((t) => ({ ...t })) : null,
    result: s.result ? { ...s.result } : null,
  };
}

export function seatById(s: MendikotState, id: string): number {
  return s.players.find((p) => p.id === id)!.seat;
}

export function playerAtSeat(s: MendikotState, seat: number): MPlayer {
  return s.players.find((p) => p.seat === seat)!;
}

/** Cards the player at `seat` is allowed to play right now. */
export function legalCards(s: MendikotState, seat: number): Card[] {
  const hand = s.hands[playerAtSeat(s, seat).id];
  if (!s.leadSuit) return hand; // leader plays anything
  const inSuit = hand.filter((c) => c.suit === s.leadSuit);
  return inSuit.length > 0 ? inSuit : hand;
}

/** Winner seat of a (partial or full) trick, given active trump + lead suit. */
export function trickWinnerSeat(
  trick: PlayedCard[],
  trump: Suit | null,
  leadSuit: Suit
): number {
  const trumps = trick.filter((p) => trump && p.card.suit === trump);
  const pool = trumps.length > 0 ? trumps : trick.filter((p) => p.card.suit === leadSuit);
  return pool.reduce((best, cur) =>
    RANK_VALUE[cur.card.rank] > RANK_VALUE[best.card.rank] ? cur : best
  ).seat;
}

/** The active trump for winner calculations (null until revealed). */
export function activeTrump(s: MendikotState): Suit | null {
  return s.trumpRevealed ? s.trump : null;
}

export function chooseTrump(state: MendikotState, trump: Suit): MendikotState {
  if (state.phase !== "choose_trump") return state;
  const s = clone(state);
  s.trump = trump;
  s.phase = "playing";
  s.turnSeat = s.leaderSeat;
  s.message = `${playerAtSeat(s, s.turnSeat).name} leads`;
  return s;
}

/** Play one card for the player whose turn it is. Returns new state or null. */
export function playCard(state: MendikotState, cardId: string): MendikotState | null {
  if (state.phase !== "playing") return null;
  const s = clone(state);
  const seat = s.turnSeat;
  const player = playerAtSeat(s, seat);
  const hand = s.hands[player.id];
  const card = hand.find((c) => c.id === cardId);
  if (!card) return null;

  // enforce follow-suit
  const legal = legalCards(s, seat);
  if (!legal.some((c) => c.id === cardId)) return null;

  // remove from hand
  s.hands[player.id] = hand.filter((c) => c.id !== cardId);

  if (s.currentTrick.length === 0) s.leadSuit = card.suit;

  // reveal trump the first time someone can't follow suit
  if (!s.trumpRevealed && s.leadSuit && card.suit !== s.leadSuit) {
    s.trumpRevealed = true;
    s.message = `Trump revealed!`;
  }

  s.currentTrick.push({ seat, card });

  if (s.currentTrick.length < 4) {
    s.turnSeat = nextSeat(seat);
    return s;
  }

  // trick complete → resolve
  const winner = trickWinnerSeat(s.currentTrick, activeTrump(s), s.leadSuit!);
  const wTeam = teamOf(winner);
  s.tricksByTeam[wTeam] += 1;
  const tensHere = s.currentTrick.filter((t) => t.card.rank === "10").length;
  s.tensByTeam[wTeam] += tensHere;
  s.lastTrick = s.currentTrick;
  s.lastTrickWinnerSeat = winner;
  s.phase = "trick_done";
  s.message = `${playerAtSeat(s, winner).name} wins the trick`;
  return s;
}

/** Clear the finished trick and start the next one (or end the hand). */
export function advanceAfterTrick(state: MendikotState): MendikotState {
  if (state.phase !== "trick_done") return state;
  const s = clone(state);
  const handsEmpty = s.players.every((p) => s.hands[p.id].length === 0);
  s.currentTrick = [];
  s.leadSuit = null;
  if (handsEmpty) {
    s.phase = "hand_over";
    s.result = computeResult(s);
    s.message = s.result.message;
    return s;
  }
  s.phase = "playing";
  s.leaderSeat = s.lastTrickWinnerSeat!;
  s.turnSeat = s.lastTrickWinnerSeat!;
  s.message = `${playerAtSeat(s, s.turnSeat).name} leads`;
  return s;
}

function computeResult(s: MendikotState): HandResult {
  const [tA, tB] = s.tensByTeam;
  const [trA, trB] = s.tricksByTeam;
  let winnerTeam: 0 | 1;
  let kind: HandResult["kind"];

  if (trA === 13 || trB === 13) {
    winnerTeam = trA === 13 ? 0 : 1;
    kind = "whitewash";
  } else if (tA === 4 || tB === 4) {
    winnerTeam = tA === 4 ? 0 : 1;
    kind = "mendikot";
  } else if (tA >= 3 || tB >= 3) {
    winnerTeam = tA >= 3 ? 0 : 1;
    kind = "tens";
  } else {
    // 2-2 split → more tricks wins
    winnerTeam = trA > trB ? 0 : 1;
    kind = "tricks";
  }

  const humanTeam = teamOf(HUMAN_SEAT);
  const humanWon = winnerTeam === humanTeam;
  const side = winnerTeam === humanTeam ? "Your team" : "Opponents";
  const messages: Record<HandResult["kind"], string> = {
    mendikot: `${side} swept all four 10s — Mendikot! 🎉`,
    whitewash: `${side} took all 13 tricks — Whitewash! 🧹`,
    tens: `${side} captured the majority of 10s.`,
    tricks: `10s split 2–2 — ${side} won on tricks.`,
  };
  return {
    winnerTeam,
    kind,
    tens: [tA, tB],
    tricks: [trA, trB],
    humanWon,
    message: messages[kind],
  };
}

/** Suit counts in a hand (for trump hints). */
export function suitCounts(hand: Card[]): Record<Suit, number> {
  const c: Record<Suit, number> = { S: 0, H: 0, D: 0, C: 0 };
  for (const card of hand) c[card.suit] += 1;
  return c;
}
