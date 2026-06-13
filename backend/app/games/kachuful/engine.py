"""State machine — direct port of src/game/engine.ts.

All transitions are pure: (state, action) -> new state.
"""
from __future__ import annotations

from typing import Dict, List, Optional

from .deck import deal, sort_hand
from .rules import (
    dealer_forbidden_bid,
    generate_round_pattern,
    score_round,
    trick_winner,
    trump_for_round,
)
from .types import (
    Card,
    GameSettings,
    GameState,
    PlayedCard,
    Player,
    RoundResult,
    RoundResultCell,
)


DEFAULT_SETTINGS = GameSettings(
    maxCards=7,
    scoringMode="ten-plus-bid",
    enforceDealerConstraint=True,
    noTrumpRound=False,
)


def create_initial_state(
    players: List[Player], settings: Optional[GameSettings] = None
) -> GameState:
    if settings is None:
        settings = DEFAULT_SETTINGS.model_copy()
    pattern = generate_round_pattern(len(players), settings.maxCards)
    return GameState(
        phase="idle",
        players=list(players),
        hands={},
        round=0,
        totalRounds=len(pattern),
        cardsPerPlayer=pattern[0] if pattern else 0,
        trump=trump_for_round(0, settings.noTrumpRound),
        dealerIndex=0,
        currentTurnIndex=0,
        bids={p.id: None for p in players},
        tricksWon={p.id: 0 for p in players},
        totals={p.id: 0 for p in players},
        history=[],
        currentTrick=[],
        leadSuit=None,
        trickWinnerId=None,
        settings=settings.model_copy(),
        message="Ready",
        bidOrder=[],
        playOrder=[],
    )


def start_round(state: GameState) -> GameState:
    pattern = generate_round_pattern(
        len(state.players), state.settings.maxCards
    )
    cards_per_player = pattern[state.round]
    trump = trump_for_round(state.round, state.settings.noTrumpRound)

    dealt = deal(len(state.players), cards_per_player)
    hands: Dict[str, List[Card]] = {}
    for i, p in enumerate(state.players):
        hands[p.id] = sort_hand(dealt[i])

    first_bidder_idx = (state.dealerIndex + 1) % len(state.players)
    bid_order = [
        state.players[(first_bidder_idx + i) % len(state.players)].id
        for i in range(len(state.players))
    ]

    return state.model_copy(
        update={
            "phase": "bidding",
            "cardsPerPlayer": cards_per_player,
            "trump": trump,
            "hands": hands,
            "bids": {p.id: None for p in state.players},
            "tricksWon": {p.id: 0 for p in state.players},
            "currentTurnIndex": first_bidder_idx,
            "currentTrick": [],
            "leadSuit": None,
            "trickWinnerId": None,
            "bidOrder": bid_order,
            "playOrder": [],
            "message": (
                f"Round {state.round + 1}: {cards_per_player} card"
                f"{'s' if cards_per_player > 1 else ''}, "
                f"Trump: {trump if trump else 'No Trump'}"
            ),
        }
    )


def _next_unbid(state: GameState) -> Optional[str]:
    for pid in state.bidOrder:
        if state.bids.get(pid) is None:
            return pid
    return None


def place_bid(state: GameState, player_id: str, bid: int) -> GameState:
    if state.phase != "bidding":
        return state
    expected = _next_unbid(state)
    if expected != player_id:
        return state

    new_bids = dict(state.bids)
    new_bids[player_id] = bid
    remaining = [pid for pid in state.bidOrder if new_bids.get(pid) is None]

    if not remaining:
        first_play_idx = (state.dealerIndex + 1) % len(state.players)
        play_order = [
            state.players[(first_play_idx + i) % len(state.players)].id
            for i in range(len(state.players))
        ]
        return state.model_copy(
            update={
                "bids": new_bids,
                "phase": "playing",
                "currentTurnIndex": first_play_idx,
                "playOrder": play_order,
                "message": "Lead the first trick",
            }
        )

    next_bidder = remaining[0]
    next_idx = next(
        (i for i, p in enumerate(state.players) if p.id == next_bidder), 0
    )
    next_name = next(
        (p.name for p in state.players if p.id == next_bidder), "?"
    )
    return state.model_copy(
        update={
            "bids": new_bids,
            "currentTurnIndex": next_idx,
            "message": f"{next_name} to bid",
        }
    )


def get_forbidden_dealer_bid(state: GameState) -> Optional[int]:
    if not state.settings.enforceDealerConstraint:
        return None
    dealer_id = state.players[state.dealerIndex].id
    remaining = [
        pid for pid in state.bidOrder if state.bids.get(pid) is None
    ]
    if len(remaining) != 1:
        return None
    if remaining[0] != dealer_id:
        return None
    bids_so_far = [
        state.bids[pid]
        for pid in state.bidOrder
        if state.bids.get(pid) is not None
    ]
    return dealer_forbidden_bid(state.cardsPerPlayer, bids_so_far)  # type: ignore[arg-type]


def play_card(state: GameState, player_id: str, card: Card) -> GameState:
    if state.phase != "playing":
        return state
    expected = state.playOrder[len(state.currentTrick)]
    if expected != player_id:
        return state
    player_hand = state.hands.get(player_id, [])
    if not any(c.id == card.id for c in player_hand):
        return state

    is_lead = len(state.currentTrick) == 0
    lead_suit = card.suit if is_lead else state.leadSuit

    if not is_lead:
        in_suit = [c for c in player_hand if c.suit == lead_suit]
        if in_suit and card.suit != lead_suit:
            return state  # must follow if able

    new_trick = list(state.currentTrick) + [
        PlayedCard(playerId=player_id, card=card)
    ]
    new_hands = dict(state.hands)
    new_hands[player_id] = [c for c in player_hand if c.id != card.id]

    if len(new_trick) < len(state.players):
        next_player_id = state.playOrder[len(new_trick)]
        next_idx = next(
            (i for i, p in enumerate(state.players) if p.id == next_player_id),
            0,
        )
        next_name = next(
            (p.name for p in state.players if p.id == next_player_id), "?"
        )
        return state.model_copy(
            update={
                "hands": new_hands,
                "currentTrick": new_trick,
                "leadSuit": lead_suit,
                "currentTurnIndex": next_idx,
                "message": f"{next_name}'s turn",
            }
        )

    winner = trick_winner(new_trick, state.trump, lead_suit)  # type: ignore[arg-type]
    winner_name = next(
        (p.name for p in state.players if p.id == winner.playerId), "?"
    )
    return state.model_copy(
        update={
            "hands": new_hands,
            "currentTrick": new_trick,
            "leadSuit": lead_suit,
            "phase": "trick_resolution",
            "trickWinnerId": winner.playerId,
            "message": f"{winner_name} wins the trick",
        }
    )


def resolve_trick(state: GameState) -> GameState:
    if state.phase != "trick_resolution" or state.trickWinnerId is None:
        return state

    new_tricks_won = dict(state.tricksWon)
    new_tricks_won[state.trickWinnerId] = (
        new_tricks_won.get(state.trickWinnerId, 0) + 1
    )

    remaining_cards = sum(len(h) for h in state.hands.values())
    if remaining_cards == 0:
        per_player: Dict[str, RoundResultCell] = {}
        new_totals = dict(state.totals)
        for p in state.players:
            bid = state.bids.get(p.id) or 0
            tricks = new_tricks_won.get(p.id, 0)
            points = score_round(bid, tricks)
            total = state.totals.get(p.id, 0) + points
            per_player[p.id] = RoundResultCell(
                bid=bid, tricks=tricks, points=points, total=total
            )
            new_totals[p.id] = total
        result = RoundResult(
            round=state.round + 1,
            cardsPerPlayer=state.cardsPerPlayer,
            trump=state.trump,
            perPlayer=per_player,
        )
        return state.model_copy(
            update={
                "tricksWon": new_tricks_won,
                "totals": new_totals,
                "history": list(state.history) + [result],
                "phase": "round_summary",
                "currentTrick": [],
                "leadSuit": None,
                "trickWinnerId": None,
                "message": "Round complete",
            }
        )

    winner_idx = next(
        (i for i, p in enumerate(state.players) if p.id == state.trickWinnerId),
        0,
    )
    new_play_order = [
        state.players[(winner_idx + i) % len(state.players)].id
        for i in range(len(state.players))
    ]
    return state.model_copy(
        update={
            "tricksWon": new_tricks_won,
            "phase": "playing",
            "currentTrick": [],
            "leadSuit": None,
            "trickWinnerId": None,
            "currentTurnIndex": winner_idx,
            "playOrder": new_play_order,
            "message": f"{state.players[winner_idx].name} leads next trick",
        }
    )


def next_round_or_end(state: GameState) -> GameState:
    if state.phase != "round_summary":
        return state
    next_round = state.round + 1
    if next_round >= state.totalRounds:
        return state.model_copy(
            update={"phase": "game_over", "message": "Game over!"}
        )
    advanced = state.model_copy(
        update={
            "round": next_round,
            "dealerIndex": (state.dealerIndex + 1) % len(state.players),
        }
    )
    return start_round(advanced)


def current_expected_player_id(state: GameState) -> Optional[str]:
    if state.phase == "bidding":
        return _next_unbid(state)
    if state.phase == "playing":
        idx = len(state.currentTrick)
        if 0 <= idx < len(state.playOrder):
            return state.playOrder[idx]
    return None


def leaderboard(state: GameState) -> List[dict]:
    rows = [
        {"player": p, "total": state.totals.get(p.id, 0)}
        for p in state.players
    ]
    rows.sort(key=lambda r: r["total"], reverse=True)
    return rows
