import { motion } from "framer-motion";
import { GameState } from "../game/types";
import { cn } from "../lib/utils";
import { X } from "lucide-react";

interface Props {
  state: GameState;
  onClose: () => void;
}

export function ScoreBoard({ state, onClose }: Props) {
  const rounds = state.history;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="panel max-w-3xl w-full p-5 max-h-[85vh] overflow-auto scrollbar-thin"
      >
        <div className="flex justify-between items-center mb-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/60">
              Scoreboard
            </div>
            <div className="text-lg font-display font-semibold">
              Round-by-round breakdown
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead className="text-white/60 text-[10px] uppercase">
              <tr>
                <th className="text-left py-1.5 px-2">Round</th>
                <th className="py-1.5 px-2">Trump</th>
                <th className="py-1.5 px-2">Cards</th>
                {state.players.map((p) => (
                  <th key={p.id} className="py-1.5 px-2 text-center">
                    {p.avatar} {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rounds.map((r) => (
                <tr key={r.round} className="border-t border-white/5">
                  <td className="py-1.5 px-2 font-semibold">{r.round}</td>
                  <td className="text-center px-2">
                    {r.trump ?? "NT"}
                  </td>
                  <td className="text-center px-2">{r.cardsPerPlayer}</td>
                  {state.players.map((p) => {
                    const cell = r.perPlayer[p.id];
                    if (!cell)
                      return (
                        <td key={p.id} className="text-center text-white/30">
                          —
                        </td>
                      );
                    const made = cell.bid === cell.tricks;
                    return (
                      <td
                        key={p.id}
                        className="text-center px-2"
                      >
                        <div
                          className={cn(
                            "text-[10px]",
                            made ? "text-emerald-300" : "text-red-300"
                          )}
                        >
                          {cell.bid}/{cell.tricks}
                        </div>
                        <div className="font-semibold">
                          {cell.total}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/15">
                <td colSpan={3} className="py-2 px-2 text-right text-white/60">
                  Total
                </td>
                {state.players.map((p) => (
                  <td
                    key={p.id}
                    className="text-center py-2 px-2 font-bold text-gold-400"
                  >
                    {state.totals[p.id] || 0}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
