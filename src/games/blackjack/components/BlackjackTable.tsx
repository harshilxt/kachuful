import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Play, Timer } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useViewport } from "../../../lib/useViewport";
import { DealerArea } from "./DealerArea";
import { PlayerSpot } from "./PlayerSpot";
import { BettingControls } from "./BettingControls";
import { ActionBar } from "./ActionBar";
import type { BjGameState } from "../engine/types";

interface Props {
  state: BjGameState;
  youId: string;
  isHost: boolean;
  onAction: (action: Record<string, unknown>) => void;
  onNextRound: () => void;
  onLeave: () => void;
  onReturnToLobby: () => void;
  onKick?: (playerId: string) => void;
}

const TURN_TIMEOUT_SEC = 15;

function expectedPlayerId(state: BjGameState): string | null {
  if (state.phase === "betting" || state.phase === "player_turns") {
    const p = state.players[state.activePlayerIndex];
    return p ? p.id : null;
  }
  return null;
}

export function BlackjackTable({
  state,
  youId,
  isHost,
  onAction,
  onNextRound,
  onLeave,
  onReturnToLobby,
  onKick,
}: Props) {
  const vp = useViewport();
  // Landscape phones are WIDE but SHORT — isMobile (width-based) is false
  // there, so we must also shrink on short height or the table overflows
  // and the top clips.
  const compact = vp.isMobile || vp.isShortHeight;
  const cardSize = compact ? "sm" : "md";

  const expectedId = expectedPlayerId(state);
  const isMyTurn = expectedId === youId;
  const you = state.players.find((p) => p.id === youId);
  const youIndex = state.players.findIndex((p) => p.id === youId);
  const myActiveHand =
    state.phase === "player_turns" && state.activePlayerIndex === youIndex
      ? state.activeHandIndex
      : null;

  // Order players so YOU are last (rightmost / front-and-center bottom).
  const ordered = useMemo(() => {
    const others = state.players.filter((p) => p.id !== youId);
    return you ? [...others, you] : state.players;
  }, [state.players, youId, you]);

  // ----- Visual turn countdown (server enforces the real timeout) -----
  const turnKey = `${state.round}:${state.phase}:${expectedId}:${state.activeHandIndex}`;
  const [timeLeft, setTimeLeft] = useState(TURN_TIMEOUT_SEC);
  const timedPhase = state.phase === "betting" || state.phase === "player_turns";
  useEffect(() => {
    setTimeLeft(TURN_TIMEOUT_SEC);
    if (!timedPhase || !expectedId) return;
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [turnKey, timedPhase, expectedId]);

  const settings = state.settings;
  const roundOver = state.phase === "round_over";

  return (
    <div className="h-[100dvh] relative table-felt overflow-hidden flex flex-col">
      <div className="absolute inset-0 [background-image:radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.55)_100%)] pointer-events-none" />

      {/* Header */}
      <header
        className={cn(
          "relative z-20 px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0",
          compact ? "py-1.5" : "py-2 sm:py-3"
        )}
      >
        <div className="panel px-3 py-1.5">
          <div className="text-[10px] uppercase tracking-widest text-white/50 leading-none">
            Blackjack
          </div>
          <div className="text-xs text-white/70 mt-0.5">Round {state.round}</div>
        </div>
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
          <div className="panel px-3 py-2 text-sm text-white/85 truncate flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gold-400 animate-pulse shrink-0" />
            <span className="truncate">{state.message}</span>
          </div>
          {timedPhase && expectedId && (
            <div
              className={cn(
                "chip font-bold shrink-0",
                timeLeft <= 5
                  ? "bg-red-500/25 text-red-200"
                  : timeLeft <= 10
                  ? "bg-amber-500/25 text-amber-200"
                  : "bg-white/10 text-white/85"
              )}
            >
              <Timer className="w-3.5 h-3.5" />
              {timeLeft}s
            </div>
          )}
        </div>
        <button
          onClick={() => {
            if (confirm("Leave this table?")) onLeave();
          }}
          className="btn-ghost !px-2 sm:!px-4"
          title="Leave"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Dealer */}
      <div
        className={cn(
          "relative z-10 flex justify-center shrink-0",
          compact ? "pt-0.5" : "pt-2"
        )}
      >
        <DealerArea dealer={state.dealer} size={cardSize} />
      </div>

      {/* Players */}
      <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center pb-1 overflow-auto scrollbar-thin">
        <div className="flex items-end gap-2 sm:gap-4 px-3 mx-auto">
          {ordered.map((p) => {
            const pIndex = state.players.findIndex((x) => x.id === p.id);
            const activeHand =
              state.phase === "player_turns" &&
              state.activePlayerIndex === pIndex
                ? state.activeHandIndex
                : null;
            return (
              <PlayerSpot
                key={p.id}
                player={p}
                isYou={p.id === youId}
                isHost={p.id === state.hostId}
                activeHandIndex={activeHand}
                showOutcome={roundOver}
                cardSize={cardSize}
                onKick={
                  isHost && p.id !== youId && onKick
                    ? () => {
                        if (confirm(`Kick ${p.name}?`)) onKick(p.id);
                      }
                    : undefined
                }
              />
            );
          })}
        </div>
      </div>

      {/* Bottom controls */}
      <div
        className={cn(
          "relative z-20 px-3 shrink-0 flex items-center justify-center",
          compact ? "pb-1.5 min-h-[64px]" : "pb-3 min-h-[96px]"
        )}
      >
        <AnimatePresence mode="wait">
          {/* Betting */}
          {state.phase === "betting" && isMyTurn && you && (
            <motion.div key="bet" className="w-full" exit={{ opacity: 0 }}>
              <BettingControls
                chips={you.chips}
                minBet={settings.minBet}
                maxBet={settings.maxBet}
                onBet={(amount) => onAction({ type: "bet", amount })}
              />
            </motion.div>
          )}

          {/* Player action */}
          {state.phase === "player_turns" &&
            isMyTurn &&
            you &&
            myActiveHand !== null &&
            you.hands[myActiveHand] && (
              <motion.div key="act" exit={{ opacity: 0 }}>
                <ActionBar
                  player={you}
                  hand={you.hands[myActiveHand]}
                  onAction={onAction}
                />
              </motion.div>
            )}

          {/* Round over */}
          {roundOver && (
            <motion.div
              key="over"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="panel px-5 py-3 flex items-center gap-4"
            >
              <div className="text-sm">
                {you && (
                  <span
                    className={cn(
                      "font-semibold",
                      you.netLastRound > 0
                        ? "text-emerald-300"
                        : you.netLastRound < 0
                        ? "text-red-300"
                        : "text-white/70"
                    )}
                  >
                    {you.netLastRound > 0
                      ? `You won $${you.netLastRound}`
                      : you.netLastRound < 0
                      ? `You lost $${-you.netLastRound}`
                      : "Push"}
                  </span>
                )}
              </div>
              {isHost ? (
                <button onClick={onNextRound} className="btn-primary">
                  <Play className="w-4 h-4" /> Next Round
                </button>
              ) : (
                <span className="text-xs text-white/55">
                  Waiting for host…
                </span>
              )}
            </motion.div>
          )}

          {/* Game over */}
          {state.phase === "game_over" && (
            <motion.div
              key="gameover"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="panel px-5 py-3 flex items-center gap-4"
            >
              <span className="text-sm text-white/80">
                Game over — everyone's out of chips.
              </span>
              {isHost ? (
                <button onClick={onReturnToLobby} className="btn-primary">
                  Back to Lobby
                </button>
              ) : (
                <span className="text-xs text-white/55">
                  Waiting for host…
                </span>
              )}
            </motion.div>
          )}

          {/* Waiting (not my turn) */}
          {timedPhase && !isMyTurn && (
            <motion.div
              key="wait"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-white/50"
            >
              {state.phase === "betting"
                ? "Waiting for other players to bet…"
                : "Waiting for other players…"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
