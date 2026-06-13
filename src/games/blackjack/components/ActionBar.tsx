import { motion } from "framer-motion";
import { cn } from "../../../lib/utils";
import { Hand as HandIcon, Square, Layers, Copy } from "lucide-react";
import type { BjPlayer, Hand } from "../engine/types";

interface Props {
  player: BjPlayer;
  hand: Hand;
  onAction: (action: Record<string, unknown>) => void;
}

export function ActionBar({ player, hand, onAction }: Props) {
  const twoCards = hand.cards.length === 2;
  const canDouble = twoCards && player.chips >= hand.bet;
  const canSplit =
    twoCards &&
    player.hands.length === 1 &&
    hand.cards[0].rank === hand.cards[1].rank &&
    player.chips >= hand.bet;

  const Btn = ({
    label,
    icon,
    onClick,
    enabled = true,
    tone = "primary",
  }: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    enabled?: boolean;
    tone?: "primary" | "ghost";
  }) => (
    <button
      onClick={() => enabled && onClick()}
      disabled={!enabled}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 rounded-xl px-5 py-2.5 font-semibold transition min-w-[78px]",
        tone === "primary"
          ? "bg-gold-500 text-ink-900 hover:bg-gold-400 active:scale-95 shadow-lg shadow-black/30"
          : "bg-white/10 text-white border border-white/15 hover:bg-white/15 active:scale-95",
        !enabled && "opacity-30 cursor-not-allowed hover:bg-current"
      )}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center gap-2 sm:gap-3"
    >
      <Btn label="Hit" icon={<HandIcon className="w-5 h-5" />} onClick={() => onAction({ type: "hit" })} />
      <Btn label="Stand" icon={<Square className="w-5 h-5" />} onClick={() => onAction({ type: "stand" })} />
      <Btn
        label="Double"
        icon={<Copy className="w-5 h-5" />}
        tone="ghost"
        enabled={canDouble}
        onClick={() => onAction({ type: "double" })}
      />
      <Btn
        label="Split"
        icon={<Layers className="w-5 h-5" />}
        tone="ghost"
        enabled={canSplit}
        onClick={() => onAction({ type: "split" })}
      />
    </motion.div>
  );
}
