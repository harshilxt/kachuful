import {
  Card,
  GameSettings,
  GameState,
  Player,
  PlayedCard,
  RoundResult,
  Suit,
} from "./types";
import { deal, sortHand } from "./deck";
import {
  dealerForbiddenBid,
  generateRoundPattern,
  scoreRound,
  trickWinner,
  trumpForRound,
} from "./rules";

export const DEFAULT_SETTINGS: GameSettings = {
  maxCards: 7,
  scoringMode: "ten-plus-bid",
  enforceDealerConstraint: true,
  noTrumpRound: false,
};

export function createInitialState(
  players: Player[],
  settings: GameSettings = DEFAULT_SETTINGS
): GameState {
  const pattern = generateRoundPattern(players.length, settings.maxCards);
  const totals: Record<string, number> = {};
  const tricksWon: Record<string, number> = {};
  const bids: Record<string, number | null> = {};
  for (const p of players) {
    totals[p.id] = 0;
    tricksWon[p.id] = 0;
    bids[p.id] = null;
  }
  return {
    phase: "idle",
    players,
    hands: {},
    round: 0,
    totalRounds: pattern.length,
    cardsPerPlayer: pattern[0],
    trump: trumpForRound(0, settings.noTrumpRound),
    dealerIndex: 0,
    currentTurnIndex: 0,
    bids,
    tricksWon,
    totals,
    history: [],
    currentTrick: [],
    leadSuit: null,
    trickWinnerId: null,
    settings,
    message: "Ready",
    bidOrder: [],
    playOrder: [],
  };
}

export function startRound(state: GameState): GameState {
  const pattern = generateRoundPattern(
    state.players.length,
    state.settings.maxCards
  );
  const cardsPerPlayer = pattern[state.round];
  const trump = trumpForRound(state.round, state.settings.noTrumpRound);

  const dealtHands = deal(state.players.length, cardsPerPlayer);
  const hands: Record<string, Card[]> = {};
  state.players.forEach((p, i) => {
    hands[p.id] = sortHand(dealtHands[i]);
  });

  const bids: Record<string, number | null> = {};
  const tricksWon: Record<string, number> = {};
  for (const p of state.players) {
    bids[p.id] = null;
    tricksWon[p.id] = 0;
  }

  const firstBidderIndex = (state.dealerIndex + 1) % state.players.length;
  const bidOrder: string[] = [];
  for (let i = 0; i < state.players.length; i++) {
    bidOrder.push(
      state.players[(firstBidderIndex + i) % state.players.length].id
    );
  }

  return {
    ...state,
    phase: "bidding",
    cardsPerPlayer,
    trump,
    hands,
    bids,
    tricksWon,
    currentTurnIndex: firstBidderIndex,
    currentTrick: [],
    leadSuit: null,
    trickWinnerId: null,
    bidOrder,
    playOrder: [],
    message: `Round ${state.round + 1}: ${cardsPerPlayer} card${cardsPerPlayer > 1 ? "s" : ""}, Trump: ${trump ?? "No Trump"}`,
  };
}

export function placeBid(state: GameState, playerId: string, bid: number): GameState {
  if (state.phase !== "bidding") return state;
  if (state.bidOrder[0] !== playerId) {
    const expectedNext = state.bidOrder.find((id) => state.bids[id] === null);
    if (expectedNext !== playerId) return state;
  }
  const expected = state.bidOrder.find((id) => state.bids[id] === null);
  if (expected !== playerId) return state;

  const newBids = { ...state.bids, [playerId]: bid };
  const remaining = state.bidOrder.filter((id) => newBids[id] === null);

  if (remaining.length === 0) {
    const firstPlayerIndex = (state.dealerIndex + 1) % state.players.length;
    const playOrder: string[] = [];
    for (let i = 0; i < state.players.length; i++) {
      playOrder.push(
        state.players[(firstPlayerIndex + i) % state.players.length].id
      );
    }
    return {
      ...state,
      bids: newBids,
      phase: "playing",
      currentTurnIndex: firstPlayerIndex,
      playOrder,
      message: "Lead the first trick",
    };
  }

  const nextBidderId = remaining[0];
  const nextIndex = state.players.findIndex((p) => p.id === nextBidderId);
  return {
    ...state,
    bids: newBids,
    currentTurnIndex: nextIndex,
    message: `${state.players.find((p) => p.id === nextBidderId)?.name} to bid`,
  };
}

export function getForbiddenDealerBid(state: GameState): number | null {
  if (!state.settings.enforceDealerConstraint) return null;
  const dealerId = state.players[state.dealerIndex].id;
  const remaining = state.bidOrder.filter((id) => state.bids[id] === null);
  if (remaining.length !== 1) return null;
  if (remaining[0] !== dealerId) return null;
  const bidsSoFar = state.bidOrder
    .filter((id) => state.bids[id] !== null)
    .map((id) => state.bids[id] as number);
  return dealerForbiddenBid(state.cardsPerPlayer, bidsSoFar);
}

export function playCard(
  state: GameState,
  playerId: string,
  card: Card
): GameState {
  if (state.phase !== "playing") return state;
  const expected = state.playOrder[state.currentTrick.length];
  if (expected !== playerId) return state;

  const playerHand = state.hands[playerId] || [];
  if (!playerHand.find((c) => c.id === card.id)) return state;

  const isLead = state.currentTrick.length === 0;
  const leadSuit = isLead ? card.suit : state.leadSuit!;

  if (!isLead) {
    const inSuit = playerHand.filter((c) => c.suit === leadSuit);
    if (inSuit.length > 0 && card.suit !== leadSuit) return state;
  }

  const newTrick: PlayedCard[] = [...state.currentTrick, { playerId, card }];
  const newHands = {
    ...state.hands,
    [playerId]: playerHand.filter((c) => c.id !== card.id),
  };

  if (newTrick.length < state.players.length) {
    const nextPlayerId = state.playOrder[newTrick.length];
    const nextIndex = state.players.findIndex((p) => p.id === nextPlayerId);
    return {
      ...state,
      hands: newHands,
      currentTrick: newTrick,
      leadSuit,
      currentTurnIndex: nextIndex,
      message: `${state.players.find((p) => p.id === nextPlayerId)?.name}'s turn`,
    };
  }

  const winner = trickWinner(newTrick, state.trump, leadSuit);
  return {
    ...state,
    hands: newHands,
    currentTrick: newTrick,
    leadSuit,
    phase: "trick_resolution",
    trickWinnerId: winner.playerId,
    message: `${state.players.find((p) => p.id === winner.playerId)?.name} wins the trick`,
  };
}

export function resolveTrick(state: GameState): GameState {
  if (state.phase !== "trick_resolution" || !state.trickWinnerId) return state;

  const newTricksWon = {
    ...state.tricksWon,
    [state.trickWinnerId]: (state.tricksWon[state.trickWinnerId] || 0) + 1,
  };

  const remainingCards = Object.values(state.hands).reduce(
    (sum, h) => sum + h.length,
    0
  );

  if (remainingCards === 0) {
    const perPlayer: RoundResult["perPlayer"] = {};
    for (const p of state.players) {
      const bid = state.bids[p.id] ?? 0;
      const tricks = newTricksWon[p.id] || 0;
      const points = scoreRound(bid, tricks);
      const total = (state.totals[p.id] || 0) + points;
      perPlayer[p.id] = { bid, tricks, points, total };
    }
    const newTotals = { ...state.totals };
    for (const p of state.players) {
      newTotals[p.id] = perPlayer[p.id].total;
    }
    const result: RoundResult = {
      round: state.round + 1,
      cardsPerPlayer: state.cardsPerPlayer,
      trump: state.trump,
      perPlayer,
    };
    return {
      ...state,
      tricksWon: newTricksWon,
      totals: newTotals,
      history: [...state.history, result],
      phase: "round_summary",
      currentTrick: [],
      leadSuit: null,
      trickWinnerId: null,
      message: "Round complete",
    };
  }

  const winnerIndex = state.players.findIndex(
    (p) => p.id === state.trickWinnerId
  );
  const newPlayOrder: string[] = [];
  for (let i = 0; i < state.players.length; i++) {
    newPlayOrder.push(
      state.players[(winnerIndex + i) % state.players.length].id
    );
  }
  return {
    ...state,
    tricksWon: newTricksWon,
    phase: "playing",
    currentTrick: [],
    leadSuit: null,
    trickWinnerId: null,
    currentTurnIndex: winnerIndex,
    playOrder: newPlayOrder,
    message: `${state.players[winnerIndex].name} leads next trick`,
  };
}

export function nextRoundOrEnd(state: GameState): GameState {
  if (state.phase !== "round_summary") return state;
  const nextRound = state.round + 1;
  if (nextRound >= state.totalRounds) {
    return { ...state, phase: "game_over", message: "Game over!" };
  }
  return startRound({
    ...state,
    round: nextRound,
    dealerIndex: (state.dealerIndex + 1) % state.players.length,
  });
}

export function currentExpectedPlayerId(state: GameState): string | null {
  if (state.phase === "bidding") {
    return state.bidOrder.find((id) => state.bids[id] === null) ?? null;
  }
  if (state.phase === "playing") {
    return state.playOrder[state.currentTrick.length] ?? null;
  }
  return null;
}

export function leaderboard(state: GameState): { player: Player; total: number }[] {
  return [...state.players]
    .map((p) => ({ player: p, total: state.totals[p.id] || 0 }))
    .sort((a, b) => b.total - a.total);
}

export { trumpForRound, generateRoundPattern };
export type { Suit };
