"""Abstract interface every game has to satisfy.

To add a new game (Blackjack, Teen Patti, etc.) create a new package under
``app/games/<name>/`` and provide an implementation of ``GameEngine``.
``RoomRegistry`` and the Socket.IO dispatchers in ``main.py`` operate
through this interface — they don't know which game is being played.

The state object is intentionally typed as ``Any`` here because each game
has its own Pydantic state model. Each engine is free to use Pydantic
models internally but must serialize to plain dicts in ``public_view`` /
``private_view`` so the wire format is consistent.
"""
from __future__ import annotations

from typing import Any, ClassVar, List, Optional, Protocol, runtime_checkable


@runtime_checkable
class GameEngine(Protocol):
    """The contract every game engine adheres to."""

    #: Stable identifier used in ServerRoom.game_type and the wire protocol.
    GAME_TYPE: ClassVar[str]

    #: Minimum players required to start the game.
    MIN_PLAYERS: ClassVar[int]

    #: Maximum players supported (deck-size cap, table size, etc.).
    MAX_PLAYERS: ClassVar[int]

    @staticmethod
    def default_settings() -> Any:
        """Return the default settings object for this game (Pydantic model)."""
        ...

    @staticmethod
    def create_initial_state(players: List[Any], settings: Any) -> Any:
        """Build the very first state for a new game."""
        ...

    @staticmethod
    def begin_round(state: Any) -> Any:
        """Transition into the first round (dealing, initial turn order, etc).

        Some games (Kachu Ful) have multiple rounds in a single game and
        need to re-shuffle/re-deal between rounds. For games without a
        round structure this can be a no-op that returns ``state`` as-is.
        """
        ...

    @staticmethod
    def apply_action(state: Any, player_id: str, action: dict) -> Any:
        """Apply one player's action. Should reject invalid actions by
        returning the unchanged state (engine validates internally)."""
        ...

    @staticmethod
    def current_expected_player(state: Any) -> Optional[str]:
        """ID of the player whose action the engine is waiting for, or None."""
        ...

    @staticmethod
    def is_terminal(state: Any) -> bool:
        """True once the game is fully over (no more actions to apply)."""
        ...

    @staticmethod
    def auto_default_action(state: Any, player_id: str) -> Optional[dict]:
        """A safe fallback action when the turn timer expires for a human.

        Examples: bid 0 in Kachu Ful, stand on 17+ in Blackjack, fold in
        Teen Patti. Returning None means "skip" (e.g., side-effect-free).
        """
        ...

    @staticmethod
    def bot_action(state: Any, player_id: str) -> Optional[dict]:
        """The action a bot would pick at this state. Used both for the SP
        vs-AI mode and for the mid-game AI takeover when a player drops."""
        ...

    @staticmethod
    def public_view(state: Any) -> dict:
        """Server-shareable snapshot of the full state.

        Hidden information (other players' hands in poker, dealer hole
        card in blackjack before reveal, etc.) is stripped here. For games
        like Kachu Ful where each player only sees their own hand, the
        full ``state`` IS the public view for now — clients filter their
        own hand client-side because the bandwidth difference is tiny.
        """
        ...

    @staticmethod
    def private_view(state: Any, player_id: str) -> dict:
        """The view of state shipped specifically to one player.

        Same as ``public_view`` for Kachu Ful (everyone sees the same
        thing). For poker-style games this would include only this
        player's hole cards.
        """
        ...
