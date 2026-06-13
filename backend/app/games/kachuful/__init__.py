"""Kachu Ful game module.

The ``Engine`` class adapts the existing pure-function modules
(``engine.py``, ``rules.py``, ``ai.py``, ``deck.py``) to the
``GameEngine`` interface defined in ``app/games/base.py`` so the rest of
the server doesn't have to know Kachu-Ful specifics.
"""
from __future__ import annotations

from typing import ClassVar, List, Optional

from .ai import BotPlayContext, bot_bid, bot_play
from .deck import RANK_VALUE
from .engine import (
    DEFAULT_SETTINGS,
    create_initial_state,
    current_expected_player_id,
    get_forbidden_dealer_bid,
    next_round_or_end,
    place_bid,
    play_card,
    resolve_trick,
    start_round,
)
from .rules import legal_cards
from .types import Card, GameSettings, GameState, Player


__all__ = [
    "Engine",
    # Re-exported for callers that need direct access to the pure functions
    "DEFAULT_SETTINGS",
    "create_initial_state",
    "current_expected_player_id",
    "get_forbidden_dealer_bid",
    "next_round_or_end",
    "place_bid",
    "play_card",
    "resolve_trick",
    "start_round",
    "bot_bid",
    "bot_play",
    "BotPlayContext",
    "legal_cards",
    "RANK_VALUE",
    "Card",
    "GameSettings",
    "GameState",
    "Player",
]


class Engine:
    """Kachu Ful implementation of the GameEngine interface.

    Kept lightweight because main.py and the watchdog still call the
    individual pure functions directly for performance and clarity. This
    class is primarily here so future games can be added without changing
    rooms.py — each game just exposes its own ``Engine`` class.
    """

    GAME_TYPE: ClassVar[str] = "kachuful"
    MIN_PLAYERS: ClassVar[int] = 2
    MAX_PLAYERS: ClassVar[int] = 26

    @staticmethod
    def default_settings() -> GameSettings:
        return DEFAULT_SETTINGS.model_copy()

    @staticmethod
    def create_initial_state(
        players: List[Player], settings: GameSettings
    ) -> GameState:
        return create_initial_state(players, settings)

    @staticmethod
    def begin_round(state: GameState) -> GameState:
        return start_round(state)

    @staticmethod
    def apply_action(
        state: GameState, player_id: str, action: dict
    ) -> GameState:
        kind = action.get("type")
        if kind == "bid":
            return place_bid(state, player_id, int(action.get("bid", 0)))
        if kind == "play":
            try:
                card = Card.model_validate(action.get("card"))
            except Exception:
                return state
            return play_card(state, player_id, card)
        if kind == "resolve_trick":
            return resolve_trick(state)
        if kind == "next_round":
            return next_round_or_end(state)
        return state

    @staticmethod
    def current_expected_player(state: GameState) -> Optional[str]:
        return current_expected_player_id(state)

    @staticmethod
    def is_terminal(state: GameState) -> bool:
        return state.phase == "game_over"

    @staticmethod
    def auto_default_action(
        state: GameState, player_id: str
    ) -> Optional[dict]:
        if state.phase == "bidding":
            is_dealer = state.players[state.dealerIndex].id == player_id
            forbidden = (
                get_forbidden_dealer_bid(state) if is_dealer else None
            )
            fallback = 1 if forbidden == 0 else 0
            return {"type": "bid", "bid": fallback}
        if state.phase == "playing":
            hand = state.hands.get(player_id, [])
            legal = legal_cards(hand, state.leadSuit)
            if not legal:
                return None
            lowest = sorted(
                legal, key=lambda c: RANK_VALUE[c.rank]
            )[0]
            return {"type": "play", "card": lowest.model_dump()}
        return None

    @staticmethod
    def bot_action(state: GameState, player_id: str) -> Optional[dict]:
        if state.phase == "bidding":
            is_dealer = state.players[state.dealerIndex].id == player_id
            forbidden = (
                get_forbidden_dealer_bid(state) if is_dealer else None
            )
            bid = bot_bid(
                state.hands.get(player_id, []),
                state.trump,
                state.cardsPerPlayer,
                forbidden,
            )
            return {"type": "bid", "bid": bid}
        if state.phase == "playing":
            card = bot_play(
                BotPlayContext(
                    hand=state.hands.get(player_id, []),
                    lead_suit=state.leadSuit,
                    trump=state.trump,
                    trick=state.currentTrick,
                    bid=state.bids.get(player_id) or 0,
                    tricks_won=state.tricksWon.get(player_id, 0),
                    cards_left=len(state.hands.get(player_id, [])),
                )
            )
            return {"type": "play", "card": card.model_dump()}
        return None

    @staticmethod
    def public_view(state: GameState) -> dict:
        # Kachu Ful has no fully-hidden global state.  Each client filters
        # to its own hand on render -- the bandwidth saving from
        # server-side hand-stripping is negligible here.
        return state.model_dump()

    @staticmethod
    def private_view(state: GameState, player_id: str) -> dict:
        return state.model_dump()
