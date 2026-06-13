import { AnimatePresence, motion } from "framer-motion";
import { Card, Suit } from "../engine/types";
import { PlayingCard } from "../../../components/PlayingCard";
import { legalCards } from "../engine/rules";
import { cn } from "../../../lib/utils";

interface Props {
  cards: Card[];
  isMyTurn: boolean;
  leadSuit: Suit | null;
  canPlay: boolean;
  onPlay: (card: Card) => void;
  compact?: boolean;
}

export function Hand({
  cards,
  isMyTurn,
  leadSuit,
  canPlay,
  onPlay,
  compact = false,
}: Props) {
  const legal = canPlay ? legalCards(cards, leadSuit) : [];
  const legalIds = new Set(legal.map((c) => c.id));
  const fanAngleStep = Math.min(
    compact ? 4 : 6,
    (compact ? 24 : 36) / Math.max(cards.length, 1)
  );
  const start = -((cards.length - 1) * fanAngleStep) / 2;
  const cardSize = compact ? "md" : "lg";
  // Overlap more aggressively when there are many cards on a narrow screen
  const overlap = compact
    ? cards.length > 6
      ? -22
      : cards.length > 4
      ? -16
      : -10
    : -8;

  return (
    <div
      className={cn(
        "flex justify-center items-end px-2 sm:px-4 py-1 sm:py-2 transition-opacity",
        !cards.length && "opacity-0"
      )}
    >
      <AnimatePresence>
        {cards.map((card, i) => {
          const angle = start + i * fanAngleStep;
          const isLegal = canPlay && legalIds.has(card.id);
          return (
            <motion.div
              key={card.id}
              initial={{ y: 80, opacity: 0, rotate: 0 }}
              animate={{ y: 0, opacity: 1, rotate: angle }}
              exit={{ y: -80, opacity: 0, scale: 0.8 }}
              transition={{
                duration: 0.35,
                delay: i * 0.05,
                type: "spring",
                stiffness: 200,
                damping: 22,
              }}
              style={{
                transformOrigin: "bottom center",
                marginInline: `${overlap / 2}px`,
              }}
            >
              <PlayingCard
                card={card}
                size={cardSize}
                selectable={canPlay}
                disabled={canPlay && !isLegal}
                onClick={() => isLegal && onPlay(card)}
                glow={isMyTurn && isLegal}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
