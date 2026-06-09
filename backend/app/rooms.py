"""Room registry — port of server/src/rooms.ts.

Holds all the in-memory state for active rooms. No DB. Restarting the
process loses all in-flight games (acceptable for casual play).
"""
from __future__ import annotations

import random
import time
from dataclasses import dataclass, field
from typing import Dict, List, Literal, Optional, Tuple

from .game.engine import DEFAULT_SETTINGS
from .game.types import GameSettings, GameState, Player


# Visible to clients
AVATARS: List[str] = ["🦊", "🐼", "🦁", "🐯", "🐺", "🦉"]

# Easy-to-read 6-char codes (no ambiguous I/O/0/1)
_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

ROOM_CODE_LENGTH = 6
MAX_PLAYERS = 26  # 26 * 2 cards = full deck, our hard ceiling
MIN_PLAYERS = 2


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
    players: Dict[str, RoomPlayerInternal] = field(default_factory=dict)
    settings: GameSettings = field(default_factory=lambda: DEFAULT_SETTINGS.model_copy())
    phase: RoomPhase = "lobby"
    game_state: Optional[GameState] = None
    created_at: float = field(default_factory=time.time)


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
        self, host_name: str, host_socket_id: str
    ) -> Tuple[ServerRoom, RoomPlayerInternal]:
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
        room = ServerRoom(code=code, host_id=player_id)
        room.players[player_id] = player
        self._rooms[code] = room
        return room, player

    def join_room(
        self, code: str, name: str, socket_id: str
    ) -> JoinSuccess | JoinFailure:
        if not isinstance(code, str) or not code:
            return JoinFailure(ok=False, error="Invalid code")
        room = self._rooms.get(code.upper())
        if not room:
            return JoinFailure(ok=False, error="Room not found")
        trimmed = (name or "Player")[:18]

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
        if len(room.players) >= MAX_PLAYERS:
            return JoinFailure(
                ok=False,
                error=f"Room full ({MAX_PLAYERS} players max — deck size limit)",
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
        room = self._rooms.get(code)
        if not room:
            return KickFailure(ok=False, error="Room not found")
        if room.host_id != host_id:
            return KickFailure(ok=False, error="Only the host can kick")
        if room.phase != "lobby":
            return KickFailure(
                ok=False, error="Can't kick once the game starts"
            )
        if target_id == host_id:
            return KickFailure(ok=False, error="Host cannot kick themselves")
        target = room.players.get(target_id)
        if not target:
            return KickFailure(ok=False, error="Player not in room")
        socket_id = target.socket_id
        del room.players[target_id]
        if not room.players:
            self._rooms.pop(code, None)
            return KickSuccess(ok=True, room=None, target_socket_id=socket_id)
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
        room.settings = GameSettings.model_validate(merged)
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
            "maxPlayers": MAX_PLAYERS,
            "minPlayers": MIN_PLAYERS,
            "createdAt": int(room.created_at * 1000),
        }

    def to_game_players(self, room: ServerRoom) -> List[Player]:
        return [
            Player(
                id=p.id, name=p.name, avatar=p.avatar, isBot=p.is_ai, seat=p.seat
            )
            for p in room.players.values()
        ]
