"""UNO 108-card deck construction + shuffling."""
from __future__ import annotations

import random
from typing import List

from .types import Card, Color

COLORS: List[Color] = ["red", "yellow", "green", "blue"]


def build_deck() -> List[Card]:
    """A standard 108-card UNO deck.

    Per color: one 0, two each of 1-9, two each Skip/Reverse/Draw2.
    Plus 4 Wild and 4 Wild Draw Four.
    """
    cards: List[Card] = []
    n = 0

    def add(color: Color, kind: str, value=None) -> None:
        nonlocal n
        cards.append(Card(id=f"{color}-{kind}-{value}-{n}", color=color, kind=kind, value=value))  # type: ignore[arg-type]
        n += 1

    for color in COLORS:
        add(color, "number", 0)
        for v in range(1, 10):
            add(color, "number", v)
            add(color, "number", v)
        for kind in ("skip", "reverse", "draw2"):
            add(color, kind)
            add(color, kind)

    for _ in range(4):
        add("wild", "wild")
    for _ in range(4):
        add("wild", "wild4")

    return cards


def shuffle(cards: List[Card]) -> List[Card]:
    out = list(cards)
    random.shuffle(out)
    return out
