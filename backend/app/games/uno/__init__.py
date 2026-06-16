"""UNO game module.

UNO is the first game with genuinely hidden per-player information (each
player sees only their own hand). PER_PLAYER_VIEW = True tells the server to
broadcast a tailored private_view to each socket instead of one shared
public_view.
"""
from __future__ import annotations

from typing import ClassVar, List, Optional

from .ai import auto_default_action as _auto_default_action
from .ai import bot_action as _bot_action
from .engine import (
    DEFAULT_SETTINGS,
    begin_round,
    call_uno,
    choose_color,
    create_initial_state as _create_initial_state,
    current_expected_player_id as _current_expected_player_id,
    draw_card,
    next_round as _next_round,
    pass_turn,
    play_card,
    turn_token as _turn_token,
)
from .types import UnoGameState, UnoPlayer, UnoSettings

__all__ = ["Engine", "DEFAULT_SETTINGS", "UnoGameState", "UnoSettings", "UnoPlayer"]


class Engine:
    GAME_TYPE: ClassVar[str] = "uno"
    MIN_PLAYERS: ClassVar[int] = 2
    MAX_PLAYERS: ClassVar[int] = 10
    PER_PLAYER_VIEW: ClassVar[bool] = True

    @staticmethod
    def default_settings() -> UnoSettings:
        return DEFAULT_SETTINGS.model_copy()

    @staticmethod
    def create_initial_state(
        players: List[UnoPlayer], settings: UnoSettings
    ) -> UnoGameState:
        return _create_initial_state(players, settings)

    @staticmethod
    def begin_round(state: UnoGameState) -> UnoGameState:
        return state  # initial state already dealt

    @staticmethod
    def apply_action(
        state: UnoGameState, player_id: str, action: dict
    ) -> UnoGameState:
        kind = action.get("type")
        # An action may carry an inline UNO call (bot pre-call).
        if action.get("callUno"):
            state = call_uno(state, player_id)
        if kind == "play":
            return play_card(
                state,
                player_id,
                str(action.get("cardId", "")),
                action.get("color"),
            )
        if kind == "draw":
            return draw_card(state, player_id)
        if kind == "pass":
            return pass_turn(state, player_id)
        if kind == "choose_color":
            return choose_color(state, player_id, action.get("color"))
        if kind == "call_uno":
            return call_uno(state, player_id)
        if kind == "next_round":
            return _next_round(state)
        return state

    @staticmethod
    def auto_advance(state: UnoGameState):
        # UNO has no timed auto-phases; all transitions happen in apply_action.
        return None

    @staticmethod
    def current_expected_player(state: UnoGameState) -> Optional[str]:
        return _current_expected_player_id(state)

    @staticmethod
    def is_terminal(state: UnoGameState) -> bool:
        return state.phase == "game_over"

    @staticmethod
    def turn_token(state: UnoGameState) -> tuple:
        return _turn_token(state)

    @staticmethod
    def auto_default_action(state: UnoGameState, player_id: str) -> Optional[dict]:
        return _auto_default_action(state, player_id)

    @staticmethod
    def bot_action(state: UnoGameState, player_id: str) -> Optional[dict]:
        return _bot_action(state, player_id)

    @staticmethod
    def public_view(state: UnoGameState) -> dict:
        """Spectator view: every hand is hidden (counts only), piles stripped."""
        return Engine._view(state, viewer_id=None)

    @staticmethod
    def private_view(state: UnoGameState, player_id: str) -> dict:
        """Per-player view: the viewer sees their own hand; others are counts."""
        return Engine._view(state, viewer_id=player_id)

    @staticmethod
    def _view(state: UnoGameState, viewer_id: Optional[str]) -> dict:
        data = state.model_dump()
        data["drawPile"] = []  # never leak the draw order
        for pl in data.get("players", []):
            pl["handCount"] = len(pl.get("hand", []))
            if viewer_id is None or pl.get("id") != viewer_id:
                pl["hand"] = []
        return data
