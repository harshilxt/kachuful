import { AnimatePresence, motion } from "framer-motion";
import { UnoCard } from "./UnoCard";
import { cn } from "../../../lib/utils";
import type { UnoCard as UnoCardT, UnoColor } from "../engine/types";

interface Props {
  cards: UnoCardT[];
  isMyTurn: boolean;
  currentColor: UnoColor;
  topCard: UnoCardT | null;
  drawnPlayableId: string | null;
  compact: boolean;
  onPlay: (card: UnoCardT) => void;
}

function isPlayable(
  card: UnoCardT,
  top: UnoCardT | null,
  color: UnoColor
): boolean {
  if (card.kind === "wild" || card.kind === "wild4") return true;
  if (!top) return true;
  if (card.color === color) return true;
  if (card.kind === "number" && top.kind === "number" && card.value === top.value)
    return true;
  if (card.kind !== "number" && card.kind === top.kind) return true;
  return false;
}

// Card widths (must match DIMS in UnoCard).
const CARD_W = { md: 66, lg: 82 } as const;

export function MyHand({
  cards,
  isMyTurn,
  currentColor,
  topCard,
  drawnPlayableId,
  compact,
  onPlay,
}: Props) {
  const size: "md" | "lg" = compact ? "md" : "lg";
  const w = CARD_W[size];

  // How much of each card stays visible — shrink as the hand grows so a big
  // hand still fits, but keep cards comfortably readable when there are few.
  const n = cards.length;
  const maxVisible = compact ? 34 : 50;
  const minVisible = compact ? 20 : 30;
  const visible =
    n <= 7 ? maxVisible : Math.max(minVisible, maxVisible - (n - 7) * 3);
  const step = visible - w; // negative margin between cards

  return (
    <div
      className="flex justify-center items-end px-2 overflow-x-auto scrollbar-thin"
      style={{ minHeight: compact ? 110 : 150 }}
    >
      <div className="flex items-end pt-6 pb-1">
        <AnimatePresence initial={false}>
          {cards.map((card, i) => {
            const legalNow =
              isMyTurn &&
              isPlayable(card, topCard, currentColor) &&
              (drawnPlayableId === null || drawnPlayableId === card.id);
            const dim = isMyTurn && !legalNow;
            return (
              <motion.div
                key={card.id}
                layout
                initial={{ y: 70, opacity: 0 }}
                animate={{ y: legalNow ? -18 : 0, opacity: 1 }}
                exit={{ y: -90, opacity: 0, scale: 0.7 }}
                whileHover={legalNow ? { y: -30 } : undefined}
                transition={{ type: "spring", stiffness: 280, damping: 26 }}
                style={{ marginLeft: i === 0 ? 0 : step, zIndex: legalNow ? 100 + i : i }}
                className={cn(legalNow && "relative")}
              >
                <UnoCard
                  card={card}
                  size={size}
                  selectable={legalNow}
                  disabled={dim}
                  highlight={legalNow}
                  onClick={() => legalNow && onPlay(card)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
