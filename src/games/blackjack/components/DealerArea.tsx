import { motion } from "framer-motion";
import { PlayingCard } from "../../../components/PlayingCard";
import { cn } from "../../../lib/utils";
import type { Dealer } from "../engine/types";

interface Props {
  dealer: Dealer;
  size?: "sm" | "md" | "lg";
}

export function DealerArea({ dealer, size = "md" }: Props) {
  const compact = size === "sm";
  const overlap =
    size === "lg" ? "-space-x-8" : size === "sm" ? "-space-x-6" : "-space-x-7";
  const showValue = !dealer.holeHidden && dealer.value > 0;
  const bust = dealer.status === "bust";
  const bj = dealer.status === "blackjack";

  return (
    <div className={cn("flex flex-col items-center", compact ? "gap-0.5" : "gap-2")}>
      <div
        className={cn(
          "uppercase tracking-[0.3em] text-white/55",
          compact ? "text-[9px]" : "text-[11px]"
        )}
      >
        Dealer
      </div>
      <div className={cn("flex", overlap)}>
        {dealer.cards.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: -14, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 240, damping: 20 }}
            style={{ zIndex: i }}
          >
            <PlayingCard card={c} size={size} />
          </motion.div>
        ))}
        {/* Face-down hole card(s) the server is hiding during play */}
        {Array.from({ length: dealer.hiddenCount }).map((_, i) => (
          <motion.div
            key={`hidden-${i}`}
            initial={{ opacity: 0, y: -14, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: (dealer.cards.length + i) * 0.06 }}
            style={{ zIndex: dealer.cards.length + i }}
          >
            <PlayingCard faceDown size={size} />
          </motion.div>
        ))}
      </div>
      <div className={cn("flex items-center", compact ? "h-5" : "h-6")}>
        {showValue ? (
          <span
            className={cn(
              "chip text-sm font-bold tabular-nums",
              bust
                ? "bg-red-500/25 text-red-200"
                : bj
                ? "bg-gold-500/30 text-gold-200"
                : "bg-black/40 text-white/90"
            )}
          >
            {dealer.value}
            {bust ? " · BUST" : bj ? " · BLACKJACK" : ""}
          </span>
        ) : dealer.cards.length > 0 ? (
          <span className="chip text-sm bg-black/40 text-white/70 font-semibold">
            ?
          </span>
        ) : null}
      </div>
    </div>
  );
}
