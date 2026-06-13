"""Blackjack state machine — pure functions, server-authoritative.

All transitions return a NEW BjGameState (callers replace room.game_state).
The orchestration driver in main.py repeatedly calls ``auto_advance`` to run
the automatic phases (dealing, dealer play, settlement) and stops to wait
for human input during ``betting`` and ``player_turns``.
"""
from __future__ import annotations

from typing import List, Optional, Tuple

from .deck import build_shoe, hand_value, is_blackjack, is_bust
from .types import (
    BjGameState,
    BjPlayer,
    BjSettings,
    Card,
    Dealer,
    Hand,
)


DEFAULT_SETTINGS = BjSettings()


# ---------- helpers ----------


def _recompute(state: BjGameState) -> BjGameState:
    """Refresh derived value/soft fields on every hand + the dealer so the
    client never has to compute totals itself."""
    for p in state.players:
        for h in p.hands:
            v, soft = hand_value(h.cards)
            h.value = v
            h.soft = soft
    dv, dsoft = hand_value(state.dealer.cards)
    state.dealer.value = dv
    state.dealer.soft = dsoft
    return state


def _draw(state: BjGameState) -> Card:
    """Pop one card from the shoe, rebuilding it if it ever runs dry."""
    if not state.shoe:
        state.shoe = build_shoe(state.settings.numDecks)
    return state.shoe.pop()


def _active_players(state: BjGameState) -> List[BjPlayer]:
    """Players who still have chips (or a live bet) and can take part."""
    return [p for p in state.players if not p.bust_out]


# ---------- lifecycle ----------


def create_initial_state(
    players: List[BjPlayer], settings: Optional[BjSettings] = None
) -> BjGameState:
    settings = (settings or DEFAULT_SETTINGS).model_copy()
    bj_players: List[BjPlayer] = []
    for p in players:
        bj_players.append(
            BjPlayer(
                id=p.id,
                name=p.name,
                isBot=p.isBot,
                avatar=p.avatar,
                seat=p.seat,
                chips=settings.startingChips,
                hands=[],
                pendingBet=None,
                hasBet=False,
                netLastRound=0,
                bust_out=False,
            )
        )
    state = BjGameState(
        phase="betting",
        players=bj_players,
        dealer=Dealer(),
        shoe=build_shoe(settings.numDecks),
        activePlayerIndex=-1,
        activeHandIndex=0,
        round=1,
        settings=settings,
        message="Place your bets",
    )
    return _begin_betting(state)


def _begin_betting(state: BjGameState) -> BjGameState:
    """Reset hands/bets for a fresh round and enter the betting phase."""
    state.phase = "betting"
    state.dealer = Dealer()
    state.activeHandIndex = 0
    for p in state.players:
        p.hands = []
        p.pendingBet = None
        p.hasBet = False
        p.netLastRound = 0
        if p.chips < state.settings.minBet:
            p.bust_out = True
    # First better = first active player by seat who can afford the min bet.
    idx = _next_better_index(state, -1)
    state.activePlayerIndex = idx
    if idx == -1:
        # Nobody can bet -> game over.
        state.phase = "game_over"
        state.message = "Game over"
    else:
        state.message = f"{state.players[idx].name} to bet"
    return state


def _next_better_index(state: BjGameState, after: int) -> int:
    for i in range(after + 1, len(state.players)):
        p = state.players[i]
        if not p.bust_out and not p.hasBet and p.chips >= state.settings.minBet:
            return i
    return -1


# ---------- betting ----------


def place_bet(state: BjGameState, player_id: str, amount: int) -> BjGameState:
    if state.phase != "betting":
        return state
    idx = state.activePlayerIndex
    if idx < 0 or state.players[idx].id != player_id:
        return state
    p = state.players[idx]
    amount = max(state.settings.minBet, min(state.settings.maxBet, int(amount)))
    amount = min(amount, p.chips)  # can't bet more than you have
    p.pendingBet = amount
    p.hasBet = True
    p.chips -= amount  # escrow
    nxt = _next_better_index(state, idx)
    if nxt == -1:
        return _deal_round(state)
    state.activePlayerIndex = nxt
    state.message = f"{state.players[nxt].name} to bet"
    return _recompute(state)


# ---------- dealing ----------


def _deal_round(state: BjGameState) -> BjGameState:
    """Deal two cards to each better and the dealer; handle naturals/peek."""
    state.phase = "dealing"
    bettors = [p for p in state.players if p.hasBet and p.pendingBet]

    # One card to each player, then dealer; repeat once (like a real deal).
    for p in bettors:
        p.hands = [Hand(cards=[], bet=p.pendingBet or 0, status="active")]
    state.dealer = Dealer(cards=[], holeHidden=True, status="waiting")

    for _round in range(2):
        for p in bettors:
            p.hands[0].cards.append(_draw(state))
        state.dealer.cards.append(_draw(state))

    # Mark player naturals.
    for p in bettors:
        if is_blackjack(p.hands[0].cards):
            p.hands[0].status = "blackjack"

    _recompute(state)

    # Dealer peek on Ace or 10-value upcard.
    up = state.dealer.cards[0]
    dealer_could_bj = up.rank in ("A", "10", "J", "Q", "K")
    if dealer_could_bj and is_blackjack(state.dealer.cards):
        # Dealer has blackjack — reveal immediately, settle.
        state.dealer.holeHidden = False
        state.dealer.status = "blackjack"
        state.message = "Dealer has Blackjack"
        return _settle(state)

    # Begin player turns.
    return _begin_player_turns(state)


def _begin_player_turns(state: BjGameState) -> BjGameState:
    state.phase = "player_turns"
    idx = _next_actable_player(state, -1)
    state.activePlayerIndex = idx
    state.activeHandIndex = 0
    if idx == -1:
        # Everyone had a natural / nothing to play -> dealer.
        return _begin_dealer_turn(state)
    _set_active_to_first_unresolved_hand(state)
    return _recompute(state)


def _next_actable_player(state: BjGameState, after: int) -> int:
    for i in range(after + 1, len(state.players)):
        p = state.players[i]
        if not p.hands:
            continue
        if any(h.status == "active" for h in p.hands):
            return i
    return -1


def _set_active_to_first_unresolved_hand(state: BjGameState) -> None:
    p = state.players[state.activePlayerIndex]
    for hi, h in enumerate(p.hands):
        if h.status == "active":
            state.activeHandIndex = hi
            state.message = f"{p.name}'s turn"
            return


# ---------- player actions ----------


def _current_hand(state: BjGameState) -> Optional[Tuple[BjPlayer, Hand]]:
    if state.phase != "player_turns":
        return None
    if not (0 <= state.activePlayerIndex < len(state.players)):
        return None
    p = state.players[state.activePlayerIndex]
    if not (0 <= state.activeHandIndex < len(p.hands)):
        return None
    return p, p.hands[state.activeHandIndex]


def _advance_after_hand(state: BjGameState) -> BjGameState:
    """Move to the next unresolved hand of the current player, or the next
    player, or to the dealer's turn."""
    p = state.players[state.activePlayerIndex]
    for hi in range(state.activeHandIndex + 1, len(p.hands)):
        if p.hands[hi].status == "active":
            state.activeHandIndex = hi
            state.message = f"{p.name}'s turn"
            return _recompute(state)
    nxt = _next_actable_player(state, state.activePlayerIndex)
    if nxt == -1:
        return _begin_dealer_turn(state)
    state.activePlayerIndex = nxt
    state.activeHandIndex = 0
    _set_active_to_first_unresolved_hand(state)
    return _recompute(state)


def hit(state: BjGameState, player_id: str) -> BjGameState:
    cur = _current_hand(state)
    if not cur:
        return state
    p, h = cur
    if p.id != player_id or h.status != "active":
        return state
    h.cards.append(_draw(state))
    _recompute(state)
    if is_bust(h.cards):
        h.status = "bust"
        h.outcome = "bust"
        return _advance_after_hand(state)
    v, _ = hand_value(h.cards)
    if v == 21:
        h.status = "stand"
        return _advance_after_hand(state)
    return state


def stand(state: BjGameState, player_id: str) -> BjGameState:
    cur = _current_hand(state)
    if not cur:
        return state
    p, h = cur
    if p.id != player_id or h.status != "active":
        return state
    h.status = "stand"
    return _advance_after_hand(state)


def double_down(state: BjGameState, player_id: str) -> BjGameState:
    cur = _current_hand(state)
    if not cur:
        return state
    p, h = cur
    if p.id != player_id or h.status != "active":
        return state
    if len(h.cards) != 2:
        return state
    if p.chips < h.bet:
        return state  # can't afford
    p.chips -= h.bet
    h.bet *= 2
    h.cards.append(_draw(state))
    _recompute(state)
    if is_bust(h.cards):
        h.status = "bust"
        h.outcome = "bust"
    else:
        h.status = "doubled"
    return _advance_after_hand(state)


def split(state: BjGameState, player_id: str) -> BjGameState:
    cur = _current_hand(state)
    if not cur:
        return state
    p, h = cur
    if p.id != player_id or h.status != "active":
        return state
    # Only on first two cards of equal rank, one split max, affordable.
    if len(p.hands) != 1 or len(h.cards) != 2:
        return state
    if h.cards[0].rank != h.cards[1].rank:
        return state
    if p.chips < h.bet:
        return state
    p.chips -= h.bet
    c1, c2 = h.cards
    hand1 = Hand(cards=[c1, _draw(state)], bet=h.bet, status="active")
    hand2 = Hand(cards=[c2, _draw(state)], bet=h.bet, status="active")

    # Split aces receive exactly one card each and are then done.
    if c1.rank == "A":
        hand1.status = "stand"
        hand2.status = "stand"

    # A drawn 21 after split is 21, NOT a natural blackjack.
    p.hands = [hand1, hand2]
    state.activeHandIndex = 0
    _recompute(state)
    if hand1.status != "active":
        # both aces auto-stood
        return _advance_after_hand(state)
    state.message = f"{p.name}'s turn"
    return state


# ---------- dealer + settlement ----------


def _begin_dealer_turn(state: BjGameState) -> BjGameState:
    state.phase = "dealer_turn"
    state.activePlayerIndex = -1
    state.dealer.holeHidden = False
    state.dealer.status = "playing"
    state.message = "Dealer's turn"
    # If every player busted, dealer doesn't need to draw — settle directly.
    any_live = any(
        h.status in ("stand", "doubled", "blackjack")
        for p in state.players
        for h in p.hands
    )
    if not any_live:
        return _settle(state)
    return _recompute(state)


def dealer_should_hit(state: BjGameState) -> bool:
    """True if the dealer must draw another card under house rules."""
    if state.phase != "dealer_turn":
        return False
    if state.dealer.status not in ("playing",):
        return False
    v, soft = hand_value(state.dealer.cards)
    if v < 17:
        return True
    if v == 17 and soft and state.settings.dealerHitsSoft17:
        return True
    return False


def dealer_draw_one(state: BjGameState) -> BjGameState:
    state.dealer.cards.append(_draw(state))
    _recompute(state)
    if is_bust(state.dealer.cards):
        state.dealer.status = "bust"
    return state


def dealer_finish(state: BjGameState) -> BjGameState:
    """Called once the dealer stops drawing; mark stand if not bust."""
    if state.dealer.status == "playing":
        state.dealer.status = "stand"
    return _settle(state)


def _settle(state: BjGameState) -> BjGameState:
    """Compare every hand vs the dealer, pay out chips, set outcomes."""
    state.phase = "settlement"
    dealer_total, _ = hand_value(state.dealer.cards)
    dealer_bj = state.dealer.status == "blackjack"
    dealer_bust = state.dealer.status == "bust" or dealer_total > 21
    pn = state.settings.blackjackPayoutNum
    pd = state.settings.blackjackPayoutDen

    for p in state.players:
        net = 0
        for h in p.hands:
            if not h.cards:
                continue
            v, _ = hand_value(h.cards)
            if h.status == "bust" or v > 21:
                h.outcome = "bust"
                net -= h.bet
                h.payout = -h.bet
                continue
            if h.status == "blackjack":
                # Bet was escrowed (already removed from chips) at bet time.
                if dealer_bj:
                    h.outcome = "push"
                    p.chips += h.bet  # return escrow only
                    h.payout = 0
                else:
                    payout = (h.bet * pn) // pd  # 3:2 winnings
                    h.outcome = "blackjack"
                    p.chips += h.bet + payout  # return escrow + winnings
                    h.payout = payout
                    net += payout
                continue
            # Regular resolved hand (stand/doubled)
            if dealer_bj:
                h.outcome = "lose"
                net -= h.bet
                h.payout = -h.bet
            elif dealer_bust or v > dealer_total:
                h.outcome = "win"
                p.chips += h.bet * 2  # return escrow + equal winnings
                h.payout = h.bet
                net += h.bet
            elif v == dealer_total:
                h.outcome = "push"
                p.chips += h.bet  # return escrow
                h.payout = 0
            else:
                h.outcome = "lose"
                net -= h.bet
                h.payout = -h.bet
        p.netLastRound = net

    state.phase = "round_over"
    state.activePlayerIndex = -1
    state.message = "Round over"
    return _recompute(state)


# ---------- round transition ----------


def next_round(state: BjGameState) -> BjGameState:
    if state.phase != "round_over":
        return state
    able = [
        p
        for p in state.players
        if not p.bust_out and p.chips >= state.settings.minBet
    ]
    if not able:
        state.phase = "game_over"
        state.message = "Game over"
        return state
    state.round += 1
    return _begin_betting(state)


# ---------- queries used by the driver ----------


def current_expected_player_id(state: BjGameState) -> Optional[str]:
    if state.phase == "betting":
        idx = state.activePlayerIndex
        if 0 <= idx < len(state.players):
            return state.players[idx].id
        return None
    if state.phase == "player_turns":
        cur = _current_hand(state)
        if cur:
            return cur[0].id
        return None
    return None


def auto_advance(
    state: BjGameState,
) -> Optional[Tuple[BjGameState, int]]:
    """Run one automatic transition. Returns (new_state, delay_ms) when the
    engine performed a step on its own, or None when it is waiting for a
    human action (betting / player_turns / round_over / game_over).
    """
    if state.phase == "dealing":
        # _deal_round already runs synchronously inside place_bet's last
        # bettor; this branch exists only if a state was left in 'dealing'.
        return (_begin_player_turns(state), 300)

    if state.phase == "dealer_turn":
        if dealer_should_hit(state):
            return (dealer_draw_one(state), 700)
        if state.dealer.status == "playing":
            return (dealer_finish(state), 500)
        # dealer already bust/stand but not yet settled
        return (_settle(state), 400)

    # betting, player_turns, settlement(->already round_over), round_over,
    # game_over: nothing automatic to do.
    return None
