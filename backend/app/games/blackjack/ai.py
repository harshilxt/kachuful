"""Bot decisions for Blackjack — used for AI takeover of disconnected
players and for timeout defaults. Uses a simplified basic-strategy heuristic
(no card counting; good enough to play sensibly)."""
from __future__ import annotations

from typing import Optional

from .deck import card_points, hand_value
from .types import BjGameState


def _dealer_upcard_points(state: BjGameState) -> int:
    if not state.dealer.cards:
        return 0
    return card_points(state.dealer.cards[0].rank)


def bot_bet(state: BjGameState, player_id: str) -> int:
    """Flat bet of the table minimum (simple, never goes broke fast)."""
    p = next((x for x in state.players if x.id == player_id), None)
    if p is None:
        return state.settings.minBet
    return min(state.settings.minBet, p.chips)


def bot_action(state: BjGameState, player_id: str) -> Optional[dict]:
    """Return the action dict the bot wants for the current phase."""
    if state.phase == "betting":
        return {"type": "bet", "amount": bot_bet(state, player_id)}

    if state.phase == "player_turns":
        p = next((x for x in state.players if x.id == player_id), None)
        if p is None or not (0 <= state.activeHandIndex < len(p.hands)):
            return None
        hand = p.hands[state.activeHandIndex]
        if hand.status != "active":
            return None
        total, soft = hand_value(hand.cards)
        up = _dealer_upcard_points(state)

        # Split pairs of Aces or 8s (classic basic strategy).
        if (
            len(p.hands) == 1
            and len(hand.cards) == 2
            and hand.cards[0].rank == hand.cards[1].rank
            and p.chips >= hand.bet
        ):
            r = hand.cards[0].rank
            if r in ("A", "8"):
                return {"type": "split"}

        # Double on hard 10 or 11 vs weaker dealer upcard, with two cards.
        if (
            len(hand.cards) == 2
            and not soft
            and total in (10, 11)
            and up < total
            and p.chips >= hand.bet
        ):
            return {"type": "double"}

        if soft:
            # Soft hands: hit until soft 18+.
            if total >= 18:
                return {"type": "stand"}
            return {"type": "hit"}

        # Hard totals: stand 17+. 12-16 stand vs weak dealer (2-6), else hit.
        if total >= 17:
            return {"type": "stand"}
        if 12 <= total <= 16 and 2 <= up <= 6:
            return {"type": "stand"}
        return {"type": "hit"}

    return None


def auto_default_action(
    state: BjGameState, player_id: str
) -> Optional[dict]:
    """Safe fallback when a human's turn timer expires."""
    if state.phase == "betting":
        return {"type": "bet", "amount": bot_bet(state, player_id)}
    if state.phase == "player_turns":
        return {"type": "stand"}
    return None
