import { motion } from "framer-motion";
import { PlayingCard } from "../../../components/PlayingCard";
import { cn } from "../../../lib/utils";
import type { Hand } from "../engine/types";

interface Props {
  hand: Hand;
  size?: "sm" | "md" | "lg";
  active?: boolean;
  showOutcome?: boolean;
}

const OUTCOME_LABEL: Record<string, string> = {
  win: "WIN",
  lose: "LOST",
  push: "PUSH",
  blackjack: "BLACKJACK",
  bust: "BUST",
};

const OUTCOME_CLASS: Record<string, string> = {
  win: "bg-emerald-500/25 text-emerald-200 border-emerald-400/40",
  blackjack: "bg-gold-500/30 text-gold-200 border-gold-400/50",
  lose: "bg-red-500/20 text-red-200 border-red-400/40",
  bust: "bg-red-500/25 text-red-200 border-red-400/50",
  push: "bg-white/15 text-white/80 border-white/30",
};

export function HandView({ hand, size = "md", active, showOutcome }: Props) {
  const compact = size === "sm";
  const overlap =
    size === "lg" ? "-space-x-8" : size === "md" ? "-space-x-7" : "-space-x-6";
  const isBust = hand.status === "bust" || hand.value > 21;
  const isBj = hand.status === "blackjack";

  return (
    <div className={cn("flex flex-col items-center", compact ? "gap-1" : "gap-1.5")}>
      <div
        className={cn(
          "relative flex rounded-xl p-1 transition",
          overlap,
          active && "ring-2 ring-gold-400 ring-offset-2 ring-offset-felt-700 rounded-lg"
        )}
      >
        {hand.cards.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: -16, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 240, damping: 20 }}
            style={{ zIndex: i }}
          >
            <PlayingCard card={c} size={size} />
          </motion.div>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        {/* Hand total pill */}
        <span
          className={cn(
            "chip text-xs font-bold tabular-nums",
            isBust
              ? "bg-red-500/25 text-red-200"
              : isBj
              ? "bg-gold-500/30 text-gold-200"
              : "bg-black/40 text-white/90"
          )}
        >
          {hand.value}
          {hand.soft && hand.value <= 21 ? " (soft)" : ""}
        </span>
        {/* Bet pill */}
        {hand.bet > 0 && (
          <span className="chip text-xs bg-white/10 text-gold-300 font-semibold">
            ${hand.bet}
          </span>
        )}
        {/* Outcome badge */}
        {showOutcome && hand.outcome !== "pending" && (
          <span
            className={cn(
              "chip text-[10px] font-bold border tracking-wider",
              OUTCOME_CLASS[hand.outcome] || "bg-white/10 text-white/80"
            )}
          >
            {OUTCOME_LABEL[hand.outcome] || hand.outcome.toUpperCase()}
            {hand.payout > 0 ? ` +$${hand.payout}` : ""}
          </span>
        )}
      </div>
    </div>
  );
}
