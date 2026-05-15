import { motion } from "framer-motion";
import { SUIT_COLOR, SUIT_GLYPH, SUIT_LABEL, Suit } from "../game/types";
import { cn } from "../lib/utils";

interface Props {
  trump: Suit | null;
  round: number;
  totalRounds: number;
  cardsPerPlayer: number;
}

export function TrumpIndicator({
  trump,
  round,
  totalRounds,
  cardsPerPlayer,
}: Props) {
  const color = trump ? SUIT_COLOR[trump] : null;
  return (
    <motion.div
      layout
      className="panel flex items-center gap-3 px-3 py-2"
    >
      <div className="text-xs uppercase tracking-widest text-white/60">
        Trump
      </div>
      <motion.div
        key={trump ?? "no"}
        initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        className={cn(
          "w-10 h-10 rounded-lg bg-white flex items-center justify-center text-3xl shadow-card",
          color === "red" ? "text-suit-red" : "text-suit-black",
          !trump && "bg-white/10 text-white/70 text-xs font-bold"
        )}
      >
        {trump ? SUIT_GLYPH[trump] : "NT"}
      </motion.div>
      <div>
        <div className="text-sm font-semibold leading-tight">
          {trump ? SUIT_LABEL[trump] : "No Trump"}
        </div>
        <div className="text-[11px] text-white/60">
          Round {round + 1}/{totalRounds} · {cardsPerPlayer} card
          {cardsPerPlayer > 1 ? "s" : ""}
        </div>
      </div>
    </motion.div>
  );
}
