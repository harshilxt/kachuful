import { motion } from "framer-motion";
import { cn } from "../lib/utils";
import { AlertTriangle } from "lucide-react";

interface Props {
  cardsPerPlayer: number;
  forbiddenBid: number | null;
  onBid: (n: number) => void;
  isMyTurn: boolean;
  bidsSoFar: { name: string; bid: number }[];
}

export function BiddingPanel({
  cardsPerPlayer,
  forbiddenBid,
  onBid,
  isMyTurn,
  bidsSoFar,
}: Props) {
  const options = Array.from({ length: cardsPerPlayer + 1 }, (_, i) => i);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel px-4 py-2.5 max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-sm font-semibold whitespace-nowrap">
          {isMyTurn ? "Your bid:" : "Place Your Bid"}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {options.map((n) => {
            const isForbidden = forbiddenBid === n;
            return (
              <button
                key={n}
                disabled={!isMyTurn || isForbidden}
                onClick={() => onBid(n)}
                className={cn(
                  "h-9 min-w-[36px] px-2 rounded-md font-bold text-base border transition",
                  isForbidden
                    ? "border-red-500/40 bg-red-500/10 text-red-300 cursor-not-allowed line-through"
                    : isMyTurn
                    ? "border-gold-400/40 bg-gold-500/10 text-gold-300 hover:bg-gold-500/25 hover:scale-105"
                    : "border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
                )}
              >
                {n}
              </button>
            );
          })}
        </div>
        {bidsSoFar.length > 0 && (
          <div className="text-[11px] text-white/60 ml-auto">
            {bidsSoFar.map((b, i) => (
              <span key={i} className="mr-2">
                {b.name}: <b className="text-gold-300">{b.bid}</b>
              </span>
            ))}
          </div>
        )}
      </div>
      {forbiddenBid !== null && (
        <div className="flex items-center gap-1.5 text-[11px] text-red-300/90 mt-1.5">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>
            Dealer rule: total bids ≠ {cardsPerPlayer}. Can't bid {forbiddenBid}.
          </span>
        </div>
      )}
      {!isMyTurn && (
        <div className="text-[11px] text-white/50 mt-1">
          Waiting for other players to bid…
        </div>
      )}
    </motion.div>
  );
}
