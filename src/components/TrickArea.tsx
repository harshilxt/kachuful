import { PlayedCard } from "../game/types";
import { PlayingCard } from "./PlayingCard";
import { SeatGeometry } from "../lib/seats";

interface Props {
  trick: PlayedCard[];
  seatGeometry: Record<string, SeatGeometry>;
  winnerId: string | null;
  radius?: number;
}

const CARD_W = 64;
const CARD_H = 92;

export function TrickArea({ trick, seatGeometry, winnerId, radius = 55 }: Props) {
  // Container must always fit cards plus a little padding
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
        const off = seat.trickOffset;
        return (
          <div
            key={played.card.id}
            className="absolute pointer-events-none transition-transform duration-300 ease-out"
            style={{
              left: `calc(50% + ${off.x - CARD_W / 2}px)`,
              top: `calc(50% + ${off.y - CARD_H / 2}px)`,
              zIndex: isWinner ? 100 : 10 + i,
              transform: `scale(${isWinner ? 1.1 : 1})`,
              opacity: 1,
            }}
          >
            <div style={{ transform: `rotate(${off.rotation}deg)` }}>
              <PlayingCard card={played.card} size="md" glow={isWinner} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
