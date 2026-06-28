import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Lock, Home, RotateCcw, Hash } from "lucide-react";
import { PlayingCard } from "../../../components/PlayingCard";
import { SUIT_GLYPH, SUIT_COLOR, type Suit, type Card } from "../../kachuful/engine/types";
import { useViewport } from "../../../lib/useViewport";
import { cn } from "../../../lib/utils";
import { useMpStore } from "../../../store/multiplayerStore";
import { SeatPlate } from "../components/SeatPlate";
import type { MendikotView, MPlayer } from "../engine/types";

const SUITS: Suit[] = ["S", "H", "D", "C"];

function CardBack({ w, h }: { w: number; h: number }) {
  return (
    <div className="rounded-md border border-black/40 shadow-card" style={{ width: w, height: h, background: "repeating-linear-gradient(45deg,#0c3d2a 0 5px,#0f4a32 5px 10px)" }}>
      <div className="m-[3px] rounded-[3px] border border-gold-500/40 flex items-center justify-center text-gold-400/80" style={{ height: h - 6, fontSize: w * 0.4 }}>♣♥</div>
    </div>
  );
}

function OppHand({ count, w, h, anchor = "left" }: { count: number; w: number; h: number; anchor?: "left" | "right" }) {
  const shown = Math.min(count, 7);
  const step = Math.round(w * 0.46);
  const width = step * Math.max(0, shown - 1) + w;
  return (
    <div className="relative" style={{ width, height: h }}>
      {Array.from({ length: shown }).map((_, i) => (
        <div key={i} className="absolute top-0" style={anchor === "right" ? { right: i * step } : { left: i * step }}>
          <CardBack w={w} h={h} />
        </div>
      ))}
    </div>
  );
}

function legalCardIds(hand: Card[], leadSuit: Suit | null): Set<string> {
  if (!leadSuit) return new Set(hand.map((c) => c.id));
  const inSuit = hand.filter((c) => c.suit === leadSuit);
  return new Set((inSuit.length ? inSuit : hand).map((c) => c.id));
}

export function MpMendikotScreen() {
  const navigate = useNavigate();
  const { isMobile } = useViewport();
  const room = useMpStore((s) => s.room);
  const playerId = useMpStore((s) => s.playerId);
  const gs = useMpStore((s) => s.gameState) as MendikotView | null;
  const sendAction = useMpStore((s) => s.sendAction);
  const leaveRoom = useMpStore((s) => s.leaveRoom);
  const returnToLobby = useMpStore((s) => s.returnToLobby);

  // Show the completed trick for a beat before cards gather to the winner.
  const phase = gs?.phase;
  const lastWinner = gs?.lastTrickWinnerSeat;
  const [gathering, setGathering] = useState(false);
  useEffect(() => {
    if (phase !== "trick_done") {
      setGathering(false);
      return;
    }
    setGathering(false);
    const t = setTimeout(() => setGathering(true), 600);
    return () => clearTimeout(t);
  }, [phase, lastWinner]);

  if (!gs || !playerId || !room) return null;

  const me = gs.players.find((p) => p.id === playerId);
  const localSeat = me?.seat ?? 0;
  const yourTeam = localSeat % 2;
  const seatAtRel = (r: number) => gs.players.find((p) => p.seat === (localSeat + r) % 4) as MPlayer;
  const bottom = seatAtRel(0);
  const right = seatAtRel(1);
  const top = seatAtRel(2);
  const left = seatAtRel(3);

  const isYourTurn = gs.phase === "playing" && gs.turnSeat === localSeat;
  const isChooser = gs.phase === "choose_trump" && gs.chooserSeat === localSeat;
  const yourHand = gs.hands[playerId] || [];
  const legal = isYourTurn ? legalCardIds(yourHand, gs.leadSuit) : null;
  const trickWinSeat = gs.phase === "trick_done" ? gs.lastTrickWinnerSeat : null;
  const isHost = room.hostId === playerId;

  // geometry
  const backW = isMobile ? 28 : 38;
  const backH = isMobile ? 40 : 54;
  const cw = isMobile ? 48 : 64;
  const ch = isMobile ? 68 : 92;
  const off = isMobile ? 46 : 72;
  const seatDelta: Record<number, { dx: number; dy: number }> = {
    0: { dx: 0, dy: off },
    1: { dx: off, dy: 0 },
    2: { dx: 0, dy: -off },
    3: { dx: -off, dy: 0 },
  };

  const leave = () => {
    leaveRoom();
    navigate("/");
  };

  return (
    <div className="h-screen relative table-felt overflow-hidden flex flex-col">
      <div className="absolute inset-0 [background-image:radial-gradient(ellipse_at_center,transparent_42%,rgba(0,0,0,0.55)_100%)] pointer-events-none" />

      <header className="relative z-20 px-2 sm:px-4 py-2 flex items-center justify-between gap-2 shrink-0">
        <button onClick={leave} className="btn-ghost !px-3 !py-1.5 text-sm">
          <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Leave</span>
        </button>
        <div className="flex items-center gap-2">
          <TeamScore label="You" tens={gs.tensByTeam[yourTeam]} tricks={gs.tricksByTeam[yourTeam]} mine />
          <TrumpChip trump={gs.trump} revealed={gs.trumpRevealed} />
          <TeamScore label="Rivals" tens={gs.tensByTeam[(yourTeam + 1) % 2]} tricks={gs.tricksByTeam[(yourTeam + 1) % 2]} />
        </div>
        <div className="chip bg-black/30 text-white/60 text-xs"><Hash className="w-3 h-3" />{room.code}</div>
      </header>

      <div className="relative flex-1 min-h-0 mx-2 sm:mx-6">
        <div className="absolute inset-2 sm:inset-4 rounded-[44%/34%] bg-felt-500/20 border border-white/5 shadow-[inset_0_0_70px_rgba(0,0,0,0.5)]" />

        <div className="absolute left-1/2 -translate-x-1/2 top-1 sm:top-3 flex flex-col items-center gap-1 z-10">
          <SeatPlate player={top} active={gs.turnSeat === top.seat} isLeader={gs.leaderSeat === top.seat} win={trickWinSeat === top.seat} cardCount={gs.handCounts[top.id]} compact={isMobile} />
          <OppHand count={gs.handCounts[top.id] ?? 0} w={backW} h={backH} />
        </div>
        <div className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10">
          <SeatPlate player={left} active={gs.turnSeat === left.seat} isLeader={gs.leaderSeat === left.seat} win={trickWinSeat === left.seat} cardCount={gs.handCounts[left.id]} compact={isMobile} />
          <OppHand count={gs.handCounts[left.id] ?? 0} w={backW} h={backH} anchor="left" />
        </div>
        <div className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10">
          <SeatPlate player={right} active={gs.turnSeat === right.seat} isLeader={gs.leaderSeat === right.seat} win={trickWinSeat === right.seat} cardCount={gs.handCounts[right.id]} compact={isMobile} />
          <OppHand count={gs.handCounts[right.id] ?? 0} w={backW} h={backH} anchor="right" />
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0" style={{ width: 1, height: 1 }}>
          <AnimatePresence>
            {gs.currentTrick.map((t) => {
              const rel = (t.seat - localSeat + 4) % 4;
              const d = seatDelta[rel];
              const throwDist = isMobile ? 60 : 90;
              const isDone = gathering && gs.lastTrickWinnerSeat != null;
              const wRel = isDone ? (gs.lastTrickWinnerSeat! - localSeat + 4) % 4 : null;
              const wd = wRel != null ? seatDelta[wRel] : null;
              const animate = wd
                ? { x: wd.dx - d.dx, y: wd.dy - d.dy, scale: 0.6, opacity: 0.85, rotate: 0 }
                : { x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 };
              const isWinnerCard = isDone && gs.lastTrickWinnerSeat === t.seat;
              return (
                <motion.div
                  key={t.card.id}
                  initial={{ opacity: 0, scale: 0.7, x: Math.sign(d.dx) * throwDist, y: Math.sign(d.dy) * throwDist, rotate: rel % 2 === 0 ? -8 : 8 }}
                  animate={animate}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ type: "spring", stiffness: 280, damping: 22 }}
                  className="absolute"
                  style={{ left: d.dx - cw / 2, top: d.dy - ch / 2, zIndex: isWinnerCard ? 5 : 1 }}
                >
                  <div className={cn(isWinnerCard && "ring-2 ring-gold-400 rounded-lg")}>
                    <PlayingCard card={t.card} size={isMobile ? "sm" : "md"} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Your hand */}
      <div className="relative z-10 shrink-0 pb-2 sm:pb-3">
        <div className="flex justify-center mb-1.5">
          <SeatPlate player={bottom} active={isYourTurn} isLeader={gs.leaderSeat === localSeat} win={trickWinSeat === localSeat} compact={isMobile} />
        </div>
        <div className="flex justify-center px-2">
          <div className="flex">
            {yourHand.map((c, i) => {
              const playable = !!legal?.has(c.id);
              const showHint = isYourTurn && gs.leadSuit != null;
              const canClick = isYourTurn && playable;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={!canClick}
                  onClick={() => sendAction({ type: "play", cardId: c.id })}
                  style={{ marginLeft: i === 0 ? 0 : isMobile ? -14 : -10 }}
                  className={cn(
                    "relative transition-all duration-150 ease-out",
                    canClick && "cursor-pointer hover:-top-3 hover:z-20",
                    showHint && playable && "-top-2 z-10",
                    isYourTurn && !playable && "opacity-45"
                  )}
                >
                  <PlayingCard
                    card={c}
                    size={isMobile ? "sm" : "md"}
                    className={cn(
                      showHint && playable && "ring-2 ring-gold-400 border-gold-400"
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>
        <div className="text-center text-[11px] text-white/45 mt-1.5 h-4">{gs.message}</div>
      </div>

      {/* Trump selection (only the chooser) */}
      <AnimatePresence>
        {isChooser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} className="panel w-full max-w-md p-6 text-center">
              <Lock className="w-6 h-6 text-gold-400 mx-auto mb-2" />
              <h2 className="font-display text-2xl font-bold text-white">Choose your trump</h2>
              <p className="text-sm text-white/60 mt-1 mb-5">Stays secret until someone can't follow suit.</p>
              <div className="grid grid-cols-2 gap-3">
                {SUITS.map((suit) => (
                  <button key={suit} onClick={() => sendAction({ type: "chooseTrump", suit })} className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-gold-400 transition p-4 flex items-center justify-center">
                    <span className={cn("text-4xl", SUIT_COLOR[suit] === "red" ? "text-suit-red" : "text-white")}>{SUIT_GLYPH[suit]}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Waiting for the chooser (non-choosers) */}
      {gs.phase === "choose_trump" && !isChooser && (
        <div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="panel px-4 py-2 text-sm text-white/80">{seatAtRel((gs.chooserSeat - localSeat + 4) % 4).name} is choosing trump…</div>
        </div>
      )}

      {/* Result */}
      <AnimatePresence>
        {gs.phase === "hand_over" && gs.result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="panel w-full max-w-sm p-7 text-center">
              <div className="text-5xl mb-2">{gs.result.winnerTeam === yourTeam ? "🏆" : "😅"}</div>
              <h2 className={cn("font-display text-3xl font-bold", gs.result.winnerTeam === yourTeam ? "text-gold-300" : "text-white/90")}>
                {gs.result.winnerTeam === yourTeam ? "Your team wins!" : "Your team lost"}
              </h2>
              <p className="text-white/65 text-sm mt-2">{gs.result.message}</p>
              <div className="grid grid-cols-2 gap-2 my-6">
                <ResultStat label="Your 10s" value={`${gs.result.tens[yourTeam]} / 4`} good={gs.result.winnerTeam === yourTeam} />
                <ResultStat label="Rivals' 10s" value={`${gs.result.tens[(yourTeam + 1) % 2]} / 4`} />
              </div>
              <div className="flex gap-2">
                <button onClick={leave} className="btn-ghost flex-1"><Home className="w-4 h-4" /> Leave</button>
                {isHost && (
                  <button onClick={returnToLobby} className="btn-primary flex-1"><RotateCcw className="w-4 h-4" /> New hand</button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TeamScore({ label, tens, tricks, mine }: { label: string; tens: number; tricks: number; mine?: boolean }) {
  return (
    <div className={cn("rounded-xl border px-2.5 py-1 text-center", mine ? "border-emerald-400/30 bg-emerald-500/10" : "border-rose-400/30 bg-rose-500/10")}>
      <div className="text-[9px] uppercase tracking-wider text-white/50">{label}</div>
      <div className="flex items-center gap-1.5 text-sm font-bold tabular-nums">
        <span className="text-gold-300">{tens}<span className="text-white/40 text-[10px]">/4 🔟</span></span>
        <span className="text-white/30">·</span>
        <span className="text-white/70">{tricks}<span className="text-white/40 text-[10px]"> tr</span></span>
      </div>
    </div>
  );
}

function TrumpChip({ trump, revealed }: { trump: Suit | null; revealed: boolean }) {
  if (!trump) return <div className="chip bg-black/30 text-white/50 text-xs"><Lock className="w-3 h-3" /> Trump hidden</div>;
  return (
    <div className={cn("chip text-xs font-bold", revealed ? "bg-gold-500/25 text-gold-200 shadow-glow-soft" : "bg-black/40 text-white/70")}>
      {!revealed && <Lock className="w-3 h-3" />}
      <span className={cn("text-base", SUIT_COLOR[trump] === "red" ? "text-suit-red" : "text-white")}>{SUIT_GLYPH[trump]}</span>
      {revealed ? "Trump" : "Yours"}
    </div>
  );
}

function ResultStat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className={cn("rounded-xl border py-2.5", good ? "border-gold-400/30 bg-gold-500/10" : "border-white/10 bg-white/5")}>
      <div className={cn("font-display text-lg font-bold tabular-nums", good ? "text-gold-300" : "text-white/90")}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-white/50">{label}</div>
    </div>
  );
}
