"""UNO bot strategy — used for AI takeover and timeout defaults."""
from __future__ import annotations

from collections import Counter
from typing import Optional

from .engine import current_player, playable
from .types import Color, UnoGameState


def _best_color(player) -> Color:
    """Pick the color the bot holds most of (for wild cards)."""
    counts: Counter = Counter()
    for c in player.hand:
        if c.color in ("red", "yellow", "green", "blue"):
            counts[c.color] += 1
    if counts:
        return counts.most_common(1)[0][0]
    return "red"


def bot_action(state: UnoGameState, player_id: str) -> Optional[dict]:
    if state.phase == "choosing_color":
        chooser = (
            state.players[state.colorChooserIndex]
            if 0 <= state.colorChooserIndex < len(state.players)
            else None
        )
        if chooser is None or chooser.id != player_id:
            return None
        return {"type": "choose_color", "color": _best_color(chooser)}

    if state.phase != "playing":
        return None
    p = current_player(state)
    if p is None or p.id != player_id:
        return None

    playables = [
        c for c in p.hand if playable(c, state.discardTop, state.currentColor)
    ]

    # If the bot just drew a playable card, the only options are that card or pass.
    if state.drawnPlayableId is not None:
        drawn = next((c for c in p.hand if c.id == state.drawnPlayableId), None)
        if drawn is not None:
            return _play(state, p, drawn)
        return {"type": "pass"}

    if not playables:
        return {"type": "draw"}

    # Strategy: prefer dumping action cards / high numbers; save wilds for last.
    def priority(c) -> int:
        if c.kind in ("draw2", "wild4"):
            return 5
        if c.kind in ("skip", "reverse"):
            return 4
        if c.kind == "number":
            return 1 + (c.value or 0) / 10
        if c.kind == "wild":
            return 0  # play wild only when nothing better
        return 2

    # Keep wilds in reserve if a coloured option exists.
    coloured = [c for c in playables if c.kind not in ("wild", "wild4")]
    pool = coloured if coloured else playables
    best = max(pool, key=priority)
    return _play(state, p, best)


def _play(state: UnoGameState, p, card) -> dict:
    action = {"type": "play", "cardId": card.id}
    if card.kind in ("wild", "wild4"):
        action["color"] = _best_color(p)
    # Pre-call UNO when this play will leave one card.
    if len(p.hand) == 2:
        action["callUno"] = True
    return action


def auto_default_action(
    state: UnoGameState, player_id: str
) -> Optional[dict]:
    """Timeout fallback for a human: play if forced/obvious, else draw/pass."""
    if state.phase == "choosing_color":
        chooser = (
            state.players[state.colorChooserIndex]
            if 0 <= state.colorChooserIndex < len(state.players)
            else None
        )
        if chooser and chooser.id == player_id:
            return {"type": "choose_color", "color": _best_color(chooser)}
        return None
    if state.phase != "playing":
        return None
    p = current_player(state)
    if p is None or p.id != player_id:
        return None
    if state.drawnPlayableId is not None:
        return {"type": "pass"}
    # Safest default: draw a card (keeps the game moving without dumping
    # a card the human might have wanted to keep).
    return {"type": "draw"}
