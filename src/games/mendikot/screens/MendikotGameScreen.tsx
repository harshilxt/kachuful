import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Lock } from "lucide-react";
import { PlayingCard } from "../../../components/PlayingCard";
import { SUIT_GLYPH, SUIT_COLOR, type Suit } from "../../kachuful/engine/types";
import { useViewport } from "../../../lib/useViewport";
import { cn } from "../../../lib/utils";
import { useMendikotStore } from "../store";
import { legalCards, playerAtSeat, suitCounts } from "../engine/engine";
import { HUMAN_SEAT } from "../engine/types";
import { SeatPlate } from "../components/SeatPlate";

const SUITS: Suit[] = ["S", "H", "D", "C"];

function CardBack({ w, h }: { w: number; h: number }) {
  return (
    <div
      className="rounded-md border border-black/40 shadow-card"
      style={{
        width: w,
        height: h,
        background: "repeating-linear-gradient(45deg,#0c3d2a 0 5px,#0f4a32 5px 10px)",
      }}
    >
      <div
        className="m-[3px] rounded-[3px] border border-gold-500/40 flex items-center justify-center text-gold-400/80"
        style={{ height: h - 6, fontSize: w * 0.4 }}
      >
        ♣♥
      </div>
    </div>
  );
}

function OppHand({
  count,
  w,
  h,
  anchor = "left",
}: {
  count: number;
  w: number;
  h: number;
  anchor?: "left" | "right";
}) {
  const shown = Math.min(count, 7);
  const step = Math.round(w * 0.46);
  const width = step * Math.max(0, shown - 1) + w;
  return (
    <div className="relative" style={{ width, height: h }}>
      {Array.from({ length: shown }).map((_, i) => (
        <div
          key={i}
          className="absolute top-0"
          style={anchor === "right" ? { right: i * step } : { left: i * step }}
        >
          <CardBack w={w} h={h} />
        </div>
      ))}
    </div>
  );
}

export function MendikotGameScreen() {
  const navigate = useNavigate();
  const { isMobile } = useViewport();
  const state = useMendikotStore((s) => s.state);
  const newGame = useMendikotStore((s) => s.newGame);
  const chooseTrumpSuit = useMendikotStore((s) => s.chooseTrumpSuit);
  const playHumanCard = useMendikotStore((s) => s.playHumanCard);

  useEffect(() => {
    if (!useMendikotStore.getState().state) newGame();
  }, [newGame]);

  // Let the completed trick sit visible for a beat before the cards gather to
  // the winner — otherwise the 4th card flies away before it can be seen.
  const phase = state?.phase;
  const lastWinner = state?.lastTrickWinnerSeat;
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

  if (!state) return null;
  const s = state;

  const you = playerAtSeat(s, 0);
  const right = playerAtSeat(s, 1);
  const partner = playerAtSeat(s, 2);
  const left = playerAtSeat(s, 3);

  const isHumanTurn = s.phase === "playing" && s.turnSeat === HUMAN_SEAT;
  const legal = isHumanTurn ? new Set(legalCards(s, 0).map((c) => c.id)) : null;
  const trickWinSeat = s.phase === "trick_done" ? s.lastTrickWinnerSeat : null;

  const backW = isMobile ? 28 : 38;
  const backH = isMobile ? 40 : 54;
  // trick card size (matches PlayingCard sm/md widths) for centring
  const cw = isMobile ? 48 : 64;
  const ch = isMobile ? 68 : 92;
  // played-card offset from centre, per seat direction
  const off = isMobile ? 46 : 72;
  const seatDelta: Record<number, { dx: number; dy: number }> = {
    0: { dx: 0, dy: off },
    1: { dx: off, dy: 0 },
    2: { dx: 0, dy: -off },
    3: { dx: -off, dy: 0 },
  };

  const counts = suitCounts(s.hands[you.id]);

  return (
    <div className="h-screen relative table-felt overflow-hidden flex flex-col">
      <div className="absolute inset-0 [background-image:radial-gradient(ellipse_at_center,transparent_42%,rgba(0,0,0,0.55)_100%)] pointer-events-none" />

      {/* HUD */}
      <header className="relative z-20 px-2 sm:px-4 py-2 flex items-center justify-between gap-2 shrink-0">
        <button onClick={() => navigate("/game/mendikot")} className="btn-ghost !px-3 !py-1.5 text-sm">
          <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span>
        </button>

        <div className="flex items-center gap-2">
          <TeamScore label="You" tens={s.tensByTeam[0]} tricks={s.tricksByTeam[0]} mine />
          <TrumpChip trump={s.trump} revealed={s.trumpRevealed} />
          <TeamScore label="Rivals" tens={s.tensByTeam[1]} tricks={s.tricksByTeam[1]} />
        </div>

        <button onClick={() => newGame()} className="btn-primary !px-3 !py-1.5 text-sm" title="New game">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New</span>
        </button>
      </header>

      {/* Table */}
      <div className="relative flex-1 min-h-0 mx-2 sm:mx-6">
        <div className="absolute inset-2 sm:inset-4 rounded-[44%/34%] bg-felt-500/20 border border-white/5 shadow-[inset_0_0_70px_rgba(0,0,0,0.5)]" />

        {/* Partner (top) */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1 sm:top-3 flex flex-col items-center gap-1 z-10">
          <SeatPlate player={partner} active={s.turnSeat === 2} isLeader={s.leaderSeat === 2} win={trickWinSeat === 2} cardCount={s.hands[partner.id].length} compact={isMobile} />
          <OppHand count={s.hands[partner.id].length} w={backW} h={backH} />
        </div>
        {/* Left */}
        <div className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10">
          <SeatPlate player={left} active={s.turnSeat === 3} isLeader={s.leaderSeat === 3} win={trickWinSeat === 3} cardCount={s.hands[left.id].length} compact={isMobile} />
          <OppHand count={s.hands[left.id].length} w={backW} h={backH} anchor="left" />
        </div>
        {/* Right */}
        <div className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10">
          <SeatPlate player={right} active={s.turnSeat === 1} isLeader={s.leaderSeat === 1} win={trickWinSeat === 1} cardCount={s.hands[right.id].length} compact={isMobile} />
          <OppHand count={s.hands[right.id].length} w={backW} h={backH} anchor="right" />
        </div>

        {/* Trick area */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0" style={{ width: 1, height: 1 }}>
          <AnimatePresence>
            {s.currentTrick.map((t) => {
              const d = seatDelta[t.seat];
              const throwDist = isMobile ? 60 : 90;
              const isDone = gathering && s.lastTrickWinnerSeat != null;
              // once the trick has been shown, cards slide toward the winner
              const wd = isDone ? seatDelta[s.lastTrickWinnerSeat!] : null;
              const animate = wd
                ? { x: wd.dx - d.dx, y: wd.dy - d.dy, scale: 0.6, opacity: 0.85, rotate: 0 }
                : { x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 };
              const isWinnerCard = isDone && s.lastTrickWinnerSeat === t.seat;
              return (
                <motion.div
                  key={t.card.id}
                  initial={{
                    opacity: 0,
                    scale: 0.7,
                    x: Math.sign(d.dx) * throwDist,
                    y: Math.sign(d.dy) * throwDist,
                    rotate: t.seat % 2 === 0 ? -8 : 8,
                  }}
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
          {/* center hint */}
          {s.currentTrick.length === 0 && s.phase === "playing" && (
            <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 text-white/30 text-xs whitespace-nowrap">
              {playerAtSeat(s, s.turnSeat).name} to play
            </div>
          )}
        </div>
      </div>

      {/* Your hand */}
      <div className="relative z-10 shrink-0 pb-2 sm:pb-3">
        <div className="flex justify-center mb-1.5">
          <SeatPlate player={you} active={isHumanTurn} isLeader={s.leaderSeat === 0} win={trickWinSeat === 0} compact={isMobile} />
        </div>
        <div className="flex justify-center px-2">
          <div className="flex" style={{ paddingLeft: 0 }}>
            {s.hands[you.id].map((c, i) => {
              const playable = !!legal?.has(c.id);
              // Only hint legal cards when you must FOLLOW a suit (leading = all legal).
              const showHint = isHumanTurn && s.leadSuit != null;
              const canClick = isHumanTurn && playable;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={!canClick}
                  onClick={() => playHumanCard(c.id)}
                  style={{ marginLeft: i === 0 ? 0 : isMobile ? -14 : -10 }}
                  className={cn(
                    "relative transition-all duration-150 ease-out",
                    canClick && "cursor-pointer hover:-top-3 hover:z-20",
                    showHint && playable && "-top-2 z-10",
                    isHumanTurn && !playable && "opacity-45"
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
        <div className="text-center text-[11px] text-white/40 mt-1.5 h-4">{s.message}</div>
      </div>

      {/* Trump selection */}
      <AnimatePresence>
        {s.phase === "choose_trump" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} className="panel w-full max-w-md p-6 text-center">
              <Lock className="w-6 h-6 text-gold-400 mx-auto mb-2" />
              <h2 className="font-display text-2xl font-bold text-white">Choose your trump</h2>
              <p className="text-sm text-white/60 mt-1 mb-5">
                Pick a suit from your hand. It stays <b>secret</b> until someone can't follow suit — then it's revealed.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {SUITS.map((suit) => (
                  <button
                    key={suit}
                    onClick={() => chooseTrumpSuit(suit)}
                    className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-gold-400 transition p-4 flex items-center justify-between"
                  >
                    <span className={cn("text-3xl", SUIT_COLOR[suit] === "red" ? "text-suit-red" : "text-white")}>
                      {SUIT_GLYPH[suit]}
                    </span>
                    <span className="text-sm text-white/70">{counts[suit]} cards</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-white/40 mt-4">Tip: pick a long, strong suit.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {s.phase === "hand_over" && s.result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="panel w-full max-w-sm p-7 text-center">
              <div className="text-5xl mb-2">{s.result.humanWon ? "🏆" : "😅"}</div>
              <h2 className={cn("font-display text-3xl font-bold", s.result.humanWon ? "text-gold-300" : "text-white/90")}>
                {s.result.humanWon ? "You win!" : "You lose"}
              </h2>
              <p className="text-white/65 text-sm mt-2">{s.result.message}</p>
              <div className="grid grid-cols-2 gap-2 my-6">
                <ResultStat label="Your 10s" value={`${s.result.tens[0]} / 4`} good={s.result.humanWon} />
                <ResultStat label="Rivals' 10s" value={`${s.result.tens[1]} / 4`} />
                <ResultStat label="Your tricks" value={String(s.result.tricks[0])} />
                <ResultStat label="Rivals' tricks" value={String(s.result.tricks[1])} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigate("/game/mendikot")} className="btn-ghost flex-1">Home</button>
                <button onClick={() => newGame()} className="btn-primary flex-1">
                  <Plus className="w-4 h-4" /> Play again
                </button>
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
  if (!trump) return <div className="chip bg-black/30 text-white/50 text-xs">No trump</div>;
  return (
    <motion.div
      key={revealed ? "rev" : "hid"}
      initial={revealed ? { scale: 1.3 } : false}
      animate={{ scale: 1 }}
      className={cn(
        "chip text-xs font-bold",
        revealed ? "bg-gold-500/25 text-gold-200 shadow-glow-soft" : "bg-black/40 text-white/70"
      )}
      title={revealed ? "Trump revealed" : "Trump (hidden from others)"}
    >
      {!revealed && <Lock className="w-3 h-3" />}
      <span className={cn("text-base", SUIT_COLOR[trump] === "red" ? "text-suit-red" : "text-white")}>{SUIT_GLYPH[trump]}</span>
      {revealed ? "Trump" : "Set"}
    </motion.div>
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
