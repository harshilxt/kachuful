"""UNO state machine — pure functions, server-authoritative.

Turn-based: each action is applied synchronously and the turn advances with
all action-card effects resolved. The drive loop in main.py only needs to
play for bots and enforce timeouts; there are no timed auto-phases.
"""
from __future__ import annotations

from typing import List, Optional, Tuple

from .deck import build_deck, shuffle
from .types import (
    Card,
    Color,
    LastEvent,
    UnoGameState,
    UnoPlayer,
    UnoSettings,
    card_score,
)

DEFAULT_SETTINGS = UnoSettings()


# ---------- helpers ----------


def _event(state: UnoGameState, kind: str, **kw) -> None:
    state.lastEvent = LastEvent(
        kind=kind, seq=state.lastEvent.seq + 1, **kw
    )


def _sync_counts(state: UnoGameState) -> UnoGameState:
    for p in state.players:
        p.handCount = len(p.hand)
    state.drawCount = len(state.drawPile)
    return state


def _draw_one(state: UnoGameState) -> Optional[Card]:
    """Pop a card, reshuffling the discard (minus the top) back in if empty."""
    if not state.drawPile:
        # Reshuffle: the discard top stays in play, the rest become a new
        # shuffled draw pile. We don't keep the full discard list, so rebuild
        # a fresh deck minus cards currently in hands + the top card.
        in_play = {state.discardTop.id} if state.discardTop else set()
        for p in state.players:
            for c in p.hand:
                in_play.add(c.id)
        fresh = [c for c in build_deck() if c.id not in in_play]
        state.drawPile = shuffle(fresh)
    if not state.drawPile:
        return None
    return state.drawPile.pop()


def _deal_to(state: UnoGameState, player: UnoPlayer, n: int) -> None:
    for _ in range(n):
        c = _draw_one(state)
        if c is not None:
            player.hand.append(c)


def playable(card: Card, top: Optional[Card], current_color: Color) -> bool:
    if card.kind in ("wild", "wild4"):
        return True
    if top is None:
        return True
    if card.color == current_color:
        return True
    if card.kind == "number" and top.kind == "number" and card.value == top.value:
        return True
    if card.kind != "number" and card.kind == top.kind:
        return True
    return False


def _alive_count(state: UnoGameState) -> int:
    return sum(1 for p in state.players if p.finishedRank == 0)


# ---------- lifecycle ----------


def create_initial_state(
    players: List[UnoPlayer], settings: Optional[UnoSettings] = None
) -> UnoGameState:
    settings = (settings or DEFAULT_SETTINGS).model_copy()
    uno_players = [
        UnoPlayer(
            id=p.id, name=p.name, isBot=p.isBot, avatar=p.avatar, seat=p.seat,
            score=0,
        )
        for p in players
    ]
    state = UnoGameState(
        phase="dealing",
        players=uno_players,
        settings=settings,
        round=1,
        currentPlayerIndex=0,
        direction=1,
    )
    return begin_round(state)


def begin_round(state: UnoGameState) -> UnoGameState:
    deck = shuffle(build_deck())
    state.drawPile = deck
    state.discardTop = None
    state.discardCount = 0
    state.direction = 1
    state.colorChooserIndex = -1
    state.drawnPlayableId = None
    state.winnerId = None
    for p in state.players:
        p.hand = []
        p.calledUno = False
        p.netLastRound = 0
        p.finishedRank = 0

    for p in state.players:
        _deal_to(state, p, state.settings.startingHand)

    # Flip the starting card — keep flipping until it's a plain number card to
    # avoid first-turn action-card edge cases (common in digital UNO).
    start: Optional[Card] = None
    while True:
        c = _draw_one(state)
        if c is None:
            break
        if c.kind == "number":
            start = c
            break
        # put non-number cards to the bottom and try again
        state.drawPile.insert(0, c)
    state.discardTop = start
    state.discardCount = 1
    state.currentColor = start.color if start else "wild"

    state.phase = "playing"
    state.currentPlayerIndex = 0
    _event(state, "deal")
    state.message = f"{state.players[0].name}'s turn"
    return _sync_counts(state)


# ---------- turn flow ----------


def _advance_index(state: UnoGameState, steps: int = 1) -> int:
    n = len(state.players)
    idx = state.currentPlayerIndex
    moved = 0
    # step across only players who are still in the round
    while moved < steps:
        idx = (idx + state.direction) % n
        if state.players[idx].finishedRank == 0:
            moved += 1
    return idx


def _next_player(state: UnoGameState) -> None:
    state.currentPlayerIndex = _advance_index(state, 1)
    state.players  # noqa
    state.message = f"{state.players[state.currentPlayerIndex].name}'s turn"


def current_player(state: UnoGameState) -> Optional[UnoPlayer]:
    if 0 <= state.currentPlayerIndex < len(state.players):
        return state.players[state.currentPlayerIndex]
    return None


# ---------- actions ----------


def play_card(
    state: UnoGameState,
    player_id: str,
    card_id: str,
    chosen_color: Optional[Color] = None,
) -> UnoGameState:
    if state.phase != "playing":
        return state
    p = current_player(state)
    if p is None or p.id != player_id:
        return state
    card = next((c for c in p.hand if c.id == card_id), None)
    if card is None:
        return state
    if not playable(card, state.discardTop, state.currentColor):
        return state

    # Remove from hand, place on discard.
    p.hand = [c for c in p.hand if c.id != card_id]
    state.discardTop = card
    state.discardCount += 1
    state.drawnPlayableId = None

    # UNO penalty: dropped to exactly 1 card without calling UNO.
    if len(p.hand) == 1 and not p.calledUno:
        _deal_to(state, p, 2)
        _event(state, "forgot_uno", playerId=p.id)
    # Reset the called flag once they're no longer at risk.
    if len(p.hand) != 1:
        p.calledUno = False

    # Round / out check.
    if len(p.hand) == 0:
        return _player_finished(state, p, card)

    # Wild cards: enter color-choice for this same player.
    if card.kind in ("wild", "wild4"):
        if chosen_color in ("red", "yellow", "green", "blue"):
            state.currentColor = chosen_color  # type: ignore[assignment]
            return _resolve_played_card(state, card, p.id)
        state.phase = "choosing_color"
        state.colorChooserIndex = state.currentPlayerIndex
        _event(state, "play", byId=p.id)
        state.message = f"{p.name} is choosing a color"
        return _sync_counts(state)

    # Coloured card.
    state.currentColor = card.color
    return _resolve_played_card(state, card, p.id)


def choose_color(
    state: UnoGameState, player_id: str, color: Color
) -> UnoGameState:
    if state.phase != "choosing_color":
        return state
    if not (0 <= state.colorChooserIndex < len(state.players)):
        return state
    chooser = state.players[state.colorChooserIndex]
    if chooser.id != player_id:
        return state
    if color not in ("red", "yellow", "green", "blue"):
        return state
    state.currentColor = color
    state.phase = "playing"
    top = state.discardTop
    state.colorChooserIndex = -1
    return _resolve_played_card(state, top, player_id)


def _resolve_played_card(
    state: UnoGameState, card: Optional[Card], by_id: Optional[str] = None
) -> UnoGameState:
    """Apply the action effect of the just-played card and advance the turn."""
    if card is None:
        _next_player(state)
        return _sync_counts(state)

    two_player = _alive_count(state) == 2

    if card.kind == "skip":
        skipped_idx = _advance_index(state, 1)
        skipped = state.players[skipped_idx]
        _event(state, "skip", byId=by_id, playerId=skipped.id)
        state.currentPlayerIndex = _advance_index(state, 2)
        state.message = f"{state.players[state.currentPlayerIndex].name}'s turn"

    elif card.kind == "reverse":
        if two_player:
            # Reverse acts as a skip in 2-player — same player goes again.
            other_idx = _advance_index(state, 1)
            _event(state, "reverse", byId=by_id, playerId=state.players[other_idx].id)
            state.message = f"{state.players[state.currentPlayerIndex].name}'s turn"
        else:
            state.direction *= -1
            _event(state, "reverse", byId=by_id)
            _next_player(state)

    elif card.kind == "draw2":
        victim_idx = _advance_index(state, 1)
        victim = state.players[victim_idx]
        _deal_to(state, victim, 2)
        _event(state, "draw2", byId=by_id, playerId=victim.id, count=2)
        # victim is skipped
        state.currentPlayerIndex = _advance_index(state, 2)
        state.message = f"{state.players[state.currentPlayerIndex].name}'s turn"

    elif card.kind == "wild4":
        victim_idx = _advance_index(state, 1)
        victim = state.players[victim_idx]
        _deal_to(state, victim, 4)
        _event(
            state, "wild4", byId=by_id, playerId=victim.id, count=4,
            color=state.currentColor,
        )
        state.currentPlayerIndex = _advance_index(state, 2)
        state.message = f"{state.players[state.currentPlayerIndex].name}'s turn"

    elif card.kind == "wild":
        _event(state, "wild", byId=by_id, color=state.currentColor)
        _next_player(state)

    else:  # number
        _event(state, "play", byId=by_id)
        _next_player(state)

    return _sync_counts(state)


def draw_card(state: UnoGameState, player_id: str) -> UnoGameState:
    if state.phase != "playing":
        return state
    p = current_player(state)
    if p is None or p.id != player_id:
        return state
    if state.drawnPlayableId is not None:
        return state  # already drew this turn
    c = _draw_one(state)
    if c is None:
        # No cards anywhere — just pass.
        _next_player(state)
        return _sync_counts(state)
    p.hand.append(c)
    p.calledUno = False
    _event(state, "draw", playerId=p.id, count=1)
    if playable(c, state.discardTop, state.currentColor):
        # Player may play the drawn card or pass.
        state.drawnPlayableId = c.id
        state.message = f"{p.name} drew a playable card"
        return _sync_counts(state)
    # Not playable → turn passes automatically.
    _next_player(state)
    return _sync_counts(state)


def pass_turn(state: UnoGameState, player_id: str) -> UnoGameState:
    """After drawing a playable card, choose not to play it."""
    if state.phase != "playing":
        return state
    p = current_player(state)
    if p is None or p.id != player_id:
        return state
    if state.drawnPlayableId is None:
        return state  # can only pass right after a draw
    state.drawnPlayableId = None
    _next_player(state)
    return _sync_counts(state)


def call_uno(state: UnoGameState, player_id: str) -> UnoGameState:
    """Flag that this player has called UNO. Valid when they hold 2 cards
    on their own turn (about to play to 1), or just dropped to 1 this turn."""
    p = next((x for x in state.players if x.id == player_id), None)
    if p is None:
        return state
    if len(p.hand) <= 2:
        p.calledUno = True
        _event(state, "uno", playerId=player_id)
        state.message = f"{p.name} shouted UNO!"
    return _sync_counts(state)


# ---------- round / game end ----------


def _player_finished(
    state: UnoGameState, p: UnoPlayer, card: Card
) -> UnoGameState:
    p.finishedRank = 1
    state.winnerId = p.id
    _event(state, "play", playerId=p.id)
    # Round points: winner gains the sum of everyone else's leftover cards.
    gained = 0
    for other in state.players:
        if other.id == p.id:
            continue
        s = sum(card_score(c) for c in other.hand)
        other.netLastRound = -s
        gained += s
    p.netLastRound = gained
    p.score += gained
    state.phase = "round_over"
    state.colorChooserIndex = -1
    state.drawnPlayableId = None
    state.message = f"{p.name} wins the round (+{gained})"

    if p.score >= state.settings.targetScore:
        state.phase = "game_over"
        state.message = f"{p.name} wins the game!"
    return _sync_counts(state)


def next_round(state: UnoGameState) -> UnoGameState:
    if state.phase != "round_over":
        return state
    state.round += 1
    # Dealer/start rotates by round for fairness.
    return begin_round(state)


# ---------- queries ----------


def current_expected_player_id(state: UnoGameState) -> Optional[str]:
    if state.phase == "playing":
        p = current_player(state)
        return p.id if p else None
    if state.phase == "choosing_color":
        if 0 <= state.colorChooserIndex < len(state.players):
            return state.players[state.colorChooserIndex].id
    return None


def turn_token(state: UnoGameState) -> tuple:
    """Stable token identifying the current waiting point (for timers)."""
    return (
        state.round,
        state.phase,
        state.currentPlayerIndex,
        state.colorChooserIndex,
        state.discardCount,
        state.drawnPlayableId or "",
        current_expected_player_id(state) or "",
    )
