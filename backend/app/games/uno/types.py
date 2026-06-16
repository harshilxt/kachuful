"""UNO Pydantic models. JSON shapes mirror src/games/uno/engine/types.ts."""
from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

# red / yellow / green / blue, plus "wild" for wild & wild-draw-four cards
Color = Literal["red", "yellow", "green", "blue", "wild"]
Kind = Literal["number", "skip", "reverse", "draw2", "wild", "wild4"]

UnoPhase = Literal[
    "dealing",
    "playing",
    "choosing_color",  # a player just played a wild and must pick a color
    "round_over",
    "game_over",
]


class _Model(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class Card(_Model):
    id: str
    color: Color
    kind: Kind
    value: Optional[int] = None  # 0-9 for number cards, else None


class UnoPlayer(_Model):
    id: str
    name: str
    isBot: bool = False
    avatar: str = ""
    seat: int = 0
    hand: List[Card] = Field(default_factory=list)  # stripped in public view
    handCount: int = 0
    calledUno: bool = False
    score: int = 0  # cumulative points across rounds
    netLastRound: int = 0
    finishedRank: int = 0  # 0 = still playing; 1 = went out first this round


class UnoSettings(_Model):
    targetScore: int = 500
    stacking: bool = False  # official = off
    startingHand: int = 7


class LastEvent(_Model):
    """Transient hint for the client to trigger sounds / animations."""

    kind: str = ""  # play|draw|skip|reverse|draw2|wild|wild4|uno|color|forgot_uno
    # Who performed the action (the player who threw the card / drew).
    byId: Optional[str] = None
    # Who the action targets (the player skipped / forced to draw).
    playerId: Optional[str] = None
    color: Optional[Color] = None
    count: Optional[int] = None
    seq: int = 0  # increments every event so the client can dedupe


class UnoGameState(_Model):
    gameType: Literal["uno"] = "uno"
    phase: UnoPhase = "dealing"
    players: List[UnoPlayer] = Field(default_factory=list)
    drawPile: List[Card] = Field(default_factory=list)  # stripped in public view
    drawCount: int = 0
    discardTop: Optional[Card] = None
    discardCount: int = 0
    currentColor: Color = "wild"  # the active color to match
    direction: int = 1  # 1 = clockwise, -1 = counter-clockwise
    currentPlayerIndex: int = 0
    colorChooserIndex: int = -1  # set during choosing_color
    # If the active player drew a card that is playable, they may play it
    # (by id) or pass. Null otherwise.
    drawnPlayableId: Optional[str] = None
    winnerId: Optional[str] = None
    round: int = 1
    settings: UnoSettings = Field(default_factory=UnoSettings)
    message: str = ""
    hostId: str = ""
    lastEvent: LastEvent = Field(default_factory=LastEvent)


def card_score(card: Card) -> int:
    """Point value when tallying an opponent's leftover hand."""
    if card.kind == "number":
        return card.value or 0
    if card.kind in ("skip", "reverse", "draw2"):
        return 20
    return 50  # wild / wild4
