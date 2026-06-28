import { motion } from "framer-motion";
import { cn } from "../../../lib/utils";
import type { MPlayer } from "../engine/types";

/** Compact name plate for a player around the table. */
export function SeatPlate({
  player,
  active,
  isLeader,
  win,
  cardCount,
  compact,
}: {
  player: MPlayer;
  active?: boolean;
  isLeader?: boolean;
  /** Pulse + glow when this player just won a trick. */
  win?: boolean;
  cardCount?: number;
  compact?: boolean;
}) {
  const isYourTeam = player.team === 0;
  return (
    <motion.div
      animate={win ? { scale: [1, 1.12, 1.06] } : { scale: 1 }}
      transition={{ duration: 0.45 }}
      className={cn(
        "flex items-center gap-2 rounded-full border backdrop-blur-md transition-all px-2.5 py-1.5",
        win
          ? "border-gold-300 bg-gold-500/25 shadow-glow"
          : active
            ? "border-gold-400 bg-gold-500/15 shadow-glow-soft"
            : "border-white/10 bg-ink-900/60"
      )}
    >
      <div
        className={cn(
          "rounded-full flex items-center justify-center shrink-0",
          compact ? "w-7 h-7 text-base" : "w-9 h-9 text-xl",
          isYourTeam
            ? "bg-gradient-to-br from-emerald-500/40 to-felt-600"
            : "bg-gradient-to-br from-rose-500/40 to-ink-900"
        )}
      >
        {player.avatar}
      </div>
      <div className="leading-tight min-w-0">
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "font-semibold truncate",
              compact ? "text-xs max-w-[84px]" : "text-sm max-w-[130px]"
            )}
          >
            {player.name}
          </span>
          {isLeader && <span title="Leads">▸</span>}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-white/50">
          <span className={isYourTeam ? "text-emerald-300" : "text-rose-300"}>
            {isYourTeam ? "Your team" : "Rivals"}
          </span>
          {cardCount !== undefined && <span>· {cardCount}🂠</span>}
        </div>
      </div>
    </motion.div>
  );
}
