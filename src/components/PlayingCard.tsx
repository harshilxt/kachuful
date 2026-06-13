import { motion } from "framer-motion";
import { Card, SUIT_COLOR, SUIT_GLYPH } from "../games/kachuful/engine/types";
import { cn } from "../lib/utils";

interface Props {
  card?: Card;
  faceDown?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  selectable?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  highlight?: boolean;
  /** Strong glow — used for the resolved trick winner. */
  glow?: boolean;
  /** Softer glow — used for "currently winning so far" during the trick. */
  softGlow?: boolean;
}

const sizeMap = {
  xs: "w-9 h-[52px] text-[11px]",
  sm: "w-12 h-[68px] text-sm",
  md: "w-16 h-[92px] text-base",
  lg: "w-20 h-[112px] text-lg",
};

export function PlayingCard({
  card,
  faceDown,
  size = "md",
  selectable,
  disabled,
  onClick,
  className,
  highlight,
  glow,
  softGlow,
}: Props) {
  if (faceDown || !card) {
    return (
      <motion.div
        layout
        className={cn(
          "rounded-lg shadow-card border border-black/30 relative overflow-hidden",
          sizeMap[size],
          className
        )}
        style={{
          background:
            "repeating-linear-gradient(45deg, #1a3a5c 0 6px, #2a4a6c 6px 12px)",
        }}
      >
        <div className="absolute inset-1 rounded-md border border-gold-500/40 flex items-center justify-center">
          <span className="text-gold-400 font-display text-xs tracking-widest">
            KF
          </span>
        </div>
      </motion.div>
    );
  }
  const color = SUIT_COLOR[card.suit];
  const glyph = SUIT_GLYPH[card.suit];
  const interactive = !!selectable && !disabled;
  if (!selectable) {
    return (
      <motion.div
        layout
        data-card-id={card.id}
        className={cn(
          "rounded-lg bg-white relative shadow-card border border-black/10",
          "flex flex-col select-none",
          sizeMap[size],
          highlight && "ring-2 ring-gold-400 ring-offset-2 ring-offset-felt-700",
          glow && "shadow-glow",
          softGlow && !glow && "shadow-glow-soft",
          className
        )}
      >
        <CardFace rank={card.rank} glyph={glyph} color={color} />
      </motion.div>
    );
  }
  return (
    <motion.button
      layout
      data-card-id={card.id}
      whileHover={interactive ? { y: -10, scale: 1.04 } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      disabled={disabled}
      onClick={interactive ? onClick : undefined}
      className={cn(
        "rounded-lg bg-white relative shadow-card border border-black/10",
        "flex flex-col select-none",
        sizeMap[size],
        interactive && "cursor-pointer",
        disabled && "opacity-40 grayscale",
        highlight && "ring-2 ring-gold-400 ring-offset-2 ring-offset-felt-700",
        glow && "shadow-glow",
        softGlow && !glow && "shadow-glow-soft",
        className
      )}
    >
      <CardFace rank={card.rank} glyph={glyph} color={color} />
    </motion.button>
  );
}

function CardFace({
  rank,
  glyph,
  color,
}: {
  rank: string;
  glyph: string;
  color: "red" | "black";
}) {
  const colorCls = color === "red" ? "text-suit-red" : "text-suit-black";
  return (
    <>
      <div
        className={cn(
          "absolute top-1 left-1.5 leading-none font-bold",
          colorCls
        )}
      >
        <div>{rank}</div>
        <div className="text-[1.1em] -mt-0.5">{glyph}</div>
      </div>
      <div
        className={cn(
          "flex-1 flex items-center justify-center text-3xl",
          colorCls
        )}
      >
        {glyph}
      </div>
      <div
        className={cn(
          "absolute bottom-1 right-1.5 leading-none font-bold rotate-180",
          colorCls
        )}
      >
        <div>{rank}</div>
        <div className="text-[1.1em] -mt-0.5">{glyph}</div>
      </div>
    </>
  );
}
