import { motion } from "framer-motion";
import { GameState, SUIT_GLYPH } from "../game/types";
import { cn } from "../lib/utils";
import { Check, X } from "lucide-react";

interface Props {
  state: GameState;
  onContinue: () => void;
  canContinue?: boolean;
  continueLabel?: string;
}

export function RoundSummary({
  state,
  onContinue,
  canContinue = true,
  continueLabel,
}: Props) {
  const last = state.history[state.history.length - 1];
  if (!last) return null;
  const sorted = [...state.players].sort(
    (a, b) =>
      (last.perPlayer[b.id]?.total || 0) - (last.perPlayer[a.id]?.total || 0)
  );
  const isFinal = state.round + 1 >= state.totalRounds;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="panel max-w-lg w-full p-6"
      >
        <div className="text-center mb-4">
          <div className="text-xs uppercase tracking-widest text-white/60">
            Round {last.round} Complete
          </div>
          <div className="text-2xl font-display font-semibold mt-1">
            {last.cardsPerPlayer} card{last.cardsPerPlayer > 1 ? "s" : ""} ·{" "}
            {last.trump ? SUIT_GLYPH[last.trump] : "No Trump"}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="text-white/50 text-xs uppercase">
            <tr>
              <th className="text-left py-1.5 px-2">Player</th>
              <th className="py-1.5 px-2">Bid</th>
              <th className="py-1.5 px-2">Won</th>
              <th className="py-1.5 px-2">+Pts</th>
              <th className="py-1.5 px-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const r = last.perPlayer[p.id];
              const made = r.bid === r.tricks;
              return (
                <tr
                  key={p.id}
                  className="border-t border-white/5"
                >
                  <td className="py-2 px-2 flex items-center gap-2">
                    <span className="text-lg">{p.avatar}</span>
                    <span className="font-medium">{p.name}</span>
                  </td>
                  <td className="text-center px-2">{r.bid}</td>
                  <td className="text-center px-2">{r.tricks}</td>
                  <td className="text-center px-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        made ? "text-emerald-400" : "text-red-400"
                      )}
                    >
                      {made ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      {r.points}
                    </span>
                  </td>
                  <td className="text-right px-2 font-bold text-gold-400">
                    {r.total}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className="btn-primary w-full mt-5"
        >
          {continueLabel ??
            (canContinue
              ? isFinal
                ? "See Final Results"
                : "Next Round"
              : "Waiting for host…")}
        </button>
      </motion.div>
    </motion.div>
  );
}
