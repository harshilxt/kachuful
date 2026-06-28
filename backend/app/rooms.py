"""Room registry — port of server/src/rooms.ts.

Holds all the in-memory state for active rooms. No DB. Restarting the
process loses all in-flight games (acceptable for casual play).
"""
from __future__ import annotations

import random
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional, Set, Tuple

from .games.kachuful import DEFAULT_SETTINGS as KACHUFUL_DEFAULTS
from .games.kachuful.types import GameSettings, GameState, Player
from .games.blackjack import DEFAULT_SETTINGS as BLACKJACK_DEFAULTS
from .games.uno import DEFAULT_SETTINGS as UNO_DEFAULTS
from .games.mendikot import DEFAULT_SETTINGS as MENDIKOT_DEFAULTS


# Visible to clients
AVATARS: List[str] = ["🦊", "🐼", "🦁", "🐯", "🐺", "🦉"]

# Easy-to-read 6-char codes (no ambiguous I/O/0/1)
_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

ROOM_CODE_LENGTH = 6
MAX_PLAYERS = 26  # 26 * 2 cards = full deck, our hard ceiling (Kachu Ful)
MIN_PLAYERS = 2

# Per-game player limits + default settings, keyed by game_type.
GAME_LIMITS: Dict[str, Dict[str, int]] = {
    "kachuful": {"min": 2, "max": 26},
    "blackjack": {"min": 1, "max": 7},
    "uno": {"min": 2, "max": 10},
    "mendikot": {"min": 1, "max": 4},
}


def _default_settings_for(game_type: str):
    if game_type == "blackjack":
        return BLACKJACK_DEFAULTS.model_copy()
    if game_type == "uno":
        return UNO_DEFAULTS.model_copy()
    if game_type == "mendikot":
        return MENDIKOT_DEFAULTS.model_copy()
    return KACHUFUL_DEFAULTS.model_copy()


BOT_NAMES = ["Riya", "Sam", "Neo", "Mia", "Kai", "Zoe", "Leo", "Ava", "Dev"]


def _generate_code() -> str:
    return "".join(random.choice(_CODE_CHARS) for _ in range(ROOM_CODE_LENGTH))


def _new_player_id() -> str:
    return "p_" + "".join(
        random.choice("abcdefghijklmnopqrstuvwxyz0123456789") for _ in range(8)
    )


RoomPhase = Literal["lobby", "playing", "finished"]


@dataclass
class RoomPlayerInternal:
    """Server-side player record. Has socket_id (not shipped to clients)."""

    id: str
    name: str
    avatar: str
    ready: bool
    connected: bool
    is_host: bool
    seat: int
    is_ai: bool
    socket_id: str


@dataclass
class ServerRoom:
    code: str
    host_id: str
    # Which game this room is playing. Defaults to kachuful for backward
    # compatibility — future rooms can pass game_type="blackjack" etc.
    game_type: str = "kachuful"
    players: Dict[str, RoomPlayerInternal] = field(default_factory=dict)
    # Settings type varies by game (GameSettings for kachuful, BjSettings
    # for blackjack). Typed Any to allow either.
    settings: Any = field(default_factory=lambda: KACHUFUL_DEFAULTS.model_copy())
    phase: RoomPhase = "lobby"
    game_state: Optional[Any] = None
    created_at: float = field(default_factory=time.time)
    min_players: int = MIN_PLAYERS
    max_players: int = MAX_PLAYERS
    # Names that have been kicked. Stored lowercased. Used to prevent a
    # kicked player from rejoining by their old name (the reclaim path).
    banned_names: Set[str] = field(default_factory=set)


# ---------- Result types ----------


@dataclass
class JoinSuccess:
    ok: bool
    room: ServerRoom
    player: RoomPlayerInternal


@dataclass
class JoinFailure:
    ok: bool
    error: str


@dataclass
class KickSuccess:
    ok: bool
    room: Optional[ServerRoom]
    target_socket_id: str


@dataclass
class KickFailure:
    ok: bool
    error: str


class RoomRegistry:
    """In-memory store of all live rooms, keyed by 6-char code."""

    def __init__(self) -> None:
        self._rooms: Dict[str, ServerRoom] = {}

    # -- create / join / leave --

    def create_room(
        self,
        host_name: str,
        host_socket_id: str,
        game_type: str = "kachuful",
    ) -> Tuple[ServerRoom, RoomPlayerInternal]:
        if game_type not in GAME_LIMITS:
            game_type = "kachuful"
        code = _generate_code()
        while code in self._rooms:
            code = _generate_code()
        player_id = _new_player_id()
        player = RoomPlayerInternal(
            id=player_id,
            name=(host_name or "Player")[:18],
            avatar=AVATARS[0],
            ready=False,
            connected=True,
            is_host=True,
            seat=0,
            is_ai=False,
            socket_id=host_socket_id,
        )
        limits = GAME_LIMITS[game_type]
        room = ServerRoom(
            code=code,
            host_id=player_id,
            game_type=game_type,
            settings=_default_settings_for(game_type),
            min_players=limits["min"],
            max_players=limits["max"],
        )
        room.players[player_id] = player
        self._rooms[code] = room
        return room, player

    def add_bots(self, room: ServerRoom, count: int) -> None:
        """Add AI players to a room (for Play-vs-AI). Bots have no socket;
        they're driven entirely by the server's bot loop."""
        used = {p.name.lower() for p in room.players.values()}
        added = 0
        for nm in BOT_NAMES:
            if added >= count:
                break
            if len(room.players) >= room.max_players:
                break
            if nm.lower() in used:
                continue
            used.add(nm.lower())
            seat = len(room.players)
            pid = _new_player_id()
            room.players[pid] = RoomPlayerInternal(
                id=pid,
                name=nm,
                avatar=AVATARS[seat % len(AVATARS)],
                ready=True,        # bots are always ready
                connected=False,   # no socket → skipped by per-player broadcast
                is_host=False,
                seat=seat,
                is_ai=True,
                socket_id=f"bot_{pid}",
            )
            added += 1

    def connected_humans(self, room: ServerRoom) -> int:
        return sum(
            1 for p in room.players.values() if p.connected and not p.is_ai
        )

    def destroy(self, code: str) -> None:
        self._rooms.pop(code, None)

    def join_room(
        self, code: str, name: str, socket_id: str
    ) -> JoinSuccess | JoinFailure:
        if not isinstance(code, str) or not code:
            return JoinFailure(ok=False, error="Invalid code")
        room = self._rooms.get(code.upper())
        if not room:
            return JoinFailure(ok=False, error="Room not found")
        trimmed = (name or "Player")[:18]

        # Banned-name guard: a host kick during the game adds the kicked
        # player's name to banned_names so they can't bounce back in.
        if trimmed.lower() in room.banned_names:
            return JoinFailure(
                ok=False, error="You were removed from this room"
            )

        # Same-name reclaim path: if a player with this name exists,
        # either (a) idempotent same-socket rejoin, (b) refuse with
        # "name taken" if they're a different live socket, or (c) reclaim
        # if they're disconnected.
        existing = next(
            (
                p
                for p in room.players.values()
                if p.name.lower() == trimmed.lower()
            ),
            None,
        )
        if existing is not None:
            if existing.connected and existing.socket_id == socket_id:
                return JoinSuccess(ok=True, room=room, player=existing)
            if existing.connected:
                return JoinFailure(
                    ok=False, error="That name is already taken in this room"
                )
            existing.connected = True
            existing.socket_id = socket_id
            return JoinSuccess(ok=True, room=room, player=existing)

        if room.phase != "lobby":
            return JoinFailure(ok=False, error="Game already in progress")
        if len(room.players) >= room.max_players:
            return JoinFailure(
                ok=False,
                error=f"Room full ({room.max_players} players max)",
            )

        seat = len(room.players)
        player_id = _new_player_id()
        player = RoomPlayerInternal(
            id=player_id,
            name=trimmed,
            avatar=AVATARS[seat % len(AVATARS)],
            ready=False,
            connected=True,
            is_host=False,
            seat=seat,
            is_ai=False,
            socket_id=socket_id,
        )
        room.players[player_id] = player
        return JoinSuccess(ok=True, room=room, player=player)

    def leave_room(self, code: str, player_id: str) -> Optional[ServerRoom]:
        room = self._rooms.get(code)
        if not room:
            return None
        room.players.pop(player_id, None)
        if not room.players:
            self._rooms.pop(code, None)
            return None
        if room.host_id == player_id:
            new_host = next(iter(room.players.values()))
            room.host_id = new_host.id
            new_host.is_host = True
        return room

    def kick_player(
        self, code: str, host_id: str, target_id: str
    ) -> KickSuccess | KickFailure:
        """Host can kick a player at ANY phase.

        - Lobby: target is fully removed from room.players.
        - Playing/finished: target stays in the seat (game indexing would
          break otherwise) but is permanently marked AI, marked
          disconnected, and their name is added to banned_names so they
          can't reclaim the seat by rejoining with the same name.
        """
        room = self._rooms.get(code)
        if not room:
            return KickFailure(ok=False, error="Room not found")
        if room.host_id != host_id:
            return KickFailure(ok=False, error="Only the host can kick")
        if target_id == host_id:
            return KickFailure(ok=False, error="Host cannot kick themselves")
        target = room.players.get(target_id)
        if not target:
            return KickFailure(ok=False, error="Player not in room")

        socket_id = target.socket_id

        if room.phase == "lobby":
            del room.players[target_id]
            if not room.players:
                self._rooms.pop(code, None)
                return KickSuccess(
                    ok=True, room=None, target_socket_id=socket_id
                )
            return KickSuccess(
                ok=True, room=room, target_socket_id=socket_id
            )

        # Mid-game (or post-game finished) kick: keep the seat, ban the name.
        target.is_ai = True
        target.connected = False
        room.banned_names.add(target.name.lower())
        # Mirror is_ai into the active GameState so the AI badge shows up.
        if room.game_state is not None:
            updated_players = []
            for gp in room.game_state.players:
                if gp.id == target_id and not gp.isBot:
                    updated_players.append(gp.model_copy(update={"isBot": True}))
                else:
                    updated_players.append(gp)
            room.game_state = room.game_state.model_copy(
                update={"players": updated_players}
            )
        return KickSuccess(ok=True, room=room, target_socket_id=socket_id)

    # -- mutators --

    def set_ready(
        self, code: str, player_id: str, ready: bool
    ) -> Optional[ServerRoom]:
        room = self._rooms.get(code)
        if not room:
            return None
        p = room.players.get(player_id)
        if not p:
            return None
        p.ready = ready
        return room

    def update_settings(
        self, code: str, player_id: str, partial_settings: dict
    ) -> Optional[ServerRoom]:
        room = self._rooms.get(code)
        if (
            not room
            or room.host_id != player_id
            or room.phase != "lobby"
        ):
            return None
        merged = room.settings.model_dump()
        merged.update(
            {k: v for k, v in partial_settings.items() if v is not None}
        )
        # Re-validate using the model class that matches this game.
        room.settings = type(room.settings).model_validate(merged)
        return room

    def set_connected(
        self, code: str, player_id: str, connected: bool
    ) -> Optional[ServerRoom]:
        room = self._rooms.get(code)
        if not room:
            return None
        p = room.players.get(player_id)
        if not p:
            return None
        p.connected = connected
        return room

    def set_ai_controlled(
        self, room: ServerRoom, player_id: str, is_ai: bool
    ) -> Optional[ServerRoom]:
        """Toggle AI control on a player and mirror into the game state
        so the client sees the badge update in real time."""
        p = room.players.get(player_id)
        if not p:
            return None
        p.is_ai = is_ai
        gs = room.game_state
        if gs is not None:
            updated_players = []
            mutated = False
            for gp in gs.players:
                if gp.id == player_id and gp.isBot != is_ai:
                    updated_players.append(gp.model_copy(update={"isBot": is_ai}))
                    mutated = True
                else:
                    updated_players.append(gp)
            if mutated:
                room.game_state = gs.model_copy(update={"players": updated_players})
        return room

    # -- queries --

    def get_room(self, code: str) -> Optional[ServerRoom]:
        return self._rooms.get(code)

    # -- serialization --

    def to_public(self, room: ServerRoom) -> dict:
        return {
            "code": room.code,
            "hostId": room.host_id,
            "gameType": room.game_type,
            "players": [
                {
                    "id": p.id,
                    "name": p.name,
                    "avatar": p.avatar,
                    "ready": p.ready,
                    "connected": p.connected,
                    "isHost": p.is_host,
                    "seat": p.seat,
                    "isAi": p.is_ai,
                }
                for p in room.players.values()
            ],
            "settings": room.settings.model_dump(),
            "phase": room.phase,
            "maxPlayers": room.max_players,
            "minPlayers": room.min_players,
            "createdAt": int(room.created_at * 1000),
        }

    def to_game_players(self, room: ServerRoom) -> List[Player]:
        return [
            Player(
                id=p.id, name=p.name, avatar=p.avatar, isBot=p.is_ai, seat=p.seat
            )
            for p in room.players.values()
        ]
