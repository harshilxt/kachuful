"""Mendikot pure game logic — Python port of the frontend engine.

Official rules: 4 players in two partnerships (seats 0/2 vs 1/3), capture the
four 10s. 3+ tens wins; 2-2 split decided by tricks; all four tens = mendikot;
all 13 tricks = whitewash. Trump is chosen secretly and revealed the first
time a player cannot follow suit.
"""
from __future__ import annotations

import random
from typing import List, Optional

from ..kachuful.deck import RANK_VALUE
from ..kachuful.types import RANKS, SUITS, Card, Suit
from .types import HandResult, MendikotState, MPlayer, PlayedCard

_SUIT_ORDER = {"S": 0, "H": 1, "C": 2, "D": 3}
_RED = {"H", "D"}


def create_deck() -> List[Card]:
    return [Card(id=f"{r}{s}", suit=s, rank=r) for s in SUITS for r in RANKS]


def shuffle(cards: List[Card]) -> List[Card]:
    out = list(cards)
    random.shuffle(out)
    return out


def sort_hand(hand: List[Card]) -> List[Card]:
    return sorted(
        hand, key=lambda c: (_SUIT_ORDER[c.suit], -RANK_VALUE[c.rank])
    )


def team_of(seat: int) -> int:
    return seat % 2


def next_seat(seat: int) -> int:
    return (seat + 1) % 4


def is_red(suit: Suit) -> bool:
    return suit in _RED


def player_at_seat(state: MendikotState, seat: int) -> MPlayer:
    return next(p for p in state.players if p.seat == seat)


def _refresh_counts(state: MendikotState) -> None:
    state.handCounts = {pid: len(cards) for pid, cards in state.hands.items()}


def create_initial_state(
    players: List[MPlayer], settings, host_id: Optional[str] = None
) -> MendikotState:
    deck = shuffle(create_deck())
    ps = sorted(players, key=lambda p: p.seat)
    hands = {}
    for i, p in enumerate(ps):
        hands[p.id] = sort_hand(deck[i * 13 : i * 13 + 13])
    state = MendikotState(
        players=ps,
        hands=hands,
        chooserSeat=0,
        leaderSeat=0,
        turnSeat=0,
        phase="choose_trump",
        message="Choosing the trump suit…",
        hostId=host_id,
    )
    _refresh_counts(state)
    return state


def legal_cards(state: MendikotState, seat: int) -> List[Card]:
    hand = state.hands[player_at_seat(state, seat).id]
    if state.leadSuit is None:
        return hand
    in_suit = [c for c in hand if c.suit == state.leadSuit]
    return in_suit if in_suit else hand


def trick_winner_seat(
    trick: List[PlayedCard], trump: Optional[Suit], lead_suit: Suit
) -> int:
    trumps = [p for p in trick if trump and p.card.suit == trump]
    pool = trumps if trumps else [p for p in trick if p.card.suit == lead_suit]
    best = pool[0]
    for p in pool[1:]:
        if RANK_VALUE[p.card.rank] > RANK_VALUE[best.card.rank]:
            best = p
    return best.seat


def active_trump(state: MendikotState) -> Optional[Suit]:
    return state.trump if state.trumpRevealed else None


def current_expected_player_id(state: MendikotState) -> Optional[str]:
    if state.phase == "choose_trump":
        return player_at_seat(state, state.chooserSeat).id
    if state.phase == "playing":
        return player_at_seat(state, state.turnSeat).id
    return None


def turn_token(state: MendikotState) -> tuple:
    return (
        state.phase,
        state.turnSeat,
        len(state.currentTrick),
        state.chooserSeat,
        state.trumpRevealed,
    )


def choose_trump(state: MendikotState, suit: Suit) -> MendikotState:
    if state.phase != "choose_trump":
        return state
    s = state.model_copy(deep=True)
    s.trump = suit
    s.phase = "playing"
    s.turnSeat = s.leaderSeat
    s.message = f"{player_at_seat(s, s.turnSeat).name} leads"
    return s


def play_card(state: MendikotState, card_id: str) -> MendikotState:
    if state.phase != "playing":
        return state
    s = state.model_copy(deep=True)
    seat = s.turnSeat
    player = player_at_seat(s, seat)
    hand = s.hands[player.id]
    card = next((c for c in hand if c.id == card_id), None)
    if card is None:
        return state
    legal = legal_cards(s, seat)
    if not any(c.id == card_id for c in legal):
        return state

    s.hands[player.id] = [c for c in hand if c.id != card_id]
    if not s.currentTrick:
        s.leadSuit = card.suit
    if (not s.trumpRevealed) and s.leadSuit and card.suit != s.leadSuit:
        s.trumpRevealed = True
        s.message = "Trump revealed!"
    s.currentTrick.append(PlayedCard(seat=seat, card=card))

    if len(s.currentTrick) < 4:
        s.turnSeat = next_seat(seat)
        _refresh_counts(s)
        return s

    winner = trick_winner_seat(s.currentTrick, active_trump(s), s.leadSuit)
    w_team = team_of(winner)
    s.tricksByTeam[w_team] += 1
    tens_here = sum(1 for t in s.currentTrick if t.card.rank == "10")
    s.tensByTeam[w_team] += tens_here
    s.lastTrickWinnerSeat = winner
    s.phase = "trick_done"
    s.message = f"{player_at_seat(s, winner).name} wins the trick"
    _refresh_counts(s)
    return s


def advance_after_trick(state: MendikotState) -> MendikotState:
    if state.phase != "trick_done":
        return state
    s = state.model_copy(deep=True)
    hands_empty = all(len(s.hands[p.id]) == 0 for p in s.players)
    s.currentTrick = []
    s.leadSuit = None
    if hands_empty:
        s.phase = "hand_over"
        s.result = compute_result(s)
        s.message = s.result.message
        return s
    s.phase = "playing"
    s.leaderSeat = s.lastTrickWinnerSeat
    s.turnSeat = s.lastTrickWinnerSeat
    s.message = f"{player_at_seat(s, s.turnSeat).name} leads"
    return s


def is_won(state: MendikotState) -> bool:
    return state.phase == "hand_over"


def compute_result(s: MendikotState) -> HandResult:
    t_a, t_b = s.tensByTeam
    tr_a, tr_b = s.tricksByTeam
    if tr_a == 13 or tr_b == 13:
        winner = 0 if tr_a == 13 else 1
        kind = "whitewash"
    elif t_a == 4 or t_b == 4:
        winner = 0 if t_a == 4 else 1
        kind = "mendikot"
    elif t_a >= 3 or t_b >= 3:
        winner = 0 if t_a >= 3 else 1
        kind = "tens"
    else:
        winner = 0 if tr_a > tr_b else 1
        kind = "tricks"

    side = "Team A" if winner == 0 else "Team B"
    messages = {
        "mendikot": f"{side} swept all four 10s — Mendikot!",
        "whitewash": f"{side} took all 13 tricks — Whitewash!",
        "tens": f"{side} captured the majority of 10s.",
        "tricks": f"10s split 2-2 — {side} won on tricks.",
    }
    return HandResult(
        winnerTeam=winner,
        kind=kind,
        tens=[t_a, t_b],
        tricks=[tr_a, tr_b],
        message=messages[kind],
    )


def suit_counts(hand: List[Card]) -> dict:
    c = {"S": 0, "H": 0, "D": 0, "C": 0}
    for card in hand:
        c[card.suit] += 1
    return c
