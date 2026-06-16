import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../../lib/utils";
import { Crown, UserMinus, WifiOff, ChevronDown } from "lucide-react";
import { UnoCard } from "./UnoCard";
import type { UnoPlayer } from "../engine/types";

interface Props {
  player: UnoPlayer;
  isActive: boolean;
  isHostPlayer: boolean;
  connected: boolean;
  compact: boolean;
  /** Transient effect badge, e.g. { text: "SKIPPED", color: "#e8a200" }. */
  flash?: { text: string; color: string } | null;
  onKick?: () => void;
}

export function OpponentSeat({
  player,
  isActive,
  isHostPlayer,
  connected,
  compact,
  flash,
  onKick,
}: Props) {
  const shown = Math.min(player.handCount, compact ? 5 : 7);
  const backs = Array.from({ length: Math.max(shown, 0) });
  const atUno = player.handCount === 1;

  return (
    <motion.div
      className="relative flex flex-col items-center gap-1"
      animate={{ scale: isActive ? 1.06 : 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
    >
      {/* active spotlight glow behind the whole seat */}
      {isActive && (
        <motion.div
          layoutId="uno-turn-glow"
          className="absolute -inset-3 -z-10 rounded-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(230,193,119,0.45) 0%, rgba(230,193,119,0) 70%)",
          }}
          transition={{ type: "spring", stiffness: 200, damping: 26 }}
        />
      )}

      {/* bouncing turn pointer */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: [0, 5, 0] }}
            exit={{ opacity: 0 }}
            transition={{ y: { repeat: Infinity, duration: 0.9 } }}
            className="absolute -top-5 text-gold-300"
          >
            <ChevronDown className="w-6 h-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* fanned backs */}
      <div className="flex items-end" style={{ height: compact ? 34 : 46 }}>
        {backs.map((_, i) => (
          <div
            key={i}
            style={{
              marginLeft: i === 0 ? 0 : compact ? -22 : -28,
              transform: `rotate(${(i - (backs.length - 1) / 2) * 5}deg)`,
              transformOrigin: "bottom center",
            }}
          >
            <UnoCard faceDown size={compact ? "xs" : "sm"} />
          </div>
        ))}
        {player.handCount === 0 && (
          <div className="text-white/30 text-xs px-2">—</div>
        )}
      </div>

      {/* nameplate */}
      <div
        className={cn(
          "panel relative flex items-center gap-1.5 px-2 py-1 transition-shadow",
          isActive &&
            "ring-2 ring-gold-300 shadow-[0_0_20px_rgba(230,193,119,0.6)]",
          !connected && "opacity-60"
        )}
      >
        <div
          className={cn(
            "w-6 h-6 rounded-full bg-gradient-to-br from-felt-300 to-felt-600 flex items-center justify-center text-sm shrink-0",
            isActive && "from-gold-400 to-gold-600"
          )}
        >
          {player.avatar}
        </div>
        <div className="leading-tight min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold truncate max-w-[80px]">
              {player.name}
            </span>
            {player.isBot && (
              <span className="text-[8px] font-bold text-fuchsia-300 bg-fuchsia-500/20 px-1 rounded">
                AI
              </span>
            )}
            {!connected && <WifiOff className="w-3 h-3 text-white/40" />}
          </div>
          <div className="text-[10px] text-white/55 flex items-center gap-1">
            🂠 {player.handCount}
            <span className="text-gold-400 font-semibold">· {player.score}</span>
          </div>
        </div>
        {isHostPlayer && (
          <Crown className="w-3 h-3 text-gold-400 absolute -top-1.5 -right-1.5" />
        )}
        {onKick && (
          <button
            onClick={onKick}
            title={`Kick ${player.name}`}
            className="w-5 h-5 rounded flex items-center justify-center text-white/40 hover:text-red-300 hover:bg-red-500/15 transition"
          >
            <UserMinus className="w-3 h-3" />
          </button>
        )}
        {atUno && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -left-2 text-[9px] font-black bg-gold-500 text-ink-900 px-1.5 py-0.5 rounded-full shadow-glow"
          >
            UNO
          </motion.div>
        )}
      </div>

      {/* transient skip / +2 / +4 badge over this seat */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ scale: 0.3, opacity: 0, y: 0 }}
            animate={{ scale: 1, opacity: 1, y: -6 }}
            exit={{ scale: 1.3, opacity: 0, y: -16 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
          >
            <div
              className="px-2.5 py-1 rounded-lg font-black text-sm tracking-wide text-white shadow-xl whitespace-nowrap"
              style={{ background: flash.color, WebkitTextStroke: "0.5px rgba(0,0,0,.3)" }}
            >
              {flash.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
