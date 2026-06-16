import { useEffect, useState } from "react";
import { UnoCard } from "./UnoCard";
import type { UnoCard as UnoCardT } from "../engine/types";

interface Props {
  card: UnoCardT;
  /** Source position as percentages within the table area. */
  fromLeft: string;
  fromTop: string;
  size: "md" | "lg";
  onDone: () => void;
}

/**
 * A card that flies from a player's seat onto the centre discard pile.
 * Uses a CSS transition (percentages interpolate reliably) plus a slight
 * spin so it reads like someone tossed it in.
 */
export function ThrownCard({ card, fromLeft, fromTop, size, onDone }: Props) {
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setLanded(true))
    );
    const t = setTimeout(onDone, 480);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [onDone]);

  return (
    <div
      className="absolute z-30 pointer-events-none"
      style={{
        left: landed ? "50%" : fromLeft,
        top: landed ? "50%" : fromTop,
        transform: `translate(-50%, -50%) rotate(${landed ? 0 : -35}deg) scale(${
          landed ? 1 : 0.7
        })`,
        opacity: landed ? 1 : 0.4,
        transition:
          "left 460ms cubic-bezier(0.22,1,0.36,1), top 460ms cubic-bezier(0.22,1,0.36,1), transform 460ms cubic-bezier(0.22,1,0.36,1), opacity 200ms ease-out",
      }}
    >
      <UnoCard card={card} size={size} />
    </div>
  );
}
