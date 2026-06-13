import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../../../lib/utils";
import { useViewport } from "../../../lib/useViewport";
import { Coins, RotateCcw, Check } from "lucide-react";
import { CHIP_DENOMS } from "../engine/types";

interface Props {
  chips: number;
  minBet: number;
  maxBet: number;
  onBet: (amount: number) => void;
}

const CHIP_COLOR: Record<number, string> = {
  10: "from-sky-500 to-sky-700 border-sky-300",
  25: "from-emerald-500 to-emerald-700 border-emerald-300",
  100: "from-fuchsia-500 to-fuchsia-700 border-fuchsia-300",
  500: "from-amber-500 to-amber-700 border-amber-300",
};

export function BettingControls({ chips, minBet, maxBet, onBet }: Props) {
  const [bet, setBet] = useState(0);
  const vp = useViewport();
  const compact = vp.isMobile || vp.isShortHeight;

  const add = (d: number) => setBet((b) => Math.min(maxBet, Math.min(chips, b + d)));
  const clear = () => setBet(0);
  const cap = Math.min(maxBet, chips);
  const canConfirm = bet >= minBet && bet <= cap;

  if (compact) {
    // Single tight row for landscape phones / short screens.
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel px-3 py-1.5 flex items-center gap-2 mx-auto"
      >
        <div className="flex items-center gap-1.5">
          {CHIP_DENOMS.map((d) => (
            <button
              key={d}
              disabled={bet + d > cap}
              onClick={() => add(d)}
              className={cn(
                "w-9 h-9 rounded-full bg-gradient-to-b border-2 text-white font-bold text-[10px] shadow transition",
                "flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed active:scale-95",
                CHIP_COLOR[d]
              )}
            >
              ${d}
            </button>
          ))}
        </div>
        <button
          onClick={clear}
          disabled={bet === 0}
          className="btn-ghost !px-2 !py-1.5 disabled:opacity-40"
          title="Clear bet"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="px-2 text-center min-w-[64px]">
          <div className="text-[9px] uppercase tracking-wider text-white/45 leading-none">
            Bet
          </div>
          <div className="text-lg font-bold text-gold-400 tabular-nums leading-tight">
            ${bet}
          </div>
        </div>
        <button
          onClick={() => canConfirm && onBet(bet)}
          disabled={!canConfirm}
          className="btn-primary !px-3 !py-1.5"
        >
          <Check className="w-4 h-4" /> Deal
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel px-4 py-3 max-w-xl mx-auto"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-widest text-white/60 flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5" /> Place your bet
        </div>
        <div className="text-xs text-white/60">
          Min ${minBet} · Max ${maxBet}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mb-3">
        {CHIP_DENOMS.map((d) => (
          <button
            key={d}
            disabled={bet + d > cap}
            onClick={() => add(d)}
            className={cn(
              "w-12 h-12 rounded-full bg-gradient-to-b border-2 text-white font-bold text-xs shadow-lg transition",
              "flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110 active:scale-95",
              CHIP_COLOR[d]
            )}
          >
            ${d}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={clear}
          disabled={bet === 0}
          className="btn-ghost !px-3 text-sm disabled:opacity-40"
          title="Clear bet"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="panel px-4 py-2 min-w-[120px] text-center">
          <div className="text-[10px] uppercase tracking-wider text-white/50">
            Your bet
          </div>
          <div className="text-2xl font-bold text-gold-400 tabular-nums">
            ${bet}
          </div>
        </div>
        <button
          onClick={() => canConfirm && onBet(bet)}
          disabled={!canConfirm}
          className="btn-primary"
        >
          <Check className="w-4 h-4" /> Deal
        </button>
      </div>
      <div className="text-center text-[11px] text-white/50 mt-2">
        Balance: <span className="text-gold-300 font-semibold">${chips}</span>
      </div>
    </motion.div>
  );
}
