"""Mendikot game module (online multiplayer).

Plugs into the generic realtime loop (like UNO/Blackjack). PER_PLAYER_VIEW is
True because each player sees only their own hand, and the trump is hidden
from everyone except the chooser until it is revealed.
"""
from __future__ import annotations

from typing import ClassVar, List, Optional

from .ai import auto_default_action as _auto_default_action
from .ai import bot_action as _bot_action
from .engine import (
    advance_after_trick,
    choose_trump,
    create_initial_state as _create_initial_state,
    current_expected_player_id as _current_expected_player_id,
    play_card,
    player_at_seat,
    turn_token as _turn_token,
)
from .types import MendikotSettings, MendikotState, MPlayer

DEFAULT_SETTINGS = MendikotSettings()

__all__ = ["Engine", "DEFAULT_SETTINGS", "MendikotState", "MendikotSettings", "MPlayer"]

# How long the finished trick stays on the table before it's swept (ms).
# Long enough for the client to show all four cards, then animate the gather.
_TRICK_PAUSE_MS = 1500


class Engine:
    GAME_TYPE: ClassVar[str] = "mendikot"
    MIN_PLAYERS: ClassVar[int] = 1
    MAX_PLAYERS: ClassVar[int] = 4
    PER_PLAYER_VIEW: ClassVar[bool] = True

    @staticmethod
    def default_settings() -> MendikotSettings:
        return DEFAULT_SETTINGS.model_copy()

    @staticmethod
    def create_initial_state(
        players: List[MPlayer], settings: MendikotSettings
    ) -> MendikotState:
        return _create_initial_state(players, settings)

    @staticmethod
    def begin_round(state: MendikotState) -> MendikotState:
        return state  # already dealt

    @staticmethod
    def apply_action(
        state: MendikotState, player_id: str, action: dict
    ) -> MendikotState:
        kind = action.get("type")
        if kind == "chooseTrump":
            # only the chooser may set trump
            if player_at_seat(state, state.chooserSeat).id != player_id:
                return state
            suit = action.get("suit")
            if suit not in ("S", "H", "D", "C"):
                return state
            return choose_trump(state, suit)
        if kind == "play":
            if player_at_seat(state, state.turnSeat).id != player_id:
                return state
            return play_card(state, str(action.get("cardId", "")))
        return state

    @staticmethod
    def auto_advance(state: MendikotState):
        if state.phase == "trick_done":
            return advance_after_trick(state), _TRICK_PAUSE_MS
        return None

    @staticmethod
    def current_expected_player(state: MendikotState) -> Optional[str]:
        return _current_expected_player_id(state)

    @staticmethod
    def is_terminal(state: MendikotState) -> bool:
        return state.phase == "hand_over"

    @staticmethod
    def turn_token(state: MendikotState) -> tuple:
        return _turn_token(state)

    @staticmethod
    def auto_default_action(
        state: MendikotState, player_id: str
    ) -> Optional[dict]:
        return _auto_default_action(state, player_id)

    @staticmethod
    def bot_action(state: MendikotState, player_id: str) -> Optional[dict]:
        return _bot_action(state, player_id)

    @staticmethod
    def public_view(state: MendikotState) -> dict:
        return Engine._view(state, viewer_id=None)

    @staticmethod
    def private_view(state: MendikotState, player_id: str) -> dict:
        return Engine._view(state, viewer_id=player_id)

    @staticmethod
    def _view(state: MendikotState, viewer_id: Optional[str]) -> dict:
        data = state.model_dump()
        # counts for everyone
        data["handCounts"] = {
            pid: len(cards) for pid, cards in state.hands.items()
        }
        # hide every hand except the viewer's
        hidden = {}
        for pid, cards in data.get("hands", {}).items():
            hidden[pid] = cards if (viewer_id is not None and pid == viewer_id) else []
        data["hands"] = hidden
        # hide trump unless revealed or the viewer is the chooser
        viewer_seat = None
        if viewer_id is not None:
            vp = next((p for p in state.players if p.id == viewer_id), None)
            viewer_seat = vp.seat if vp else None
        if not state.trumpRevealed and viewer_seat != state.chooserSeat:
            data["trump"] = None
        return data
