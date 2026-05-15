import { AnimatePresence, motion } from "framer-motion";
import { Card, Suit } from "../game/types";
import { PlayingCard } from "./PlayingCard";
import { legalCards } from "../game/rules";
import { cn } from "../lib/utils";

interface Props {
  cards: Card[];
  isMyTurn: boolean;
  leadSuit: Suit | null;
  canPlay: boolean;
  onPlay: (card: Card) => void;
}

export function Hand({ cards, isMyTurn, leadSuit, canPlay, onPlay }: Props) {
  const legal = canPlay ? legalCards(cards, leadSuit) : [];
  const legalIds = new Set(legal.map((c) => c.id));
  const fanAngleStep = Math.min(6, 36 / Math.max(cards.length, 1));
  const start = -((cards.length - 1) * fanAngleStep) / 2;

  return (
    <div
      className={cn(
        "flex justify-center items-end gap-1 px-4 py-2 transition-opacity",
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
                marginInline: -8,
              }}
            >
              <PlayingCard
                card={card}
                size="lg"
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
