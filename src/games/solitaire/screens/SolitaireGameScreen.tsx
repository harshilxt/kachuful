import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  Hash,
  Trophy,
  Undo2,
  RotateCcw,
  Plus,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { SUITS, SUIT_GLYPH, SUIT_COLOR } from "../../kachuful/engine/types";
import { useViewport } from "../../../lib/useViewport";
import { cn } from "../../../lib/utils";
import { useSolitaireStore } from "../store";
import { SolitaireCard } from "../components/SolitaireCard";
import {
  canAutoComplete,
  canDrop,
  elapsedSeconds,
  getMovingCards,
} from "../engine/engine";
import type { Card, MoveSource, MoveTarget, Suit } from "../engine/types";

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

interface DragInfo {
  source: MoveSource;
  cards: Card[];
  grabX: number;
  grabY: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  moved: boolean;
}

export function SolitaireGameScreen() {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useViewport();
  const state = useSolitaireStore((s) => s.state);
  const autoFinishing = useSolitaireStore((s) => s.autoFinishing);
  const history = useSolitaireStore((s) => s.history);
  const drawCard = useSolitaireStore((s) => s.drawCard);
  const move = useSolitaireStore((s) => s.move);
  const sendToFoundation = useSolitaireStore((s) => s.sendToFoundation);
  const undo = useSolitaireStore((s) => s.undo);
  const newGame = useSolitaireStore((s) => s.newGame);
  const restart = useSolitaireStore((s) => s.restart);
  const autoFinish = useSolitaireStore((s) => s.autoFinish);

  // Ensure a game exists.
  useEffect(() => {
    if (!useSolitaireStore.getState().state) newGame();
  }, [newGame]);

  // Clock.
  const [now, setNow] = useState(() => Date.now());
  const frozen = useRef<number | null>(null);
  useEffect(() => {
    if (state?.won) {
      if (frozen.current === null) frozen.current = Date.now();
      return;
    }
    frozen.current = null;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [state?.won]);

  // ---- Drag state ----
  const dragRef = useRef<DragInfo | null>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const [dragView, setDragView] = useState<{ cards: Card[] } | null>(null);

  // Geometry.
  const W = isMobile ? 46 : isTablet ? 72 : 96;
  const H = Math.round(W * 1.4);
  const downOff = Math.round(H * 0.18);
  const upOff = Math.round(H * 0.32);
  const gap = isMobile ? 5 : isTablet ? 12 : 18;
  const boardW = 7 * W + 6 * gap;
  // Give columns real height so the table fills the screen instead of floating.
  const colMinH = downOff * 6 + upOff * 4 + H;

  if (!state) return null;
  const s = state;

  const secs = elapsedSeconds(s, s.won ? frozen.current ?? now : now);
  const autoReady = canAutoComplete(s) && !autoFinishing;
  const dragCards = dragView?.cards ?? null;
  const draggedIds = new Set(dragCards?.map((c) => c.id));
  const hintOK = (t: MoveTarget) => !!dragCards && canDrop(s, dragCards, t);

  function dropTargetAt(x: number, y: number): MoveTarget | null {
    const els = document.elementsFromPoint(x, y);
    for (const el of els) {
      const d = (el as HTMLElement).dataset?.drop;
      if (!d) continue;
      if (d.startsWith("tab:")) return { kind: "tableau", col: Number(d.slice(4)) };
      if (d.startsWith("found:"))
        return { kind: "foundation", suit: d.slice(6) as Suit };
    }
    return null;
  }

  function beginDrag(source: MoveSource, e: React.PointerEvent) {
    if (s.won || autoFinishing) return;
    const cards = getMovingCards(s, source);
    if (!cards) return;
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const info: DragInfo = {
      source,
      cards,
      grabX: e.clientX - rect.left,
      grabY: e.clientY - rect.top,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
    };
    dragRef.current = info;
    setDragView({ cards });

    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      d.lastX = ev.clientX;
      d.lastY = ev.clientY;
      if (Math.hypot(ev.clientX - d.startX, ev.clientY - d.startY) > 6)
        d.moved = true;
      if (floatRef.current) {
        floatRef.current.style.transform = `translate(${ev.clientX - d.grabX}px, ${ev.clientY - d.grabY}px) rotate(2deg)`;
      }
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const d = dragRef.current;
      dragRef.current = null;
      setDragView(null);
      if (!d) return;
      if (!d.moved) {
        // a tap → quick send to foundation
        sendToFoundation(d.source);
        return;
      }
      const target = dropTargetAt(ev.clientX, ev.clientY);
      if (target) move(d.source, target);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const initialFloat = dragRef.current
    ? `translate(${dragRef.current.lastX - dragRef.current.grabX}px, ${dragRef.current.lastY - dragRef.current.grabY}px) rotate(2deg)`
    : undefined;

  return (
    <div className="min-h-screen relative flex flex-col">
      <div className="fixed inset-0 -z-10 table-felt" />
      <div className="fixed inset-0 -z-10 opacity-20 [background-image:radial-gradient(circle_at_18%_15%,rgba(230,193,119,.4),transparent_42%),radial-gradient(circle_at_85%_80%,rgba(91,156,125,.5),transparent_45%)]" />

      {/* HUD */}
      <header className="relative z-10 border-b border-white/10 bg-felt-900/70 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2">
          <button onClick={() => navigate("/game/solitaire")} className="btn-ghost !px-3 !py-1.5 text-sm">
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span>
          </button>
          <div className="flex items-center gap-1.5 sm:gap-3 text-sm">
            <Stat icon={<Clock className="w-3.5 h-3.5" />} value={fmtTime(secs)} />
            <Stat icon={<Hash className="w-3.5 h-3.5" />} value={String(s.moves)} />
            <Stat icon={<Trophy className="w-3.5 h-3.5 text-gold-300" />} value={String(s.score)} />
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={undo} disabled={history.length === 0 || autoFinishing} className="btn-ghost !px-2.5 !py-1.5 text-sm disabled:opacity-40" title="Undo">
              <Undo2 className="w-4 h-4" />
            </button>
            <button onClick={() => restart()} className="btn-ghost !px-2.5 !py-1.5 text-sm" title="Restart this deal">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={() => newGame()} className="btn-primary !px-3 !py-1.5 text-sm" title="New game">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 w-full px-2 sm:px-4 py-5 flex flex-col items-center justify-start md:justify-center overflow-x-auto">
        <div style={{ width: boardW }}>
          {/* Top row */}
          <div className="flex items-start justify-between mb-5 sm:mb-7" style={{ width: boardW }}>
            <div className="flex" style={{ gap }}>
              {/* Stock */}
              <div onClick={() => drawCard()} style={{ width: W, height: H }} className="relative cursor-pointer">
                {s.stock.length > 0 ? (
                  // Render the top few cards (with layoutId) so a draw animates
                  // from the deck to the waste instead of appearing instantly.
                  s.stock.slice(-Math.min(s.drawMode, 3)).map((c, i) => (
                    <div key={c.id} className="absolute inset-0" style={{ top: i }}>
                      <SolitaireCard faceDown w={W} h={H} layoutId={c.id} />
                    </div>
                  ))
                ) : (
                  <Slot w={W} h={H} icon={<RefreshCw className="text-white/40" style={{ width: W * 0.36, height: W * 0.36 }} />} />
                )}
              </div>
              {/* Waste */}
              <div className="relative" style={{ width: W + (s.drawMode === 3 ? Math.round(W * 0.5) : 0), height: H }}>
                {s.waste.length === 0 ? (
                  <Slot w={W} h={H} />
                ) : (
                  s.waste.slice(-3).map((c, i, arr) => {
                    const isTop = i === arr.length - 1;
                    const fan = s.drawMode === 3 ? Math.round(W * 0.25) : 0;
                    const hidden = draggedIds.has(c.id);
                    return (
                      <div
                        key={c.id}
                        className="absolute top-0"
                        style={{ left: i * fan, touchAction: isTop ? "none" : undefined, visibility: hidden ? "hidden" : undefined }}
                        onPointerDown={isTop ? (e) => beginDrag({ kind: "waste" }, e) : undefined}
                      >
                        <SolitaireCard card={c} w={W} h={H} layoutId={c.id} />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Foundations */}
            <div className="flex" style={{ gap }}>
              {SUITS.map((suit) => {
                const pile = s.foundations[suit];
                const t = pile[pile.length - 1];
                const ok = hintOK({ kind: "foundation", suit });
                const hidden = t && draggedIds.has(t.id);
                return (
                  <div key={suit} data-drop={`found:${suit}`} style={{ width: W, height: H, touchAction: "none" }} className="cursor-pointer"
                    onPointerDown={t ? (e) => beginDrag({ kind: "foundation", suit }, e) : undefined}>
                    {t && !hidden ? (
                      <SolitaireCard card={t} w={W} h={H} layoutId={t.id} hint={ok} />
                    ) : (
                      <Slot w={W} h={H} hint={ok} glyph={SUIT_GLYPH[suit]} red={SUIT_COLOR[suit] === "red"} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tableau */}
          <div className="grid grid-cols-7" style={{ gap, width: boardW }}>
            {s.tableau.map((col, c) => {
              const ok = hintOK({ kind: "tableau", col: c });
              const height =
                col.down.length * downOff + (col.up.length > 0 ? (col.up.length - 1) * upOff + H : H);
              return (
                <div
                  key={c}
                  data-drop={`tab:${c}`}
                  className={cn("relative rounded-xl transition-shadow", ok && "ring-2 ring-emerald-300/80 ring-offset-2 ring-offset-felt-700")}
                  style={{ width: W, minHeight: colMinH, height: Math.max(height, colMinH) }}
                >
                  {col.down.length === 0 && col.up.length === 0 && <Slot w={W} h={H} hint={ok} />}
                  {col.down.map((card, i) => (
                    <div key={card.id} className="absolute" style={{ top: i * downOff }}>
                      <SolitaireCard faceDown w={W} h={H} layoutId={card.id} />
                    </div>
                  ))}
                  {col.up.map((card, i) => {
                    const hidden = draggedIds.has(card.id);
                    return (
                      <div
                        key={card.id}
                        className="absolute"
                        style={{
                          top: col.down.length * downOff + i * upOff,
                          touchAction: "none",
                          visibility: hidden ? "hidden" : undefined,
                        }}
                        onPointerDown={(e) => beginDrag({ kind: "tableau", col: c, index: i }, e)}
                      >
                        <SolitaireCard card={card} w={W} h={H} layoutId={card.id} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Auto-finish */}
        {autoReady && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center mt-6">
            <button onClick={() => autoFinish()} className="btn-primary">
              <Sparkles className="w-4 h-4" /> Auto-finish
            </button>
          </motion.div>
        )}

        <p className="text-center text-xs text-white/35 mt-5">
          Drag cards to move · tap a card to send it to a foundation · tap the deck to draw
        </p>
      </main>

      {/* Drag layer */}
      {dragView && (
        <div ref={floatRef} className="fixed left-0 top-0 z-50 pointer-events-none drop-shadow-2xl" style={{ transform: initialFloat }}>
          {dragView.cards.map((c, i) => (
            <div key={c.id} className="absolute" style={{ top: i * upOff }}>
              <SolitaireCard card={c} w={W} h={H} />
            </div>
          ))}
        </div>
      )}

      {/* Win overlay */}
      {s.won && (
        <WinOverlay
          time={fmtTime(secs)}
          moves={s.moves}
          score={s.score}
          onNew={() => newGame()}
          onRestart={() => restart()}
        />
      )}
    </div>
  );
}

function Stat({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/25 border border-white/10 px-2.5 py-1.5 font-semibold tabular-nums">
      {icon}
      {value}
    </span>
  );
}

function Slot({
  w,
  h,
  hint,
  glyph,
  red,
  icon,
}: {
  w: number;
  h: number;
  hint?: boolean;
  glyph?: string;
  red?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center border border-white/15 bg-black/15",
        hint && "ring-2 ring-emerald-300/80 border-emerald-300/40"
      )}
      style={{ width: w, height: h, borderRadius: Math.round(w * 0.12) }}
    >
      {icon}
      {glyph && (
        <span className={cn("opacity-25", red ? "text-suit-red" : "text-white")} style={{ fontSize: Math.round(h * 0.34) }}>
          {glyph}
        </span>
      )}
    </div>
  );
}

function WinOverlay({
  time,
  moves,
  score,
  onNew,
  onRestart,
}: {
  time: string;
  moves: number;
  score: number;
  onNew: () => void;
  onRestart: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="panel w-full max-w-sm p-7 text-center"
      >
        <div className="text-5xl mb-2">🎉</div>
        <h2 className="font-display text-3xl font-bold bg-gradient-to-b from-gold-200 to-gold-600 bg-clip-text text-transparent">
          You won!
        </h2>
        <p className="text-white/60 text-sm mt-1">Congratulations — all cards home.</p>
        <div className="grid grid-cols-3 gap-2 my-6">
          <WinStat label="Time" value={time} />
          <WinStat label="Moves" value={String(moves)} />
          <WinStat label="Score" value={String(score)} />
        </div>
        <div className="flex gap-2">
          <button onClick={onRestart} className="btn-ghost flex-1">
            <RotateCcw className="w-4 h-4" /> Replay
          </button>
          <button onClick={onNew} className="btn-primary flex-1">
            <Plus className="w-4 h-4" /> New game
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function WinStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 py-3">
      <div className="font-display text-xl font-bold text-gold-300 tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-white/50 mt-0.5">{label}</div>
    </div>
  );
}
