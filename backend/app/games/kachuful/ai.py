"""Bot heuristics — direct port of src/game/ai.ts.

Used both for AI takeover of disconnected players and (potentially) for
single-player vs AI rooms.
"""
from __future__ import annotations

import random
from dataclasses import dataclass
from typing import List, Optional

from .deck import RANK_VALUE
from .rules import legal_cards
from .types import Card, PlayedCard, Suit


def bot_bid(
    hand: List[Card],
    trump: Optional[Suit],
    cards_per_player: int,
    forbidden: Optional[int],
) -> int:
    expected = 0.0
    for c in hand:
        if trump and c.suit == trump:
            rv = RANK_VALUE[c.rank]
            if rv >= 12:
                expected += 0.85
            elif rv >= 9:
                expected += 0.55
            else:
                expected += 0.25
        else:
            rv = RANK_VALUE[c.rank]
            if rv == 14:
                expected += 0.70
            elif rv == 13:
                expected += 0.45
            elif rv == 12:
                expected += 0.25
    bid = max(0, min(cards_per_player, round(expected)))
    if forbidden is not None and bid == forbidden:
        if bid == 0:
            bid = 1
        elif bid == cards_per_player:
            bid = cards_per_player - 1
        else:
            bid = bid - 1 if random.random() < 0.5 else bid + 1
    return bid


@dataclass
class BotPlayContext:
    hand: List[Card]
    lead_suit: Optional[Suit]
    trump: Optional[Suit]
    trick: List[PlayedCard]
    bid: int
    tricks_won: int
    cards_left: int


def bot_play(ctx: BotPlayContext) -> Card:
    legal = legal_cards(ctx.hand, ctx.lead_suit)
    if len(legal) == 1:
        return legal[0]

    tricks_remaining = ctx.cards_left
    need = max(0, ctx.bid - ctx.tricks_won)
    want_win = need > 0 and (
        need >= tricks_remaining or random.random() < need / tricks_remaining
    )

    sorted_asc = sorted(legal, key=lambda c: RANK_VALUE[c.rank])

    is_leader = len(ctx.trick) == 0
    if is_leader:
        if want_win:
            trump_high = [c for c in sorted_asc if ctx.trump and c.suit == ctx.trump]
            if trump_high:
                return trump_high[-1]
            return sorted_asc[-1]
        return sorted_asc[0]

    # Compute who's currently winning the trick
    trumps_in_trick = [p for p in ctx.trick if ctx.trump and p.card.suit == ctx.trump]
    if trumps_in_trick:
        current_best = trumps_in_trick[0]
        for p in trumps_in_trick[1:]:
            if RANK_VALUE[p.card.rank] > RANK_VALUE[current_best.card.rank]:
                current_best = p
    else:
        in_suit = [p for p in ctx.trick if p.card.suit == ctx.lead_suit]
        current_best = in_suit[0]
        for p in in_suit[1:]:
            if RANK_VALUE[p.card.rank] > RANK_VALUE[current_best.card.rank]:
                current_best = p

    is_trump_in_play = any(
        ctx.trump and p.card.suit == ctx.trump for p in ctx.trick
    )

    def beats(c: Card) -> bool:
        if ctx.trump and c.suit == ctx.trump and current_best.card.suit != ctx.trump:
            return True
        if c.suit == current_best.card.suit:
            return RANK_VALUE[c.rank] > RANK_VALUE[current_best.card.rank]
        if is_trump_in_play:
            return False
        return False

    if want_win:
        winners = [c for c in sorted_asc if beats(c)]
        if winners:
            return winners[0]
        return sorted_asc[0]
    losers = [c for c in sorted_asc if not beats(c)]
    if losers:
        return losers[-1]
    return sorted_asc[0]
