"""FastAPI + python-socketio app.

Wire-compatible with the existing browser client (socket.io-client v4):
no frontend changes needed beyond pointing VITE_SERVER_URL at this server.
"""
from __future__ import annotations

import asyncio
import os
from typing import Any, Dict, Optional

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .game.ai import BotPlayContext, bot_bid, bot_play
from .game.deck import RANK_VALUE
from .game.engine import (
    create_initial_state,
    current_expected_player_id,
    get_forbidden_dealer_bid,
    next_round_or_end,
    place_bid,
    play_card,
    resolve_trick,
    start_round,
)
from .game.rules import legal_cards
from .game.types import Card, GameSettings
from .rooms import MIN_PLAYERS, RoomRegistry, ServerRoom


PORT = int(os.environ.get("PORT", "3001"))
CORS_ORIGIN = os.environ.get("CORS_ORIGIN", "*")
TURN_TIMEOUT_SEC = 15
SLEEP_BID_SEC = 0.7
SLEEP_PLAY_SEC = 0.9
SLEEP_TRICK_RESOLVE_SEC = 1.5


# --- FastAPI app (for /health and to host the socket.io ASGI) ---

api = FastAPI()
api.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN] if CORS_ORIGIN != "*" else ["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@api.get("/health")
async def health() -> Dict[str, Any]:
    return {"ok": True, "ts": int(asyncio.get_event_loop().time() * 1000)}


# --- python-socketio (ASGI) ---

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*" if CORS_ORIGIN == "*" else [CORS_ORIGIN],
)

# Combine: socket.io owns /socket.io/, FastAPI owns everything else.
app = socketio.ASGIApp(sio, other_asgi_app=api)


# --- module state ---

registry = RoomRegistry()
# sid -> {"room_code": str, "player_id": str}
sid_session: Dict[str, Dict[str, str]] = {}
# room.code -> asyncio.Task (the per-room bot loop)
bot_loops: Dict[str, asyncio.Task[Any]] = {}
# room.code -> asyncio.TimerHandle (the active turn-timeout timer)
turn_timers: Dict[str, asyncio.TimerHandle] = {}


# --- helpers ---


async def broadcast_room(room: ServerRoom) -> None:
    await sio.emit(
        "room:state",
        registry.to_public(room),
        room=f"room:{room.code}",
    )


async def broadcast_game(room: ServerRoom) -> None:
    if room.game_state is None:
        return
    await sio.emit(
        "game:state",
        room.game_state.model_dump(),
        room=f"room:{room.code}",
    )


def _clear_turn_timer(code: str) -> None:
    t = turn_timers.pop(code, None)
    if t is not None:
        t.cancel()


def _schedule_turn_timer(room: ServerRoom) -> None:
    """If the next expected player is a HUMAN, start a 15s timer.

    On expiry the server picks a sensible default action (bid 0/1 or
    the lowest legal card) and advances the game.
    """
    _clear_turn_timer(room.code)
    state = room.game_state
    if state is None:
        return
    if state.phase not in ("bidding", "playing"):
        return
    expected_id = current_expected_player_id(state)
    if expected_id is None:
        return
    player = room.players.get(expected_id)
    if player is None or player.is_ai:
        return

    target_phase = state.phase
    target_trick_len = len(state.currentTrick)
    code = room.code

    def on_timeout() -> None:
        turn_timers.pop(code, None)
        r = registry.get_room(code)
        if r is None or r.game_state is None:
            return
        if r.game_state.phase != target_phase:
            return
        if len(r.game_state.currentTrick) != target_trick_len:
            return
        still_expected = current_expected_player_id(r.game_state)
        if still_expected != expected_id:
            return
        still_player = r.players.get(expected_id)
        if still_player is None or still_player.is_ai:
            return

        gs = r.game_state
        if gs.phase == "bidding":
            is_dealer = (
                gs.players[gs.dealerIndex].id == expected_id
            )
            forbidden = (
                get_forbidden_dealer_bid(gs) if is_dealer else None
            )
            fallback = 1 if forbidden == 0 else 0
            r.game_state = place_bid(gs, expected_id, fallback)
        elif gs.phase == "playing":
            hand = gs.hands.get(expected_id, [])
            legal = legal_cards(hand, gs.leadSuit)
            if not legal:
                return
            lowest = sorted(legal, key=lambda c: RANK_VALUE[c.rank])[0]
            r.game_state = play_card(gs, expected_id, lowest)
        else:
            return

        # Schedule the follow-up bot moves + broadcast + next timer.
        asyncio.create_task(_after_state_change(r))

    loop = asyncio.get_event_loop()
    turn_timers[code] = loop.call_later(TURN_TIMEOUT_SEC, on_timeout)


async def _after_state_change(room: ServerRoom) -> None:
    """Broadcast the new game state, then drive any AI moves and schedule
    the next turn-timeout for whichever human is up after that."""
    await broadcast_game(room)
    await _advance_bot_moves(room)


async def _advance_bot_moves(room: ServerRoom) -> None:
    """Drive moves for any AI-controlled seats until control returns
    to a human (or the game ends). Re-entrancy guarded per-room."""
    if room.code in bot_loops and not bot_loops[room.code].done():
        return

    async def loop() -> None:
        try:
            while room.game_state is not None:
                state = room.game_state
                if state.phase not in ("bidding", "playing"):
                    if state.phase == "trick_resolution":
                        await asyncio.sleep(SLEEP_TRICK_RESOLVE_SEC)
                        if room.game_state is None:
                            return
                        room.game_state = resolve_trick(room.game_state)
                        await broadcast_game(room)
                        continue
                    return

                expected_id = current_expected_player_id(state)
                if expected_id is None:
                    return
                player = room.players.get(expected_id)
                if player is None or not player.is_ai:
                    return

                await asyncio.sleep(
                    SLEEP_BID_SEC
                    if state.phase == "bidding"
                    else SLEEP_PLAY_SEC
                )
                if room.game_state is None:
                    return
                still_expected = current_expected_player_id(room.game_state)
                if still_expected != expected_id:
                    continue
                refreshed = room.players.get(expected_id)
                if refreshed is None or not refreshed.is_ai:
                    return

                gs = room.game_state
                if gs.phase == "bidding":
                    is_dealer = gs.players[gs.dealerIndex].id == expected_id
                    forbidden = (
                        get_forbidden_dealer_bid(gs) if is_dealer else None
                    )
                    bid = bot_bid(
                        gs.hands.get(expected_id, []),
                        gs.trump,
                        gs.cardsPerPlayer,
                        forbidden,
                    )
                    room.game_state = place_bid(gs, expected_id, bid)
                    await broadcast_game(room)
                    continue

                if gs.phase == "playing":
                    card = bot_play(
                        BotPlayContext(
                            hand=gs.hands.get(expected_id, []),
                            lead_suit=gs.leadSuit,
                            trump=gs.trump,
                            trick=gs.currentTrick,
                            bid=gs.bids.get(expected_id) or 0,
                            tricks_won=gs.tricksWon.get(expected_id, 0),
                            cards_left=len(gs.hands.get(expected_id, [])),
                        )
                    )
                    room.game_state = play_card(gs, expected_id, card)
                    await broadcast_game(room)
                    if room.game_state.phase == "trick_resolution":
                        await asyncio.sleep(SLEEP_TRICK_RESOLVE_SEC)
                        if room.game_state is None:
                            return
                        room.game_state = resolve_trick(room.game_state)
                        await broadcast_game(room)
                    continue

                return
        finally:
            bot_loops.pop(room.code, None)
            # Bot loop exited — start the timer for the next human (if any).
            _schedule_turn_timer(room)

    bot_loops[room.code] = asyncio.create_task(loop())


async def _start_game(room: ServerRoom) -> None:
    if len(room.players) < MIN_PLAYERS:
        return
    players = registry.to_game_players(room)
    state = create_initial_state(players, room.settings)
    state = start_round(state)
    room.game_state = state
    room.phase = "playing"
    await broadcast_room(room)
    await _after_state_change(room)


# --- Socket.IO event handlers ---


@sio.event
async def connect(sid: str, environ: Dict[str, Any]) -> None:
    # Per-sid session is created lazily on first room:create / room:join.
    pass


@sio.on("room:create")
async def on_room_create(sid: str, data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    name = (data or {}).get("name") or "Player"
    room, player = registry.create_room(name, sid)
    sid_session[sid] = {"room_code": room.code, "player_id": player.id}
    await sio.enter_room(sid, f"room:{room.code}")
    await broadcast_room(room)
    return {"ok": True, "code": room.code, "playerId": player.id}


@sio.on("room:join")
async def on_room_join(sid: str, data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    code = ((data or {}).get("code") or "").upper()
    name = (data or {}).get("name") or "Player"
    result = registry.join_room(code, name, sid)
    if not result.ok:
        return {"ok": False, "error": result.error}  # type: ignore[union-attr]

    room = result.room  # type: ignore[union-attr]
    player = result.player  # type: ignore[union-attr]
    sid_session[sid] = {"room_code": room.code, "player_id": player.id}
    await sio.enter_room(sid, f"room:{room.code}")

    # If they were AI-controlled mid-game (reclaimed slot), restore human control.
    if room.phase == "playing" and player.is_ai:
        registry.set_ai_controlled(room, player.id, False)
        if room.game_state is not None:
            await broadcast_game(room)

    await broadcast_room(room)
    return {"ok": True, "playerId": player.id}


@sio.on("room:leave")
async def on_room_leave(sid: str) -> None:
    sess = sid_session.get(sid)
    if not sess:
        return
    room_code = sess["room_code"]
    player_id = sess["player_id"]
    room = registry.get_room(room_code)
    if room is None:
        return

    if room.phase == "playing" and room.game_state is not None:
        # Mid-game: keep the seat as AI so the game continues for the rest.
        registry.set_ai_controlled(room, player_id, True)
        registry.set_connected(room_code, player_id, False)
        await sio.leave_room(sid, f"room:{room_code}")
        sid_session.pop(sid, None)
        await sio.emit("room:left", to=sid)
        await broadcast_room(room)
        await _after_state_change(room)
    else:
        after = registry.leave_room(room_code, player_id)
        await sio.leave_room(sid, f"room:{room_code}")
        sid_session.pop(sid, None)
        await sio.emit("room:left", to=sid)
        if after is not None:
            await broadcast_room(after)
        else:
            _clear_turn_timer(room_code)


@sio.on("room:ready")
async def on_room_ready(sid: str, data: Dict[str, Any]) -> None:
    sess = sid_session.get(sid)
    if not sess:
        return
    room = registry.set_ready(
        sess["room_code"], sess["player_id"], bool(data.get("ready"))
    )
    if room is not None:
        await broadcast_room(room)


@sio.on("room:settings")
async def on_room_settings(sid: str, data: Dict[str, Any]) -> None:
    sess = sid_session.get(sid)
    if not sess:
        return
    settings_patch = data.get("settings") or {}
    room = registry.update_settings(
        sess["room_code"], sess["player_id"], settings_patch
    )
    if room is not None:
        await broadcast_room(room)


@sio.on("room:kick")
async def on_room_kick(sid: str, data: Dict[str, Any]) -> None:
    sess = sid_session.get(sid)
    if not sess:
        return
    target_id = data.get("playerId")
    if not target_id:
        return
    result = registry.kick_player(
        sess["room_code"], sess["player_id"], target_id
    )
    if not result.ok:
        await sio.emit(
            "room:error",
            {"message": result.error},  # type: ignore[union-attr]
            to=sid,
        )
        return
    target_sid = result.target_socket_id  # type: ignore[union-attr]
    # Find the kicked socket and notify them
    if target_sid in sid_session:
        sid_session.pop(target_sid, None)
    await sio.emit("room:left", to=target_sid)
    await sio.leave_room(target_sid, f"room:{sess['room_code']}")
    if result.room is not None:  # type: ignore[union-attr]
        await broadcast_room(result.room)  # type: ignore[union-attr]


@sio.on("room:start")
async def on_room_start(sid: str) -> None:
    sess = sid_session.get(sid)
    if not sess:
        return
    room = registry.get_room(sess["room_code"])
    if room is None:
        return
    if room.host_id != sess["player_id"] or room.phase != "lobby":
        return
    if len(room.players) < MIN_PLAYERS:
        await sio.emit(
            "room:error",
            {"message": f"Need at least {MIN_PLAYERS} players"},
            to=sid,
        )
        return
    all_ready = all(p.ready or p.id == room.host_id for p in room.players.values())
    if not all_ready:
        await sio.emit(
            "room:error", {"message": "Not all players are ready"}, to=sid
        )
        return
    await _start_game(room)


@sio.on("game:bid")
async def on_game_bid(sid: str, data: Dict[str, Any]) -> None:
    sess = sid_session.get(sid)
    if not sess:
        return
    room = registry.get_room(sess["room_code"])
    if room is None or room.game_state is None:
        return
    if current_expected_player_id(room.game_state) != sess["player_id"]:
        return
    room.game_state = place_bid(
        room.game_state, sess["player_id"], int(data.get("bid", 0))
    )
    await _after_state_change(room)


@sio.on("game:play")
async def on_game_play(sid: str, data: Dict[str, Any]) -> None:
    sess = sid_session.get(sid)
    if not sess:
        return
    room = registry.get_room(sess["room_code"])
    if room is None or room.game_state is None:
        return
    if current_expected_player_id(room.game_state) != sess["player_id"]:
        return
    try:
        card = Card.model_validate(data.get("card"))
    except Exception:
        return
    room.game_state = play_card(room.game_state, sess["player_id"], card)
    await _after_state_change(room)


@sio.on("game:next")
async def on_game_next(sid: str) -> None:
    sess = sid_session.get(sid)
    if not sess:
        return
    room = registry.get_room(sess["room_code"])
    if room is None or room.game_state is None:
        return
    if room.game_state.phase != "round_summary":
        return
    if room.host_id != sess["player_id"]:
        return
    room.game_state = next_round_or_end(room.game_state)
    if room.game_state.phase == "game_over":
        room.phase = "finished"
        await broadcast_room(room)
    await _after_state_change(room)


@sio.on("game:return-to-lobby")
async def on_return_to_lobby(sid: str) -> None:
    sess = sid_session.get(sid)
    if not sess:
        return
    room = registry.get_room(sess["room_code"])
    if room is None:
        return
    if room.host_id != sess["player_id"]:
        return
    _clear_turn_timer(room.code)
    room.game_state = None
    room.phase = "lobby"
    for p in room.players.values():
        p.ready = False
        p.is_ai = False
    await broadcast_room(room)


@sio.event
async def disconnect(sid: str) -> None:
    sess = sid_session.get(sid)
    if not sess:
        return
    room_code = sess["room_code"]
    player_id = sess["player_id"]
    room = registry.get_room(room_code)
    if room is None:
        sid_session.pop(sid, None)
        return

    player = room.players.get(player_id)
    sid_session.pop(sid, None)
    if player is None:
        return

    # If a NEWER socket already owns this slot, leave it alone — the
    # old socket's late disconnect must not stomp on the fresh session.
    if player.socket_id != sid:
        return

    registry.set_connected(room_code, player_id, False)

    if room.phase == "playing" and room.game_state is not None:
        # Mid-game: AI takes over so the game keeps moving.
        registry.set_ai_controlled(room, player_id, True)
        await broadcast_room(room)
        await _after_state_change(room)
    else:
        # Lobby/finished: 30s grace then remove.
        await broadcast_room(room)
        await _schedule_lobby_eviction(room_code, player_id, sid)


async def _schedule_lobby_eviction(
    room_code: str, player_id: str, disconnecting_sid: str
) -> None:
    await asyncio.sleep(30.0)
    r = registry.get_room(room_code)
    if r is None:
        return
    p = r.players.get(player_id)
    if p is None:
        return
    # Only evict if they're STILL disconnected AND still bound to this socket.
    if p.connected or p.socket_id != disconnecting_sid:
        return
    after = registry.leave_room(room_code, player_id)
    if after is not None:
        await broadcast_room(after)
    else:
        _clear_turn_timer(room_code)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=PORT,
        reload=False,
    )
