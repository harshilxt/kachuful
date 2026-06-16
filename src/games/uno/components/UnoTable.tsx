import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Play, Timer, Volume2, VolumeX, RotateCw, RotateCcw } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useViewport } from "../../../lib/useViewport";
import { computeSeatGeometry } from "../../../lib/seats";
import {
  isSoundEnabled,
  primeAudio,
  setSoundEnabled,
  sfx,
  shoutUno,
} from "../../../lib/sound";
import { UnoCard } from "./UnoCard";
import { OpponentSeat } from "./OpponentSeat";
import { MyHand } from "./MyHand";
import { ColorPicker } from "./ColorPicker";
import { ThrownCard } from "./ThrownCard";
import {
  COLOR_HEX,
  type UnoCard as UnoCardT,
  type UnoColor,
  type UnoGameState,
} from "../engine/types";

interface Props {
  state: UnoGameState;
  youId: string;
  isHost: boolean;
  onAction: (action: Record<string, unknown>) => void;
  onNextRound: () => void;
  onLeave: () => void;
  onReturnToLobby: () => void;
  onKick?: (playerId: string) => void;
}

const TURN_TIMEOUT_SEC = 15;

export function UnoTable({
  state,
  youId,
  isHost,
  onAction,
  onNextRound,
  onLeave,
  onReturnToLobby,
  onKick,
}: Props) {
  const vp = useViewport();
  const compact = vp.isMobile || vp.isShortHeight;
  const [muted, setMuted] = useState(!isSoundEnabled());
  const [pendingWild, setPendingWild] = useState<UnoCardT | null>(null);

  const you = state.players.find((p) => p.id === youId);
  const youIndex = state.players.findIndex((p) => p.id === youId);
  const expectedId =
    state.phase === "playing"
      ? state.players[state.currentPlayerIndex]?.id ?? null
      : state.phase === "choosing_color"
      ? state.players[state.colorChooserIndex]?.id ?? null
      : null;
  const isMyTurn = expectedId === youId;
  const mustChooseColor =
    state.phase === "choosing_color" && state.colorChooserIndex === youIndex;

  const opponents = state.players.filter((p) => p.id !== youId);
  const seatGeometry = useMemo(
    () => computeSeatGeometry(state.players, youId, { isMobile: compact }),
    [state.players, youId, compact]
  );

  // ---------- sound + visual effects driven by lastEvent ----------
  const lastSeq = useRef(-1);
  const prevExpected = useRef<string | null>(null);
  const [banner, setBanner] = useState<{ text: string; color: string } | null>(null);
  const [colorFlash, setColorFlash] = useState<string | null>(null);
  const [unoBurst, setUnoBurst] = useState(false);
  const [flying, setFlying] = useState<
    { card: UnoCardT; fromLeft: string; fromTop: string; key: number } | null
  >(null);
  const [seatFlash, setSeatFlash] = useState<
    { playerId: string; text: string; color: string } | null
  >(null);

  useEffect(() => {
    const ev = state.lastEvent;
    if (!ev || ev.seq === lastSeq.current) return;
    lastSeq.current = ev.seq;
    const showBanner = (text: string, color: string, ms = 1100) => {
      setBanner({ text, color });
      window.setTimeout(() => setBanner(null), ms);
    };
    const flashSeat = (pid: string | null, text: string, color: string) => {
      if (!pid || pid === youId) return; // own seat shown via centre banner
      setSeatFlash({ playerId: pid, text, color });
      window.setTimeout(
        () => setSeatFlash((f) => (f && f.playerId === pid ? null : f)),
        1200
      );
    };

    // Card-throw animation for any play-type event.
    const THROW_KINDS = ["play", "skip", "reverse", "draw2", "wild", "wild4"];
    if (THROW_KINDS.includes(ev.kind) && ev.byId && state.discardTop) {
      const seat = seatGeometry[ev.byId];
      const fromLeft = ev.byId === youId ? "50%" : seat?.left ?? "50%";
      const fromTop = ev.byId === youId ? "94%" : seat?.top ?? "50%";
      setFlying({ card: state.discardTop, fromLeft, fromTop, key: ev.seq });
    }

    switch (ev.kind) {
      case "play":
        sfx.play();
        break;
      case "draw":
        sfx.draw();
        break;
      case "skip":
        sfx.skip();
        showBanner("SKIPPED", "#e8a200");
        flashSeat(ev.playerId, "SKIPPED", "#e8a200");
        break;
      case "reverse":
        sfx.reverse();
        showBanner("REVERSE", "#3aa13a");
        flashSeat(ev.playerId, "SKIPPED", "#e8a200");
        break;
      case "draw2":
        sfx.draw2();
        showBanner("+2", "#d63a32");
        flashSeat(ev.playerId, "+2 · SKIPPED", "#d63a32");
        break;
      case "wild4":
        sfx.draw4();
        showBanner("+4", "#1a1a1a");
        flashSeat(ev.playerId, "+4 · SKIPPED", "#1a1a1a");
        if (ev.color) flash(ev.color);
        break;
      case "wild":
        sfx.color();
        if (ev.color) flash(ev.color);
        break;
      case "uno":
        shoutUno();
        setUnoBurst(true);
        window.setTimeout(() => setUnoBurst(false), 1400);
        break;
      case "forgot_uno":
        sfx.penalty();
        showBanner("FORGOT UNO! +2", "#d63a32", 1400);
        break;
      default:
        break;
    }
    function flash(c: UnoColor) {
      setColorFlash(COLOR_HEX[c]);
      window.setTimeout(() => setColorFlash(null), 650);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastEvent?.seq]);

  // your-turn ping
  useEffect(() => {
    if (expectedId !== prevExpected.current) {
      if (expectedId === youId && state.phase === "playing") sfx.yourTurn();
      prevExpected.current = expectedId;
    }
  }, [expectedId, youId, state.phase]);

  // round / game over sounds
  const announced = useRef<number>(-1);
  useEffect(() => {
    if (state.phase === "round_over" || state.phase === "game_over") {
      if (announced.current !== state.round) {
        announced.current = state.round;
        if (state.winnerId === youId) sfx.win();
        else sfx.lose();
      }
    } else {
      announced.current = -1;
    }
  }, [state.phase, state.round, state.winnerId, youId]);

  // ---------- turn timer (visual; server enforces) ----------
  const turnKey = `${state.round}:${state.phase}:${expectedId}:${state.discardCount}:${state.drawnPlayableId}`;
  const [timeLeft, setTimeLeft] = useState(TURN_TIMEOUT_SEC);
  const timed = state.phase === "playing" || state.phase === "choosing_color";
  useEffect(() => {
    setTimeLeft(TURN_TIMEOUT_SEC);
    if (!timed || !expectedId) return;
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [turnKey, timed, expectedId]);

  // ---------- actions ----------
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setSoundEnabled(!next);
    if (!next) primeAudio();
  };

  const playCard = (card: UnoCardT) => {
    primeAudio();
    if (card.kind === "wild" || card.kind === "wild4") {
      setPendingWild(card);
      return;
    }
    onAction({
      type: "play",
      cardId: card.id,
      callUno: (you?.handCount ?? 0) === 2 ? true : undefined,
    });
  };

  const pickColor = (color: UnoColor) => {
    primeAudio();
    if (mustChooseColor) {
      onAction({ type: "choose_color", color });
    } else if (pendingWild) {
      onAction({
        type: "play",
        cardId: pendingWild.id,
        color,
        callUno: (you?.handCount ?? 0) === 2 ? true : undefined,
      });
      setPendingWild(null);
    }
  };

  const canDraw = isMyTurn && state.phase === "playing" && state.drawnPlayableId === null;
  const canPass = isMyTurn && state.phase === "playing" && state.drawnPlayableId !== null;
  const showUnoBtn =
    isMyTurn && state.phase === "playing" && (you?.handCount ?? 0) === 2 && !you?.calledUno;

  const roundOver = state.phase === "round_over";
  const gameOver = state.phase === "game_over";

  return (
    <div
      className="h-[100dvh] relative table-felt overflow-hidden flex flex-col select-none"
      onClick={() => primeAudio()}
    >
      <div className="absolute inset-0 [background-image:radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.55)_100%)] pointer-events-none" />

      {/* colour flash */}
      <AnimatePresence>
        {colorFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 pointer-events-none"
            style={{ background: colorFlash }}
          />
        )}
      </AnimatePresence>

      {/* header */}
      <header
        className={cn(
          "relative z-20 flex items-center justify-between gap-2 shrink-0 px-2 sm:px-4",
          compact ? "py-1.5" : "py-2.5"
        )}
      >
        <div className="panel px-3 py-1.5">
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 leading-none">
            UNO
          </div>
          <div className="text-xs text-white/70 mt-0.5">Round {state.round}</div>
        </div>
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
          {!compact && (
            <div className="panel px-3 py-2 text-sm text-white/85 truncate flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gold-400 animate-pulse shrink-0" />
              <span className="truncate">{state.message}</span>
            </div>
          )}
          {timed && expectedId && (
            <div
              className={cn(
                "chip font-bold shrink-0",
                timeLeft <= 5
                  ? "bg-red-500/25 text-red-200"
                  : timeLeft <= 10
                  ? "bg-amber-500/25 text-amber-200"
                  : "bg-white/10 text-white/85"
              )}
            >
              <Timer className="w-3.5 h-3.5" />
              {timeLeft}s
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={toggleMute} className="btn-ghost !px-2" title="Sound">
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              if (confirm("Leave this table?")) onLeave();
            }}
            className="btn-ghost !px-2"
            title="Leave"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* table area */}
      <div className="relative z-10 flex-1 min-h-0 mx-2 sm:mx-6">
        <div className="absolute inset-0 rounded-[42%/30%] bg-felt-table/30 border border-white/5 shadow-[inset_0_0_60px_rgba(0,0,0,0.45)]" />

        {/* opponents */}
        {opponents.map((p) => {
          const seat = seatGeometry[p.id];
          if (!seat) return null;
          const conn = true; // connection flag not in uno payload; assume true
          return (
            <div
              key={p.id}
              className="absolute z-10"
              style={{ left: seat.left, top: seat.top, transform: "translate(-50%,-50%)" }}
            >
              <OpponentSeat
                player={p}
                isActive={expectedId === p.id}
                isHostPlayer={p.id === state.hostId}
                connected={conn}
                compact={compact}
                flash={
                  seatFlash && seatFlash.playerId === p.id
                    ? { text: seatFlash.text, color: seatFlash.color }
                    : null
                }
                onKick={
                  isHost && onKick
                    ? () => {
                        if (confirm(`Kick ${p.name}?`)) onKick(p.id);
                      }
                    : undefined
                }
              />
            </div>
          );
        })}

        {/* center: draw pile + discard + direction + colour */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 flex items-center gap-4 sm:gap-6">
          {/* draw pile */}
          <button
            onClick={() => canDraw && onAction({ type: "draw" })}
            disabled={!canDraw}
            className={cn(
              "relative transition",
              canDraw ? "cursor-pointer hover:-translate-y-1" : "cursor-default"
            )}
            title={canDraw ? "Draw a card" : undefined}
          >
            <UnoCard faceDown size={compact ? "md" : "lg"} />
            {canDraw && (
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 chip bg-gold-500 text-ink-900 text-[10px] font-bold whitespace-nowrap shadow-glow">
                DRAW
              </span>
            )}
          </button>

          {/* discard top, ringed in the active colour */}
          <div className="relative">
            <div
              className="absolute -inset-2 rounded-2xl blur-md opacity-60"
              style={{ background: COLOR_HEX[state.currentColor] }}
            />
            <div className="relative">
              {state.discardTop ? (
                <UnoCard card={state.discardTop} size={compact ? "md" : "lg"} />
              ) : (
                <UnoCard faceDown size={compact ? "md" : "lg"} />
              )}
            </div>
          </div>

          {/* direction + colour indicator */}
          <div className="flex flex-col items-center gap-2">
            <motion.div
              key={state.direction}
              initial={{ rotate: -40, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              className="text-white/70"
              title={state.direction === 1 ? "Clockwise" : "Counter-clockwise"}
            >
              {state.direction === 1 ? (
                <RotateCw className="w-6 h-6" />
              ) : (
                <RotateCcw className="w-6 h-6" />
              )}
            </motion.div>
            <div
              className="w-5 h-5 rounded-full border-2 border-white/40"
              style={{ background: COLOR_HEX[state.currentColor] }}
              title="Active colour"
            />
          </div>
        </div>

        {/* thrown-card fly-in */}
        {flying && (
          <ThrownCard
            key={flying.key}
            card={flying.card}
            fromLeft={flying.fromLeft}
            fromTop={flying.fromTop}
            size={compact ? "md" : "lg"}
            onDone={() => setFlying((f) => (f && f.key === flying.key ? null : f))}
          />
        )}

        {/* effect banner */}
        <AnimatePresence>
          {banner && (
            <motion.div
              initial={{ scale: 0.4, opacity: 0, y: -10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.4, opacity: 0 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[140%] z-30 pointer-events-none"
            >
              <div
                className="px-5 py-2 rounded-xl font-black text-2xl tracking-wider text-white shadow-2xl"
                style={{ background: banner.color, WebkitTextStroke: "1px rgba(0,0,0,.3)" }}
              >
                {banner.text}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* UNO burst */}
        <AnimatePresence>
          {unoBurst && (
            <motion.div
              initial={{ scale: 0.2, opacity: 0, rotate: -12 }}
              animate={{ scale: 1.1, opacity: 1, rotate: 0 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none"
            >
              <div className="font-display font-black text-6xl sm:text-8xl tracking-tight bg-gradient-to-b from-yellow-300 via-red-500 to-red-700 bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
                UNO!
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* bottom: my nameplate + controls + hand */}
      <div className="relative z-10 shrink-0 pb-2">
        {/* controls row */}
        <div className="flex items-center justify-center gap-2 mb-1 min-h-[36px]">
          {showUnoBtn && (
            <motion.button
              initial={{ scale: 0.7 }}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              onClick={() => {
                primeAudio();
                onAction({ type: "call_uno" });
              }}
              className="px-5 py-1.5 rounded-full font-black text-ink-900 bg-gradient-to-b from-yellow-300 to-amber-500 shadow-glow"
            >
              UNO!
            </motion.button>
          )}
          {canPass && (
            <button
              onClick={() => onAction({ type: "pass" })}
              className="btn-ghost !py-1.5"
            >
              Pass
            </button>
          )}
          {you && (
            <div className="panel px-3 py-1 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gold-400 to-gold-700 flex items-center justify-center text-sm">
                {you.avatar}
              </div>
              <span className="text-xs font-semibold">{you.name}</span>
              <span className="text-[11px] text-gold-300 font-semibold">
                {you.score}
              </span>
              {isMyTurn && state.phase === "playing" && (
                <span className="chip bg-gold-500 text-ink-900 text-[10px] font-bold">
                  <Play className="w-3 h-3" /> Your turn
                </span>
              )}
            </div>
          )}
        </div>

        {you && (
          <MyHand
            cards={you.hand}
            isMyTurn={isMyTurn && state.phase === "playing"}
            currentColor={state.currentColor}
            topCard={state.discardTop}
            drawnPlayableId={state.drawnPlayableId}
            compact={compact}
            onPlay={playCard}
          />
        )}
      </div>

      {/* colour picker overlay */}
      <AnimatePresence>
        {(mustChooseColor || pendingWild) && (
          <ColorPicker
            onPick={pickColor}
          />
        )}
      </AnimatePresence>

      {/* round / game over overlay */}
      <AnimatePresence>
        {(roundOver || gameOver) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              className="panel p-6 max-w-md w-full text-center"
            >
              <div className="text-5xl mb-2">
                {state.winnerId === youId ? "🎉" : "🃏"}
              </div>
              <div className="font-display text-2xl text-gold-400">
                {gameOver ? "Game Over" : "Round Over"}
              </div>
              <div className="text-white/80 mt-1">{state.message}</div>

              <div className="mt-4 space-y-1.5 text-left">
                {[...state.players]
                  .sort((a, b) => b.score - a.score)
                  .map((p, i) => (
                    <div
                      key={p.id}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
                        p.id === state.winnerId
                          ? "bg-gold-500/10 border-gold-500/40"
                          : "bg-white/5 border-white/10"
                      )}
                    >
                      <span className="w-5 text-center text-xs text-white/50">
                        {i + 1}
                      </span>
                      <span className="text-lg">{p.avatar}</span>
                      <span className="flex-1 text-sm font-medium">
                        {p.name}
                        {p.id === youId && (
                          <span className="chip bg-gold-500/20 text-gold-300 text-[9px] ml-1">
                            YOU
                          </span>
                        )}
                      </span>
                      {p.netLastRound !== 0 && (
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            p.netLastRound > 0 ? "text-emerald-300" : "text-red-300"
                          )}
                        >
                          {p.netLastRound > 0 ? "+" : ""}
                          {p.netLastRound}
                        </span>
                      )}
                      <span className="text-gold-400 font-bold text-sm w-10 text-right">
                        {p.score}
                      </span>
                    </div>
                  ))}
              </div>

              <div className="mt-5">
                {gameOver ? (
                  isHost ? (
                    <button onClick={onReturnToLobby} className="btn-primary w-full">
                      Back to Lobby
                    </button>
                  ) : (
                    <span className="text-sm text-white/55">Waiting for host…</span>
                  )
                ) : isHost ? (
                  <button onClick={onNextRound} className="btn-primary w-full">
                    <Play className="w-4 h-4" /> Next Round
                  </button>
                ) : (
                  <span className="text-sm text-white/55">
                    Waiting for host to deal…
                  </span>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
