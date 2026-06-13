"""Card deck operations — direct port of src/game/deck.ts."""
from __future__ import annotations

import random
from typing import Dict, List

from .types import Card, RANKS, Rank, SUITS


RANK_VALUE: Dict[Rank, int] = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    "J": 11,
    "Q": 12,
    "K": 13,
    "A": 14,
}


def create_deck() -> List[Card]:
    return [Card(id=f"{r}{s}", suit=s, rank=r) for s in SUITS for r in RANKS]


def shuffle(cards: List[Card]) -> List[Card]:
    """Return a new shuffled copy — never mutate the input."""
    out = list(cards)
    random.shuffle(out)
    return out


def deal(num_players: int, cards_per_player: int) -> List[List[Card]]:
    """Deal one card at a time, round-robin, just like a human dealer."""
    deck = shuffle(create_deck())
    hands: List[List[Card]] = [[] for _ in range(num_players)]
    idx = 0
    for _ in range(cards_per_player):
        for p in range(num_players):
            hands[p].append(deck[idx])
            idx += 1
    return hands


def sort_hand(hand: List[Card]) -> List[Card]:
    """Match the frontend ordering: S, H, C, D — then by rank DESC inside each suit."""
    suit_order: Dict[str, int] = {"S": 0, "H": 1, "C": 2, "D": 3}
    return sorted(
        hand,
        key=lambda c: (suit_order[c.suit], -RANK_VALUE[c.rank]),
    )
