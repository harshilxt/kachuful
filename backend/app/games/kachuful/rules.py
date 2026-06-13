"""Game rules — direct port of src/game/rules.ts."""
from __future__ import annotations

from typing import List, Optional

from .deck import RANK_VALUE
from .types import Card, PlayedCard, Suit


def legal_cards(hand: List[Card], lead_suit: Optional[Suit]) -> List[Card]:
    """If you can follow the led suit, you must. Otherwise, anything goes."""
    if lead_suit is None:
        return list(hand)
    in_suit = [c for c in hand if c.suit == lead_suit]
    return in_suit if in_suit else list(hand)


def trick_winner(
    trick: List[PlayedCard],
    trump: Optional[Suit],
    lead_suit: Suit,
) -> PlayedCard:
    """Highest trump wins; else highest card of the led suit."""
    trumps_played = [p for p in trick if trump and p.card.suit == trump]
    if trumps_played:
        best = trumps_played[0]
        for p in trumps_played[1:]:
            if RANK_VALUE[p.card.rank] > RANK_VALUE[best.card.rank]:
                best = p
        return best
    in_suit = [p for p in trick if p.card.suit == lead_suit]
    best = in_suit[0]
    for p in in_suit[1:]:
        if RANK_VALUE[p.card.rank] > RANK_VALUE[best.card.rank]:
            best = p
    return best


def score_round(bid: int, tricks: int) -> int:
    """Standard Kachu Ful scoring — exact match: 10 + bid. Miss: 0."""
    return 10 + bid if bid == tricks else 0


def dealer_forbidden_bid(
    cards_per_player: int, bids_so_far: List[int]
) -> Optional[int]:
    """The dealer's bid must NOT make the totals equal the cards in play.

    Returns the single bid the dealer is not allowed to pick, or None
    if no such bid exists (already impossible).
    """
    total = sum(bids_so_far)
    forbidden = cards_per_player - total
    if forbidden < 0 or forbidden > cards_per_player:
        return None
    return forbidden


def generate_round_pattern(
    num_players: int, max_cards_cap: int = 8
) -> List[int]:
    """Round pattern: 1, 2, ..., peak, peak-1, ..., 1.

    Peak is capped at min(max_cards_cap, floor(52 / num_players)).
    """
    physical_max = 52 // num_players
    peak = min(max_cards_cap, physical_max)
    if peak <= 0:
        return [1]
    up = list(range(1, peak + 1))
    down = list(range(peak - 1, 0, -1))
    return up + down


# Kachu Ful trump rotation: Spades -> Diamonds -> Clubs -> Hearts -> repeat.
TRUMP_CYCLE: List[Suit] = ["S", "D", "C", "H"]
TRUMP_CYCLE_WITH_NT: List[Optional[Suit]] = ["S", "D", "C", "H", None]


def trump_for_round(round_index: int, use_no_trump: bool) -> Optional[Suit]:
    cycle = TRUMP_CYCLE_WITH_NT if use_no_trump else TRUMP_CYCLE
    return cycle[round_index % len(cycle)]
