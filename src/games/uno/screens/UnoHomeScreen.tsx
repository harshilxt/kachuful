import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../../../store/gameStore";
import { useMpStore } from "../../../store/multiplayerStore";
import { ArrowLeft, Bot, Info, Loader2, Sparkles, Users } from "lucide-react";
import { cn } from "../../../lib/utils";

export function UnoHomeScreen() {
  const { playerName, setPlayerName } = useGameStore();
  const mpSetName = useMpStore((s) => s.setName);
  const setPendingGameType = useMpStore((s) => s.setPendingGameType);
  const createRoom = useMpStore((s) => s.createRoom);
  const navigate = useNavigate();
  const [showRules, setShowRules] = useState(false);
  const [numBots, setNumBots] = useState(3);
  const [starting, setStarting] = useState(false);

  const goMultiplayer = () => {
    mpSetName(playerName);
    setPendingGameType("uno");
    navigate("/online");
  };

  const playVsAi = async () => {
    if (starting) return;
    mpSetName(playerName);
    setPendingGameType("uno");
    setStarting(true);
    try {
      const code = await createRoom(playerName, "uno", {
        bots: numBots,
        autostart: true,
      });
      navigate(`/room/${code}`);
    } catch {
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 table-felt" />
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_18%_22%,rgba(214,58,50,.4),transparent_38%),radial-gradient(circle_at_82%_28%,rgba(43,111,214,.4),transparent_40%),radial-gradient(circle_at_50%_92%,rgba(232,162,0,.4),transparent_42%)]" />

      <button
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 z-10 btn-ghost"
      >
        <ArrowLeft className="w-4 h-4" /> Games
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel relative w-full max-w-md p-7"
      >
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center mb-2">
            <div className="rotate-[-18deg] rounded-[50%] px-4 py-2 bg-red-600 shadow-card">
              <span className="font-black italic text-white text-3xl tracking-tight">
                UNO
              </span>
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-wide bg-gradient-to-b from-gold-400 to-gold-700 bg-clip-text text-transparent">
            UNO
          </h1>
          <div className="text-xs uppercase tracking-[0.3em] text-white/60 mt-1">
            Match · Stack · Shout UNO!
          </div>
        </div>

        <label className="block mb-4">
          <span className="text-xs uppercase tracking-widest text-white/60">
            Your name
          </span>
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={14}
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-gold-500 transition"
            placeholder="Enter name"
          />
        </label>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-5 text-sm text-white/75 leading-relaxed">
          <div className="grid grid-cols-3 gap-2 text-center mb-3">
            <div>
              <div className="text-gold-300 font-bold text-lg">7</div>
              <div className="text-[10px] text-white/50">Cards each</div>
            </div>
            <div>
              <div className="text-gold-300 font-bold text-lg">500</div>
              <div className="text-[10px] text-white/50">Points to win</div>
            </div>
            <div>
              <div className="text-gold-300 font-bold text-lg">2–10</div>
              <div className="text-[10px] text-white/50">Players</div>
            </div>
          </div>
          Match the top card by colour, number, or symbol. Use Skips, Reverses,
          Draw Twos and Wilds — and don't forget to shout UNO on your last card!
        </div>

        {/* AI opponents selector */}
        <div className="mb-3">
          <span className="text-xs uppercase tracking-widest text-white/60">
            AI opponents
          </span>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setNumBots(n)}
                className={cn(
                  "h-11 rounded-lg border font-bold transition",
                  numBots === n
                    ? "border-gold-400 bg-gold-500/15 text-gold-300 shadow-glow-soft"
                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-white/50 mt-1.5 flex items-center gap-1.5">
            <Bot className="w-3 h-3" /> {numBots + 1} players total
          </div>
        </div>

        <button
          onClick={playVsAi}
          disabled={starting}
          className="btn-primary w-full text-base"
        >
          {starting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Dealing…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Play vs AI
            </>
          )}
        </button>
        <button onClick={goMultiplayer} className="btn-ghost w-full text-base mt-2">
          <Users className="w-4 h-4" /> Play Online with Friends
        </button>

        <button
          onClick={() => setShowRules(true)}
          className="block mx-auto text-xs text-white/60 hover:text-white mt-4 underline-offset-2 hover:underline"
        >
          <Info className="w-3 h-3 inline mr-1" /> How to play
        </button>
      </motion.div>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}

function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
      className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="panel max-w-lg w-full p-6 max-h-[85vh] overflow-auto scrollbar-thin"
      >
        <h2 className="font-display text-xl mb-3">How to play UNO</h2>
        <div className="space-y-3 text-sm text-white/85 leading-relaxed">
          <p>
            <b>Goal:</b> Be first to play all your cards each round. The winner
            scores points from everyone else's leftover cards; first to{" "}
            <b className="text-gold-400">500</b> wins.
          </p>
          <p>
            <b>Play:</b> Match the top card by <b>colour</b>, <b>number</b>, or{" "}
            <b>symbol</b>. Can't play? Draw one — play it if it fits, else your
            turn passes.
          </p>
          <p>
            <b>Action cards:</b> <b>Skip</b> (next player misses a turn),{" "}
            <b>Reverse</b> (flip direction), <b>Draw Two</b> (next draws 2 &
            skipped), <b>Wild</b> (choose the colour), <b>Wild Draw Four</b>{" "}
            (choose colour, next draws 4 & skipped).
          </p>
          <p>
            <b className="text-gold-300">UNO!</b> When you're down to one card you
            must shout UNO — tap the UNO button before playing your
            second-to-last card or draw a 2-card penalty.
          </p>
        </div>
        <button onClick={onClose} className="btn-primary w-full mt-5">
          Got it
        </button>
      </motion.div>
    </motion.div>
  );
}
