import { useEffect, useMemo, useState } from "react";
import { GameState } from "../engine/types";
import { TrumpIndicator } from "./TrumpIndicator";
import { PlayerSeat } from "./PlayerSeat";
import { TrickArea } from "./TrickArea";
import { Hand } from "./Hand";
import { BiddingPanel } from "./BiddingPanel";
import { RoundSummary } from "./RoundSummary";
import { ScoreBoard } from "./ScoreBoard";
import { currentExpectedPlayerId, getForbiddenDealerBid } from "../engine/engine";
import { trickWinner } from "../engine/rules";
import { ListOrdered, LogOut, Play, Timer } from "lucide-react";
import { cn } from "../../../lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { computeSeatGeometry, layoutScale } from "../../../lib/seats";
import { useViewport } from "../../../lib/useViewport";

interface Props {
  state: GameState;
  humanId: string;
  onBid: (n: number) => void;
  onPlay: (cardId: string) => void;
  onAcknowledgeRound: () => void;
  onLeave: () => void;
  canAcknowledgeRound?: boolean;
  acknowledgeLabel?: string;
  leaveConfirmMessage?: string;
  /** If provided, host kick UI is rendered on opponent seats. */
  onKick?: (playerId: string) => void;
}

const TURN_TIMEOUT_SEC = 15;

export function GameTable({
  state,
  humanId,
  onBid,
  onPlay,
  onAcknowledgeRound,
  onLeave,
  canAcknowledgeRound = true,
  acknowledgeLabel,
  leaveConfirmMessage = "Quit and return to home?",
  onKick,
}: Props) {
  const [showScoreboard, setShowScoreboard] = useState(false);
  const vp = useViewport();
  const isMobile = vp.isMobile;

  const seatGeometry = useMemo(
    () => computeSeatGeometry(state.players, humanId, { isMobile }),
    [state.players, humanId, isMobile]
  );
  const scale = layoutScale(state.players.length, isMobile);

  const expectedId = currentExpectedPlayerId(state);
  const isHumanTurn = expectedId === humanId;
  const dealerId = state.players[state.dealerIndex].id;
  const human = state.players.find((p) => p.id === humanId);
  const humanHand = state.hands[humanId] || [];

  // Whoever is currently winning the trick — live-updated as each card is
  // played. Falls back to the resolved winner once the trick completes.
  const trickLeaderId =
    state.trickWinnerId ??
    (state.currentTrick.length > 0 && state.leadSuit
      ? trickWinner(state.currentTrick, state.trump, state.leadSuit).playerId
      : null);

  const leader = (() => {
    let best: { id: string; total: number } | null = null;
    for (const p of state.players) {
      const total = state.totals[p.id] || 0;
      if (!best || total > best.total) best = { id: p.id, total };
    }
    return best;
  })();
  const allTied = state.players.every((p) => (state.totals[p.id] || 0) === 0);

  const opponents = state.players.filter((p) => p.id !== humanId);

  const forbidden =
    state.phase === "bidding" && expectedId === humanId && humanId === dealerId
      ? getForbiddenDealerBid(state)
      : null;

  const bidsSoFar = state.bidOrder
    .filter((id) => state.bids[id] !== null)
    .map((id) => ({
      name: state.players.find((p) => p.id === id)?.name ?? "?",
      bid: state.bids[id] as number,
    }));

  // ----- Turn timer (15s) + auto-submit on timeout -----
  const isActiveTurn =
    state.phase === "bidding" || state.phase === "playing";
  const turnKey = `${state.phase}:${expectedId ?? "none"}:${state.currentTrick.length}`;
  const [timeLeft, setTimeLeft] = useState(TURN_TIMEOUT_SEC);

  useEffect(() => {
    setTimeLeft(TURN_TIMEOUT_SEC);
    if (!isActiveTurn || !expectedId) return;
    const id = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [turnKey, isActiveTurn, expectedId]);

  // NOTE: timeout enforcement is now handled by the server. Clients only
  // count down visually so everyone sees a synchronized "seconds left" chip.
  // The server times out the active human and submits a default action
  // (bid 0/1 or lowest legal card) on their behalf — that way a stuck or
  // disconnected client cannot freeze the whole table.

  // ----- Auto-play when only 1 card remains -----
  useEffect(() => {
    if (!isHumanTurn || state.phase !== "playing") return;
    if (humanHand.length !== 1) return;
    const t = setTimeout(() => onPlay(humanHand[0].id), 700);
    return () => clearTimeout(t);
  }, [isHumanTurn, state.phase, humanHand, onPlay]);

  return (
    <div className="h-screen relative table-felt overflow-hidden flex flex-col">
      <div className="absolute inset-0 [background-image:radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.55)_100%)] pointer-events-none" />

      <header className="relative z-20 px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2 shrink-0">
        <TrumpIndicator
          trump={state.trump}
          round={state.round}
          totalRounds={state.totalRounds}
          cardsPerPlayer={state.cardsPerPlayer}
          compact={isMobile}
        />
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
          {!isMobile && (
            <div className="panel px-3 py-2 text-sm text-white/85 flex items-center gap-2 truncate min-w-0">
              <span className="w-2 h-2 rounded-full bg-gold-400 animate-pulse shrink-0" />
              <span className="truncate">{state.message}</span>
            </div>
          )}
          {isActiveTurn && expectedId && (
            <div
              className={cn(
                "chip font-bold transition-colors shrink-0",
                timeLeft <= 5
                  ? "bg-red-500/25 text-red-200"
                  : timeLeft <= 10
                  ? "bg-amber-500/25 text-amber-200"
                  : "bg-white/10 text-white/85"
              )}
              title={isHumanTurn ? "Your turn ends in" : "Their turn ends in"}
            >
              <Timer className="w-3.5 h-3.5" />
              {timeLeft}s
            </div>
          )}
        </div>
        <div className="flex gap-1 sm:gap-2 shrink-0">
          <button
            onClick={() => setShowScoreboard(true)}
            className="btn-ghost !px-2 sm:!px-5"
            title="Scoreboard"
          >
            <ListOrdered className="w-4 h-4" />
            <span className="hidden sm:inline">Scores</span>
          </button>
          <button
            onClick={() => {
              if (confirm(leaveConfirmMessage)) onLeave();
            }}
            className="btn-ghost !px-2 sm:!px-5"
            title="Leave"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="relative flex-1 min-h-0 mx-2 sm:mx-6">
        <div className="absolute inset-0 rounded-[42%/30%] bg-felt-table/30 border border-white/5 shadow-[inset_0_0_60px_rgba(0,0,0,0.45)]" />

        {opponents.map((p) => {
          const seat = seatGeometry[p.id];
          if (!seat) return null;
          return (
            <div
              key={p.id}
              className="absolute z-10"
              style={{
                left: seat.left,
                top: seat.top,
                transform: "translate(-50%, -50%)",
              }}
            >
              <PlayerSeat
                player={p}
                cardCount={state.hands[p.id]?.length || 0}
                bid={state.bids[p.id] ?? null}
                tricks={state.tricksWon[p.id] || 0}
                total={state.totals[p.id] || 0}
                isActive={expectedId === p.id}
                isDealer={p.id === dealerId}
                isHuman={false}
                side={seat.side}
                handAxis={seat.handAxis}
                isLeading={!allTied && leader?.id === p.id}
                compact={seat.compact}
                onKick={
                  onKick
                    ? () => {
                        if (confirm(`Kick ${p.name} from the game?`)) {
                          onKick(p.id);
                        }
                      }
                    : undefined
                }
              />
            </div>
          );
        })}

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
          <TrickArea
            trick={state.currentTrick}
            seatGeometry={seatGeometry}
            winnerId={state.trickWinnerId}
            leaderId={trickLeaderId}
            radius={scale.trickRadius}
          />
        </div>
      </div>

      <div className="relative z-10 pb-2 shrink-0">
        <AnimatePresence mode="wait">
          {state.phase === "bidding" && (
            <motion.div
              key="bidding"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="my-2 px-2"
            >
              <BiddingPanel
                cardsPerPlayer={state.cardsPerPlayer}
                forbiddenBid={forbidden}
                isMyTurn={isHumanTurn}
                onBid={onBid}
                bidsSoFar={bidsSoFar}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {human && (
          <div
            className={cn(
              "relative",
              isHumanTurn && state.phase === "playing" && "z-20"
            )}
          >
            <div className="flex justify-center">
              <PlayerSeat
                player={human}
                cardCount={humanHand.length}
                bid={state.bids[human.id] ?? null}
                tricks={state.tricksWon[human.id] || 0}
                total={state.totals[human.id] || 0}
                isActive={expectedId === human.id}
                isDealer={human.id === dealerId}
                isHuman
                side="bottom"
                handAxis="h"
                isLeading={!allTied && leader?.id === human.id}
                compact={isMobile}
              />
            </div>
            <Hand
              cards={humanHand}
              isMyTurn={isHumanTurn && state.phase === "playing"}
              leadSuit={state.leadSuit}
              canPlay={isHumanTurn && state.phase === "playing"}
              onPlay={(c) => onPlay(c.id)}
              compact={isMobile}
            />
            {isHumanTurn && state.phase === "playing" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute -top-2 left-1/2 -translate-x-1/2 chip bg-gold-500 text-ink-900 shadow-glow"
              >
                <Play className="w-3 h-3" /> Your turn
              </motion.div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {state.phase === "round_summary" && (
          <RoundSummary
            state={state}
            onContinue={onAcknowledgeRound}
            canContinue={canAcknowledgeRound}
            continueLabel={acknowledgeLabel}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showScoreboard && (
          <ScoreBoard state={state} onClose={() => setShowScoreboard(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
