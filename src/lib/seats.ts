import { Player } from "../game/types";

export type Side = "top" | "right" | "bottom" | "left";

export interface SeatGeometry {
  left: string;
  top: string;
  side: Side;
  handAxis: "h" | "v";
  trickOffset: { x: number; y: number; rotation: number };
  angle: number;
  compact: boolean;
}

interface Options {
  trickRadius?: number;
  rx?: number;
  ry?: number;
  isMobile?: boolean;
}

/**
 * Decide table sizing based on player count and viewport.
 * On small screens we always switch to compact seats and a smaller ellipse
 * so opponents don't overflow the edges.
 */
export function layoutScale(n: number, isMobile = false) {
  if (isMobile) {
    if (n <= 4) return { rx: 36, ry: 30, trickRadius: 42, compact: true };
    if (n <= 7) return { rx: 38, ry: 32, trickRadius: 50, compact: true };
    return { rx: 40, ry: 34, trickRadius: 62, compact: true };
  }
  if (n <= 6) return { rx: 42, ry: 38, trickRadius: 55, compact: false };
  if (n <= 10) return { rx: 44, ry: 40, trickRadius: 70, compact: true };
  if (n <= 16) return { rx: 45, ry: 42, trickRadius: 85, compact: true };
  return { rx: 46, ry: 43, trickRadius: 100, compact: true };
}

export function computeSeatGeometry(
  players: Player[],
  humanId: string | null,
  opts: Options = {}
): Record<string, SeatGeometry> {
  const N = players.length;
  if (N === 0) return {};
  const humanIdx = Math.max(
    0,
    players.findIndex((p) => p.id === humanId)
  );
  const scale = layoutScale(N, opts.isMobile);
  const trickRadius = opts.trickRadius ?? scale.trickRadius;
  const rx = opts.rx ?? scale.rx;
  const ry = opts.ry ?? scale.ry;
  const result: Record<string, SeatGeometry> = {};

  for (let i = 0; i < N; i++) {
    const playerIdx = (humanIdx + i) % N;
    const player = players[playerIdx];

    // i=0 is the human at angle 90° (bottom of table). Going clockwise.
    const angleDeg = 90 + (360 / N) * i;
    const angleRad = (angleDeg * Math.PI) / 180;

    const left = 50 + rx * Math.cos(angleRad);
    const top = 50 + ry * Math.sin(angleRad);

    const trickX = trickRadius * Math.cos(angleRad);
    const trickY = trickRadius * Math.sin(angleRad);

    const a = ((angleDeg % 360) + 360) % 360;
    let side: Side;
    if (a >= 45 && a < 135) side = "bottom";
    else if (a >= 135 && a < 225) side = "left";
    else if (a >= 225 && a < 315) side = "top";
    else side = "right";

    const handAxis: "h" | "v" =
      side === "left" || side === "right" ? "v" : "h";

    // Make trick rotation readable but unique per player
    const rawRot = 90 - angleDeg;
    const normalized = ((rawRot + 540) % 360) - 180; // [-180, 180]
    const rotation = Math.max(-28, Math.min(28, normalized * 0.32));

    result[player.id] = {
      left: `${left}%`,
      top: `${top}%`,
      side,
      handAxis,
      trickOffset: { x: trickX, y: trickY, rotation },
      angle: angleDeg,
      compact: scale.compact,
    };
  }

  return result;
}
