"""Pydantic models mirroring src/game/types.ts on the frontend.

JSON shapes must match exactly — these are the over-the-wire contract.
"""
from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

# ---------- Primitive enums ----------

Suit = Literal["S", "H", "D", "C"]
Rank = Literal[
    "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"
]
GamePhase = Literal[
    "idle",
    "dealing",
    "bidding",
    "playing",
    "trick_resolution",
    "round_summary",
    "game_over",
]

SUITS: List[Suit] = ["S", "H", "D", "C"]
RANKS: List[Rank] = [
    "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"
]

SUIT_LABEL: Dict[Suit, str] = {
    "S": "Spades",
    "H": "Hearts",
    "D": "Diamonds",
    "C": "Clubs",
}
SUIT_GLYPH: Dict[Suit, str] = {"S": "♠", "H": "♥", "D": "♦", "C": "♣"}
SUIT_COLOR: Dict[Suit, Literal["red", "black"]] = {
    "S": "black",
    "C": "black",
    "H": "red",
    "D": "red",
}


class _Model(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


# ---------- Game objects ----------


class Card(_Model):
    id: str
    suit: Suit
    rank: Rank


class Player(_Model):
    id: str
    name: str
    isBot: bool
    avatar: str
    seat: int


class PlayedCard(_Model):
    playerId: str
    card: Card


class RoundResultCell(_Model):
    bid: int
    tricks: int
    points: int
    total: int


class RoundResult(_Model):
    round: int
    cardsPerPlayer: int
    trump: Optional[Suit] = None
    perPlayer: Dict[str, RoundResultCell] = Field(default_factory=dict)


class GameSettings(_Model):
    maxCards: int = 8
    scoringMode: Literal["ten-plus-bid", "one-per-trick-plus-bonus"] = (
        "ten-plus-bid"
    )
    enforceDealerConstraint: bool = True
    noTrumpRound: bool = False


class GameState(_Model):
    phase: GamePhase = "idle"
    players: List[Player] = Field(default_factory=list)
    hands: Dict[str, List[Card]] = Field(default_factory=dict)
    round: int = 0
    totalRounds: int = 0
    cardsPerPlayer: int = 0
    trump: Optional[Suit] = None
    dealerIndex: int = 0
    currentTurnIndex: int = 0
    # bids[playerId] = bid OR None if not yet bid this round
    bids: Dict[str, Optional[int]] = Field(default_factory=dict)
    tricksWon: Dict[str, int] = Field(default_factory=dict)
    totals: Dict[str, int] = Field(default_factory=dict)
    history: List[RoundResult] = Field(default_factory=list)
    currentTrick: List[PlayedCard] = Field(default_factory=list)
    leadSuit: Optional[Suit] = None
    trickWinnerId: Optional[str] = None
    settings: GameSettings = Field(default_factory=GameSettings)
    message: str = "Ready"
    bidOrder: List[str] = Field(default_factory=list)
    playOrder: List[str] = Field(default_factory=list)
