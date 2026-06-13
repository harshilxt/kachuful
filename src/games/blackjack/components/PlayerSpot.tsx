import { cn } from "../../../lib/utils";
import { Crown, UserMinus } from "lucide-react";
import { HandView } from "./HandView";
import type { BjPlayer } from "../engine/types";

interface Props {
  player: BjPlayer;
  isYou: boolean;
  isHost: boolean;
  activeHandIndex: number | null; // which hand is active, or null
  showOutcome: boolean;
  cardSize?: "sm" | "md" | "lg";
  onKick?: () => void;
}

export function PlayerSpot({
  player,
  isYou,
  isHost,
  activeHandIndex,
  showOutcome,
  cardSize = "md",
  onKick,
}: Props) {
  const hasCards = player.hands.some((h) => h.cards.length > 0);
  const compact = cardSize === "sm";

  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl transition",
        compact ? "gap-1 px-1.5 py-1" : "gap-2 px-3 py-2",
        activeHandIndex !== null && "bg-gold-500/5 ring-1 ring-gold-400/40"
      )}
    >
      {/* Hands */}
      {hasCards ? (
        <div className={cn("flex items-end", compact ? "gap-1.5" : "gap-3")}>
          {player.hands.map((h, i) => (
            <HandView
              key={i}
              hand={h}
              size={cardSize}
              active={activeHandIndex === i}
              showOutcome={showOutcome}
            />
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "flex items-center justify-center",
            compact ? "h-[68px]" : "h-[92px]"
          )}
        >
          {player.pendingBet ? (
            <span className="chip bg-gold-500/15 text-gold-300 text-sm font-semibold">
              Bet ${player.pendingBet}
            </span>
          ) : player.bust_out ? (
            <span className="chip bg-white/5 text-white/40 text-xs">Out</span>
          ) : (
            <span className="text-white/30 text-xs">—</span>
          )}
        </div>
      )}

      {/* Nameplate */}
      <div
        className={cn(
          "panel relative flex items-center gap-2",
          compact ? "px-2 py-1 min-w-[120px]" : "px-3 py-1.5 min-w-[150px]",
          isYou && "ring-1 ring-gold-400/50"
        )}
      >
        <div
          className={cn(
            "rounded-full bg-gradient-to-br from-felt-300 to-felt-600 flex items-center justify-center shrink-0",
            compact ? "w-6 h-6 text-sm" : "w-8 h-8 text-lg",
            isYou && "from-gold-400 to-gold-700"
          )}
        >
          {player.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold truncate">
              {player.name}
            </span>
            {isYou && (
              <span className="chip bg-gold-500/20 text-gold-300 text-[9px] px-1 py-0">
                YOU
              </span>
            )}
            {player.isBot && (
              <span
                title="AI-controlled"
                className="chip bg-fuchsia-500/20 text-fuchsia-300 text-[9px] px-1 py-0 font-bold"
              >
                AI
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] leading-none mt-0.5">
            <span className="text-gold-300 font-bold tabular-nums">
              ${player.chips}
            </span>
            {player.netLastRound !== 0 && (
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  player.netLastRound > 0 ? "text-emerald-300" : "text-red-300"
                )}
              >
                {player.netLastRound > 0 ? "+" : ""}
                {player.netLastRound}
              </span>
            )}
          </div>
        </div>
        {onKick && !isYou && (
          <button
            onClick={onKick}
            title={`Kick ${player.name}`}
            className="w-6 h-6 rounded-md flex items-center justify-center text-white/40 hover:text-red-300 hover:bg-red-500/15 transition shrink-0"
          >
            <UserMinus className="w-3.5 h-3.5" />
          </button>
        )}
        {isHost && (
          <Crown
            className="w-3.5 h-3.5 text-gold-400 absolute -top-1.5 -right-1.5"
            aria-label="Host"
          />
        )}
      </div>
    </div>
  );
}
