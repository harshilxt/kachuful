"""Shoe building, shuffling, and hand-value math for Blackjack."""
from __future__ import annotations

import random
from typing import List, Tuple

from .types import Card, Rank, Suit

SUITS: List[Suit] = ["S", "H", "D", "C"]
RANKS: List[Rank] = [
    "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"
]


def build_shoe(num_decks: int) -> List[Card]:
    """A freshly shuffled shoe of ``num_decks`` standard decks.

    Card ids are made unique with a deck index suffix so duplicate ranks
    across decks don't collide (React keys, server lookups).
    """
    shoe: List[Card] = []
    for d in range(num_decks):
        for s in SUITS:
            for r in RANKS:
                shoe.append(Card(id=f"{r}{s}_{d}", suit=s, rank=r))
    random.shuffle(shoe)
    return shoe


def card_points(rank: Rank) -> int:
    if rank in ("J", "Q", "K", "10"):
        return 10
    if rank == "A":
        return 11  # adjusted down in hand_value when needed
    return int(rank)


def hand_value(cards: List[Card]) -> Tuple[int, bool]:
    """Return (best_total, is_soft).

    Aces count as 11 unless that would bust, then drop to 1. ``is_soft`` is
    True when at least one ace is still counted as 11 in the returned total.
    """
    total = 0
    aces = 0
    for c in cards:
        if c.rank == "A":
            aces += 1
            total += 11
        else:
            total += card_points(c.rank)
    while total > 21 and aces > 0:
        total -= 10
        aces -= 1
    soft = aces > 0
    return total, soft


def is_blackjack(cards: List[Card]) -> bool:
    """Natural 21: exactly two cards totalling 21."""
    if len(cards) != 2:
        return False
    total, _ = hand_value(cards)
    return total == 21


def is_bust(cards: List[Card]) -> bool:
    total, _ = hand_value(cards)
    return total > 21
