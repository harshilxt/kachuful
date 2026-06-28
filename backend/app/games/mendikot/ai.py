"""Mendikot bot — port of the frontend heuristic AI."""
from __future__ import annotations

from typing import List, Optional

from ..kachuful.deck import RANK_VALUE
from ..kachuful.types import Card, Suit
from .engine import (
    active_trump,
    legal_cards,
    player_at_seat,
    suit_counts,
    team_of,
    trick_winner_seat,
)
from .types import MendikotState

SUITS: List[Suit] = ["S", "H", "D", "C"]


def _is_ten(c: Card) -> bool:
    return c.rank == "10"


def _lowest(cards: List[Card]) -> Card:
    return sorted(cards, key=lambda c: RANK_VALUE[c.rank])[0]


def _highest(cards: List[Card]) -> Card:
    return sorted(cards, key=lambda c: -RANK_VALUE[c.rank])[0]


def bot_choose_trump(hand: List[Card]) -> Suit:
    counts = suit_counts(hand)
    best: Suit = "S"
    best_score = -1
    for s in SUITS:
        strength = sum(RANK_VALUE[c.rank] for c in hand if c.suit == s)
        score = counts[s] * 100 + strength
        if score > best_score:
            best_score = score
            best = s
    return best


def bot_play(state: MendikotState) -> Card:
    seat = state.turnSeat
    my_team = team_of(seat)
    legal = legal_cards(state, seat)
    trump = active_trump(state)

    # Leading.
    if not state.currentTrick:
        non_tens = [c for c in legal if not _is_ten(c)]
        pool = non_tens if non_tens else legal
        off_trump = [c for c in pool if c.suit != state.trump]
        candidates = off_trump if off_trump else pool
        aces = [c for c in candidates if c.rank == "A"]
        if aces:
            return aces[0]
        return _highest(candidates)

    lead_suit = state.leadSuit
    winning_seat = trick_winner_seat(state.currentTrick, trump, lead_suit)
    partner_winning = team_of(winning_seat) == my_team
    trick_has_ten = any(_is_ten(t.card) for t in state.currentTrick)
    win_card = next(t.card for t in state.currentTrick if t.seat == winning_seat)
    can_follow = any(c.suit == lead_suit for c in legal)

    if can_follow:
        suit_cards = [c for c in legal if c.suit == lead_suit]
        if partner_winning:
            my_ten = next((c for c in suit_cards if _is_ten(c)), None)
            if my_ten:
                return my_ten
            return _lowest(suit_cards)
        beats = [
            c for c in suit_cards if RANK_VALUE[c.rank] > RANK_VALUE[win_card.rank]
        ]
        if beats:
            non_ten_beats = [c for c in beats if not _is_ten(c)]
            if trick_has_ten or not non_ten_beats:
                return _lowest(beats)
            return _lowest(non_ten_beats)
        non_tens = [c for c in suit_cards if not _is_ten(c)]
        return _lowest(non_tens if non_tens else suit_cards)

    # Void in lead suit.
    trumps_in_hand = [c for c in legal if trump and c.suit == trump]
    if (not partner_winning) and trumps_in_hand:
        if win_card.suit != trump:
            return _lowest(trumps_in_hand)
        beating = [
            c for c in trumps_in_hand if RANK_VALUE[c.rank] > RANK_VALUE[win_card.rank]
        ]
        if beating:
            return _lowest(beating)
    non_tens = [c for c in legal if not _is_ten(c)]
    return _lowest(non_tens if non_tens else legal)


def bot_action(state: MendikotState, player_id: str) -> Optional[dict]:
    if state.phase == "choose_trump":
        hand = state.hands.get(player_id, [])
        return {"type": "chooseTrump", "suit": bot_choose_trump(hand)}
    if state.phase == "playing":
        card = bot_play(state)
        return {"type": "play", "cardId": card.id}
    return None


def auto_default_action(state: MendikotState, player_id: str) -> Optional[dict]:
    """Fallback action when a human's turn times out."""
    if state.phase == "choose_trump":
        hand = state.hands.get(player_id, [])
        return {"type": "chooseTrump", "suit": bot_choose_trump(hand)}
    if state.phase == "playing":
        seat = player_at_seat(state, state.turnSeat).seat
        legal = legal_cards(state, seat)
        if not legal:
            return None
        return {"type": "play", "cardId": _lowest(legal).id}
    return None
