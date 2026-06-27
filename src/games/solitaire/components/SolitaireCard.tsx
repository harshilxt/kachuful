import { motion } from "framer-motion";
import { SUIT_COLOR, SUIT_GLYPH } from "../../kachuful/engine/types";
import { cn } from "../../../lib/utils";
import type { Card } from "../engine/types";

interface Props {
  card?: Card;
  faceDown?: boolean;
  w: number;
  h: number;
  selected?: boolean;
  hint?: boolean;
  layoutId?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  style?: React.CSSProperties;
}

export function SolitaireCard({
  card,
  faceDown,
  w,
  h,
  selected,
  hint,
  layoutId,
  onClick,
  onDoubleClick,
  style,
}: Props) {
  const radius = Math.round(w * 0.12);
  const common: React.CSSProperties = {
    width: w,
    height: h,
    borderRadius: radius,
    ...style,
  };

  if (faceDown || !card) {
    return (
      <motion.div
        layout
        layoutId={layoutId}
        onClick={onClick}
        className={cn(
          "relative border shadow-card select-none",
          card === undefined && !faceDown
            ? "border-white/15 bg-white/5" // empty slot placeholder
            : "border-black/40",
          onClick && "cursor-pointer"
        )}
        style={{
          ...common,
          background:
            faceDown || card
              ? "repeating-linear-gradient(45deg,#0c3d2a 0 6px,#0f4a32 6px 12px)"
              : undefined,
        }}
      >
        {(faceDown || card) && (
          <div
            className="absolute inset-[3px] rounded-[inherit] border border-gold-500/40 flex items-center justify-center"
            style={{ borderRadius: radius - 2 }}
          >
            <span
              className="font-display font-bold text-gold-400/90"
              style={{ fontSize: Math.round(w * 0.34) }}
            >
              ♣♥
            </span>
          </div>
        )}
      </motion.div>
    );
  }

  const color = SUIT_COLOR[card.suit];
  const glyph = SUIT_GLYPH[card.suit];
  const colorCls = color === "red" ? "text-suit-red" : "text-suit-black";
  const cornerSize = Math.round(h * 0.2);
  const centerSize = Math.round(h * 0.34);

  return (
    <motion.button
      layout
      layoutId={layoutId}
      type="button"
      data-card-id={card.id}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      whileHover={{ y: -3 }}
      className={cn(
        "relative bg-white shadow-card border flex flex-col select-none cursor-pointer overflow-hidden",
        selected
          ? "border-gold-400 ring-2 ring-gold-400 ring-offset-1 ring-offset-felt-700 z-20"
          : "border-black/15",
        hint && !selected && "ring-2 ring-emerald-300/70"
      )}
      style={common}
    >
      <div
        className={cn("absolute font-bold leading-none", colorCls)}
        style={{ top: Math.round(h * 0.05), left: Math.round(w * 0.08) }}
      >
        <div style={{ fontSize: cornerSize }}>{card.rank}</div>
        <div style={{ fontSize: cornerSize, marginTop: -2 }}>{glyph}</div>
      </div>
      <div
        className={cn("flex-1 flex items-center justify-center", colorCls)}
        style={{ fontSize: centerSize }}
      >
        {glyph}
      </div>
    </motion.button>
  );
}
