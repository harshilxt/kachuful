"""Pydantic models for Mendikot — the over-the-wire contract.

Field names are camelCase to match the frontend exactly.
"""
from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict

from ..kachuful.types import Card, Suit

Phase = Literal["choose_trump", "playing", "trick_done", "hand_over"]
WinKind = Literal["mendikot", "whitewash", "tens", "tricks"]


class _Model(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class MPlayer(_Model):
    id: str
    name: str
    seat: int        # 0..3
    team: int        # seat % 2
    isBot: bool
    avatar: str


class PlayedCard(_Model):
    seat: int
    card: Card


class HandResult(_Model):
    winnerTeam: int
    kind: WinKind
    tens: List[int]      # [team0, team1]
    tricks: List[int]
    message: str


class MendikotSettings(_Model):
    variant: str = "standard"


class MendikotState(_Model):
    players: List[MPlayer]
    hands: Dict[str, List[Card]]
    trump: Optional[Suit] = None
    trumpRevealed: bool = False
    chooserSeat: int = 0
    leaderSeat: int = 0
    turnSeat: int = 0
    currentTrick: List[PlayedCard] = []
    leadSuit: Optional[Suit] = None
    tensByTeam: List[int] = [0, 0]
    tricksByTeam: List[int] = [0, 0]
    lastTrickWinnerSeat: Optional[int] = None
    phase: Phase = "choose_trump"
    message: str = "Choose the trump suit"
    result: Optional[HandResult] = None
    hostId: Optional[str] = None
    # convenience for clients: count of cards each player holds
    handCounts: Dict[str, int] = {}
