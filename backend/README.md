# Kachu Ful — Python backend

FastAPI + python-socketio. Wire-compatible with the existing
`socket.io-client` in the React frontend — no frontend changes required
beyond pointing `VITE_SERVER_URL` at this server.

## Run locally

Requires **Python 3.10+** (works on 3.10, 3.11, 3.12, 3.13).

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 3001 --reload
```

You should see `Uvicorn running on http://0.0.0.0:3001`. Confirm with:

```bash
curl http://localhost:3001/health
# {"ok": true, "ts": ...}
```

The Socket.IO endpoint lives at `http://localhost:3001/socket.io/` and is
mounted automatically.

## Environment variables

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | HTTP port |
| `CORS_ORIGIN` | `*` | Allowed Origin for the frontend |

In production set `CORS_ORIGIN` to your Vercel URL.

## File tour

```
backend/
├── requirements.txt
└── app/
    ├── main.py           # FastAPI + python-socketio entrypoint
    ├── rooms.py          # RoomRegistry — all in-memory state
    └── game/
        ├── types.py      # Pydantic models (Card, Player, GameState, ...)
        ├── deck.py       # shuffle, deal, RANK_VALUE, sort_hand
        ├── rules.py      # legal_cards, trick_winner, scoring, trump cycle
        ├── engine.py     # state-machine: create_initial_state, place_bid, ...
        └── ai.py         # bot_bid / bot_play heuristics
```

Every server-side game function here mirrors the previous Node version's
`src/game/*.ts` one-for-one — the protocol is identical on the wire.

## Deploy to Render

In your existing service settings:

| Field | Value |
|---|---|
| Runtime | `Python 3` |
| Build Command | `pip install -r backend/requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT --app-dir backend` |
| Env: `NODE_VERSION` | _(remove — Python service)_ |
| Env: `CORS_ORIGIN` | Your Vercel URL (or `*` for testing) |
