"""Blackjack Pydantic models. JSON shapes are the wire contract with the
React frontend (src/games/blackjack/engine/types.ts must mirror these)."""
from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

Suit = Literal["S", "H", "D", "C"]
Rank = Literal[
    "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"
]

# Phases of a single round.
#   betting        -> each player places a bet (sequential by seat)
#   dealing        -> server deals everyone + dealer (automatic)
#   player_turns   -> each player acts on each of their hands
#   dealer_turn    -> dealer reveals hole card + draws (automatic)
#   settlement     -> chips paid out (automatic)
#   round_over     -> results shown; host advances to next round
#   game_over      -> nobody can play anymore
BjPhase = Literal[
    "betting",
    "dealing",
    "player_turns",
    "dealer_turn",
    "settlement",
    "round_over",
    "game_over",
]

HandStatus = Literal[
    "active",      # still being played
    "stand",       # player chose to stop
    "bust",        # over 21
    "blackjack",   # natural 21 on first two cards
    "doubled",     # doubled down (one card taken, now resolved)
]

# Outcome of a hand vs the dealer, filled in at settlement.
HandOutcome = Literal["win", "lose", "push", "blackjack", "bust", "pending"]


class _Model(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class Card(_Model):
    id: str
    suit: Suit
    rank: Rank


class Hand(_Model):
    cards: List[Card] = Field(default_factory=list)
    bet: int = 0
    status: HandStatus = "active"
    outcome: HandOutcome = "pending"
    # Resolved values, recomputed by the engine when broadcasting.
    value: int = 0
    soft: bool = False
    # The chip delta this hand produced at settlement (+win / -loss / 0 push).
    payout: int = 0


class BjPlayer(_Model):
    id: str
    name: str
    isBot: bool = False
    avatar: str = ""
    seat: int = 0
    chips: int = 0
    hands: List[Hand] = Field(default_factory=list)
    # Pending bet placed during the betting phase, before cards are dealt.
    pendingBet: Optional[int] = None
    hasBet: bool = False
    # Net chips won/lost last round, for display.
    netLastRound: int = 0
    # True once the player is out of chips (spectating).
    bust_out: bool = False


class Dealer(_Model):
    cards: List[Card] = Field(default_factory=list)
    # Whether the hole (second) card is currently hidden from clients.
    holeHidden: bool = True
    value: int = 0
    soft: bool = False
    status: Literal["waiting", "playing", "stand", "bust", "blackjack"] = (
        "waiting"
    )


class BjSettings(_Model):
    numDecks: int = 6
    minBet: int = 10
    maxBet: int = 500
    startingChips: int = 1000
    dealerHitsSoft17: bool = False  # S17 standard
    blackjackPayoutNum: int = 3  # 3:2
    blackjackPayoutDen: int = 2


class BjGameState(_Model):
    gameType: Literal["blackjack"] = "blackjack"
    phase: BjPhase = "betting"
    players: List[BjPlayer] = Field(default_factory=list)
    dealer: Dealer = Field(default_factory=Dealer)
    # Remaining shoe — kept server-side; stripped from public view.
    shoe: List[Card] = Field(default_factory=list)
    # Index into players[] of the player currently acting (player_turns) or
    # betting (betting). -1 when not applicable.
    activePlayerIndex: int = -1
    # Which hand of the active player is being played (split support).
    activeHandIndex: int = 0
    round: int = 0
    settings: BjSettings = Field(default_factory=BjSettings)
    message: str = ""
    hostId: str = ""
