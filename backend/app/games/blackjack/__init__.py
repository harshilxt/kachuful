"""Blackjack game module.

The ``Engine`` class adapts the pure-function modules to the GameEngine
interface in ``app/games/base.py``. Notably ``public_view`` hides the
dealer's hole card (and strips the shoe) until the dealer's turn — this is
the first game where server-side view filtering does real work.
"""
from __future__ import annotations

from typing import ClassVar, List, Optional

from .ai import auto_default_action as _auto_default_action
from .ai import bot_action as _bot_action
from .engine import (
    DEFAULT_SETTINGS,
    auto_advance as _auto_advance,
    create_initial_state as _create_initial_state,
    current_expected_player_id as _current_expected_player_id,
    double_down,
    hit,
    next_round as _next_round,
    place_bet,
    split,
    stand,
)
from .types import BjGameState, BjSettings, BjPlayer

__all__ = [
    "Engine",
    "DEFAULT_SETTINGS",
    "BjGameState",
    "BjSettings",
    "BjPlayer",
]


class Engine:
    GAME_TYPE: ClassVar[str] = "blackjack"
    MIN_PLAYERS: ClassVar[int] = 1  # you can play solo against the dealer
    MAX_PLAYERS: ClassVar[int] = 7  # standard table size

    @staticmethod
    def default_settings() -> BjSettings:
        return DEFAULT_SETTINGS.model_copy()

    @staticmethod
    def create_initial_state(
        players: List[BjPlayer], settings: BjSettings
    ) -> BjGameState:
        return _create_initial_state(players, settings)

    @staticmethod
    def begin_round(state: BjGameState) -> BjGameState:
        # Initial state is already in the betting phase.
        return state

    @staticmethod
    def apply_action(
        state: BjGameState, player_id: str, action: dict
    ) -> BjGameState:
        kind = action.get("type")
        if kind == "bet":
            return place_bet(state, player_id, int(action.get("amount", 0)))
        if kind == "hit":
            return hit(state, player_id)
        if kind == "stand":
            return stand(state, player_id)
        if kind == "double":
            return double_down(state, player_id)
        if kind == "split":
            return split(state, player_id)
        if kind == "next_round":
            return _next_round(state)
        return state

    @staticmethod
    def auto_advance(state: BjGameState):
        return _auto_advance(state)

    @staticmethod
    def current_expected_player(state: BjGameState) -> Optional[str]:
        return _current_expected_player_id(state)

    @staticmethod
    def is_terminal(state: BjGameState) -> bool:
        return state.phase == "game_over"

    @staticmethod
    def auto_default_action(
        state: BjGameState, player_id: str
    ) -> Optional[dict]:
        return _auto_default_action(state, player_id)

    @staticmethod
    def bot_action(state: BjGameState, player_id: str) -> Optional[dict]:
        return _bot_action(state, player_id)

    @staticmethod
    def public_view(state: BjGameState) -> dict:
        data = state.model_dump()
        # Never ship the shoe to clients.
        data["shoe"] = []
        # Hide the dealer's hole card while it should stay face-down.
        dealer = data.get("dealer", {})
        if dealer.get("holeHidden") and len(dealer.get("cards", [])) >= 2:
            visible = dealer["cards"][:1]
            hidden_count = len(dealer["cards"]) - 1
            dealer["cards"] = visible
            dealer["hiddenCount"] = hidden_count
            # Value/soft would leak the hole card — blank them while hidden.
            dealer["value"] = 0
            dealer["soft"] = False
        else:
            dealer["hiddenCount"] = 0
        data["dealer"] = dealer
        return data

    @staticmethod
    def private_view(state: BjGameState, player_id: str) -> dict:
        # All player hands are face-up in standard blackjack; the only
        # hidden info (dealer hole card) is hidden from everyone equally.
        return Engine.public_view(state)
