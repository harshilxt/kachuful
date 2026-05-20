import { useEffect, useState } from "react";
import { PlayedCard } from "../game/types";
import { PlayingCard } from "./PlayingCard";
import { SeatGeometry } from "../lib/seats";

interface Props {
  trick: PlayedCard[];
  seatGeometry: Record<string, SeatGeometry>;
  /** Resolved trick winner — set only once the trick is complete. */
  winnerId: string | null;
  /** Whoever is currently winning while the trick is still in progress. */
  leaderId?: string | null;
  radius?: number;
}

const CARD_W = 64;
const CARD_H = 92;

export function TrickArea({
  trick,
  seatGeometry,
  winnerId,
  leaderId = null,
  radius = 55,
}: Props) {
  const containerW = Math.max(260, radius * 2 + CARD_W + 24);
  const containerH = Math.max(200, radius * 2 + CARD_H + 24);
  return (
    <div
      className="relative"
      style={{ width: `${containerW}px`, height: `${containerH}px` }}
    >
      <div className="absolute inset-0 rounded-full bg-black/20 border border-white/5" />
      {trick.map((played, i) => {
        const seat = seatGeometry[played.playerId];
        if (!seat) return null;
        const isWinner = winnerId === played.playerId;
        const isLeading = !isWinner && leaderId === played.playerId;
        const zIndex = isWinner ? 100 : isLeading ? 50 : 10 + i;
        return (
          <TrickCard
            key={played.card.id}
            played={played}
            seat={seat}
            isWinner={isWinner}
            isLeading={isLeading}
            zIndex={zIndex}
          />
        );
      })}
    </div>
  );
}

function TrickCard({
  played,
  seat,
  isWinner,
  isLeading,
  zIndex,
}: {
  played: PlayedCard;
  seat: SeatGeometry;
  isWinner: boolean;
  isLeading: boolean;
  zIndex: number;
}) {
  const off = seat.trickOffset;
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const farX = off.x * 3.5;
  const farY = off.y * 3.5;

  const restingScale = isWinner ? 1.1 : isLeading ? 1.05 : 1;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `calc(50% + ${off.x - CARD_W / 2}px)`,
        top: `calc(50% + ${off.y - CARD_H / 2}px)`,
        zIndex,
        opacity: entered ? 1 : 0,
        transform: entered
          ? `translate(0, 0) scale(${restingScale})`
          : `translate(${farX - off.x}px, ${farY - off.y}px) scale(0.6)`,
        transition:
          "transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease-out",
      }}
    >
      <div style={{ transform: `rotate(${off.rotation}deg)` }}>
        <PlayingCard
          card={played.card}
          size="md"
          glow={isWinner}
          softGlow={isLeading}
        />
      </div>
    </div>
  );
}
