import { motion } from "framer-motion";
import { cn } from "../../../lib/utils";
import { COLOR_HEX, type UnoCard as UnoCardT } from "../engine/types";

type Size = "xs" | "sm" | "md" | "lg";

interface Props {
  card?: UnoCardT;
  faceDown?: boolean;
  size?: Size;
  selectable?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  highlight?: boolean;
}

const DIMS: Record<Size, { w: number; h: number; big: number; corner: number }> = {
  xs: { w: 44, h: 66, big: 24, corner: 10 },
  sm: { w: 54, h: 80, big: 30, corner: 12 },
  md: { w: 66, h: 98, big: 38, corner: 14 },
  lg: { w: 82, h: 122, big: 48, corner: 17 },
};

/** Centre emblem — the big symbol/number that sits inside the white oval. */
function Emblem({ card, px }: { card: UnoCardT; px: number }) {
  const color = COLOR_HEX[card.color];
  if (card.kind === "number") {
    return (
      <span
        className="font-black italic leading-none"
        style={{ fontSize: px, color, WebkitTextStroke: `${px * 0.03}px rgba(0,0,0,.15)` }}
      >
        {card.value}
      </span>
    );
  }
  if (card.kind === "draw2") {
    return <PlusN n={2} px={px} color={color} />;
  }
  if (card.kind === "wild4") {
    return (
      <div className="flex flex-col items-center" style={{ gap: px * 0.04 }}>
        <ColorWheel d={px * 1.0} />
        <PlusN n={4} px={px * 0.6} color="#fff" stroke />
      </div>
    );
  }
  if (card.kind === "wild") {
    return <ColorWheel d={px * 1.25} />;
  }
  if (card.kind === "skip") {
    return <SkipGlyph d={px * 1.15} color={color} />;
  }
  // reverse
  return <ReverseGlyph d={px * 1.15} color={color} />;
}

function PlusN({ n, px, color, stroke }: { n: number; px: number; color: string; stroke?: boolean }) {
  return (
    <span
      className="font-black italic leading-none"
      style={{
        fontSize: px,
        color,
        WebkitTextStroke: stroke ? `${px * 0.06}px rgba(0,0,0,.55)` : undefined,
      }}
    >
      +{n}
    </span>
  );
}

function ColorWheel({ d }: { d: number }) {
  const r = d / 2;
  return (
    <svg width={d} height={d} viewBox="0 0 100 100" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,.3))" }}>
      <circle cx="50" cy="50" r="48" fill="#111" />
      <path d="M50 50 L50 4 A46 46 0 0 1 96 50 Z" fill={COLOR_HEX.red} />
      <path d="M50 50 L96 50 A46 46 0 0 1 50 96 Z" fill={COLOR_HEX.yellow} />
      <path d="M50 50 L50 96 A46 46 0 0 1 4 50 Z" fill={COLOR_HEX.green} />
      <path d="M50 50 L4 50 A46 46 0 0 1 50 4 Z" fill={COLOR_HEX.blue} />
      <circle cx="50" cy="50" r={r * 0.0 + 7} fill="#fff" opacity="0.0" />
    </svg>
  );
}

function SkipGlyph({ d, color }: { d: number; color: string }) {
  return (
    <svg width={d} height={d} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="11" />
      <line x1="22" y1="22" x2="78" y2="78" stroke={color} strokeWidth="11" strokeLinecap="round" />
    </svg>
  );
}

function ReverseGlyph({ d, color }: { d: number; color: string }) {
  return (
    <svg width={d} height={d} viewBox="0 0 100 100">
      <g stroke={color} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M30 38 L30 30 L18 42" />
        <path d="M30 30 C58 30 70 44 70 58" />
        <path d="M70 62 L70 70 L82 58" />
        <path d="M70 70 C42 70 30 56 30 42" />
      </g>
    </svg>
  );
}

/** Small corner marker. */
function Corner({ card, px, rotate }: { card: UnoCardT; px: number; rotate?: boolean }) {
  let content: React.ReactNode;
  if (card.kind === "number") content = card.value;
  else if (card.kind === "draw2") content = "+2";
  else if (card.kind === "wild4") content = "+4";
  else if (card.kind === "wild") content = "";
  else if (card.kind === "skip") content = <SkipGlyph d={px * 1.4} color="#fff" />;
  else content = <ReverseGlyph d={px * 1.4} color="#fff" />;
  return (
    <span
      className="absolute font-black italic leading-none text-white select-none"
      style={{
        fontSize: px,
        top: rotate ? undefined : px * 0.35,
        bottom: rotate ? px * 0.35 : undefined,
        left: rotate ? undefined : px * 0.4,
        right: rotate ? px * 0.4 : undefined,
        transform: rotate ? "rotate(180deg)" : undefined,
        textShadow: "0 1px 1px rgba(0,0,0,.35)",
      }}
    >
      {content}
    </span>
  );
}

export function UnoCard({
  card,
  faceDown,
  size = "md",
  selectable,
  disabled,
  onClick,
  className,
  highlight,
}: Props) {
  const d = DIMS[size];
  const interactive = !!selectable && !disabled && !!onClick;

  if (faceDown || !card) {
    return (
      <motion.div
        layout
        className={cn("relative rounded-lg shrink-0 shadow-card", className)}
        style={{ width: d.w, height: d.h, background: "#0f0f12", padding: d.w * 0.06 }}
      >
        <div
          className="w-full h-full rounded-md flex items-center justify-center overflow-hidden"
          style={{ background: "#16161a", border: "2px solid #0a0a0c" }}
        >
          <div
            className="rotate-[-20deg] rounded-[50%] flex items-center justify-center"
            style={{
              width: "92%",
              height: "62%",
              background: COLOR_HEX.red,
              boxShadow: "inset 0 0 0 2px rgba(255,255,255,.15)",
            }}
          >
            <span
              className="font-black italic text-white"
              style={{ fontSize: d.big * 0.62, letterSpacing: "-0.04em" }}
            >
              UNO
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  const isWild = card.color === "wild";
  const innerBg = isWild ? "#161616" : COLOR_HEX[card.color];

  const Body = (
    <>
      {/* white border */}
      <div
        className="w-full h-full rounded-md relative overflow-hidden"
        style={{ background: innerBg }}
      >
        {/* the iconic tilted white oval */}
        <div
          className="absolute left-1/2 top-1/2 rounded-[50%]"
          style={{
            width: "118%",
            height: "60%",
            background: "#fff",
            transform: "translate(-50%,-50%) rotate(-22deg)",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,.05)",
          }}
        />
        {/* centre emblem */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Emblem card={card} px={d.big} />
        </div>
        {/* corners */}
        <Corner card={card} px={d.corner} />
        <Corner card={card} px={d.corner} rotate />
      </div>
    </>
  );

  const style = { width: d.w, height: d.h, background: "#fff", padding: d.w * 0.07 };
  const cls = cn(
    "relative rounded-lg shrink-0 shadow-card select-none",
    highlight && "ring-[3px] ring-gold-300 shadow-[0_0_18px_rgba(230,193,119,0.7)]",
    disabled && "opacity-60",
    interactive && "cursor-pointer",
    className
  );

  if (interactive) {
    return (
      <motion.button
        layout
        whileHover={{ y: -12, scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        className={cls}
        style={style}
      >
        {Body}
      </motion.button>
    );
  }
  return (
    <motion.div layout className={cls} style={style}>
      {Body}
    </motion.div>
  );
}
