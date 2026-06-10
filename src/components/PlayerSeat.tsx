import { motion } from "framer-motion";
import { Player } from "../game/types";
import { PlayingCard } from "./PlayingCard";
import { cn } from "../lib/utils";
import { Crown, UserMinus } from "lucide-react";
import { Side } from "../lib/seats";

interface Props {
  player: Player;
  cardCount: number;
  bid: number | null;
  tricks: number;
  total: number;
  isActive: boolean;
  isDealer: boolean;
  isHuman: boolean;
  side: Side;
  handAxis: "h" | "v";
  isLeading?: boolean;
  compact?: boolean;
  /** When provided, renders a kick button (host-only UI) for this seat. */
  onKick?: () => void;
}

export function PlayerSeat({
  player,
  cardCount,
  bid,
  tricks,
  total,
  isActive,
  isDealer,
  isHuman,
  side,
  handAxis,
  isLeading,
  compact = false,
  onKick,
}: Props) {
  const made = bid !== null && tricks === bid;
  const overshot = bid !== null && tricks > bid;

  const namePlate = compact ? (
    <motion.div
      layout
      className={cn(
        "panel relative px-2 py-1.5 min-w-[88px] max-w-[120px] flex items-center gap-1.5 transition-all",
        isActive && "ring-2 ring-gold-400 animate-pulseRing"
      )}
    >
      <div
        className={cn(
          "w-7 h-7 rounded-full bg-gradient-to-br from-felt-300 to-felt-600 flex items-center justify-center text-base shrink-0",
          isHuman && "from-gold-400 to-gold-700"
        )}
      >
        {player.avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-0.5">
          <span className="text-[11px] font-semibold truncate">
            {player.name}
          </span>
          {player.isBot && (
            <span
              title="AI-controlled"
              className="text-[8px] font-bold tracking-wider text-fuchsia-300 bg-fuchsia-500/20 px-1 py-px rounded leading-none"
            >
              AI
            </span>
          )}
          {isDealer && (
            <span
              title="Dealer"
              className="text-[9px] text-gold-400 font-bold"
            >
              D
            </span>
          )}
          {isLeading && <Crown className="w-3 h-3 text-gold-400" />}
        </div>
        <div className="flex items-center gap-1 text-[10px] leading-none mt-0.5 text-white/70">
          <span
            className={cn(
              made && "text-emerald-300",
              overshot && "text-red-300"
            )}
          >
            {bid ?? "—"}/{tricks}
          </span>
          <span className="text-gold-400 font-semibold">·{total}</span>
          {!isHuman && cardCount > 0 && (
            <span className="text-white/40 ml-auto">🂠{cardCount}</span>
          )}
        </div>
      </div>
      {onKick && (
        <button
          onClick={onKick}
          title={`Kick ${player.name}`}
          className="w-5 h-5 rounded flex items-center justify-center text-white/40 hover:text-red-300 hover:bg-red-500/15 transition shrink-0"
        >
          <UserMinus className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  ) : (
    <motion.div
      layout
      className={cn(
        "panel relative px-3 py-2 min-w-[140px] flex items-center gap-2 transition-all",
        isActive && "ring-2 ring-gold-400 animate-pulseRing"
      )}
    >
      <div
        className={cn(
          "w-9 h-9 rounded-full bg-gradient-to-br from-felt-300 to-felt-600 flex items-center justify-center text-xl shrink-0",
          isHuman && "from-gold-400 to-gold-700"
        )}
      >
        {player.avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold truncate">{player.name}</span>
          {player.isBot && (
            <span
              title="AI-controlled"
              className="chip bg-fuchsia-500/20 text-fuchsia-300 px-1.5 py-0 text-[10px] font-bold tracking-wider"
            >
              AI
            </span>
          )}
          {isDealer && (
            <span
              title="Dealer"
              className="chip bg-gold-500/20 text-gold-400 px-1.5 py-0 text-[10px]"
            >
              D
            </span>
          )}
          {isLeading && <Crown className="w-3.5 h-3.5 text-gold-400" />}
        </div>
        <div className="flex items-center gap-2 text-[11px] mt-0.5">
          <span
            className={cn(
              "chip",
              bid === null
                ? "bg-white/10 text-white/60"
                : made
                ? "bg-emerald-500/20 text-emerald-300"
                : overshot
                ? "bg-red-500/20 text-red-300"
                : "bg-white/10 text-white/80"
            )}
          >
            Bid {bid ?? "—"}
          </span>
          <span className="chip bg-white/10 text-white/80">Won {tricks}</span>
        </div>
      </div>
      <div className="text-right pl-2 border-l border-white/10">
        <div className="text-[10px] uppercase tracking-wider text-white/50">
          Total
        </div>
        <div className="text-base font-bold text-gold-400 leading-none">
          {total}
        </div>
      </div>
      {onKick && (
        <button
          onClick={onKick}
          title={`Kick ${player.name}`}
          className="ml-1 w-6 h-6 rounded-md flex items-center justify-center text-white/40 hover:text-red-300 hover:bg-red-500/15 transition shrink-0"
        >
          <UserMinus className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  );

  // In compact mode we skip the visual card stack entirely. Hand size is
  // shown numerically inside the panel instead, so opponents don't get
  // pushed off-screen on narrow viewports.
  const cardsBlock =
    !compact && cardCount > 0 && !isHuman ? (
      <div
        className={cn(
          "flex pointer-events-none",
          handAxis === "h" ? "flex-row -space-x-7" : "flex-col -space-y-14"
        )}
      >
        {Array.from({ length: cardCount }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.04 }}
            style={{
              transform: handAxis === "v" ? "rotate(90deg)" : undefined,
            }}
          >
            <PlayingCard faceDown size="sm" />
          </motion.div>
        ))}
      </div>
    ) : null;

  // Order children so the cards sit between the nameplate and the table center.
  // top: nameplate above, cards below
  // bottom: cards above, nameplate below (human bottom has no cards)
  // left: nameplate left, cards right
  // right: cards left, nameplate right
  const containerCls =
    side === "top"
      ? "flex flex-col items-center gap-2"
      : side === "bottom"
      ? "flex flex-col-reverse items-center gap-2"
      : side === "left"
      ? "flex flex-row items-center gap-3"
      : "flex flex-row-reverse items-center gap-3";

  return (
    <div className={containerCls}>
      {namePlate}
      {cardsBlock}
    </div>
  );
}
