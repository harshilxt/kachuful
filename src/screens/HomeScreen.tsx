import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../store/gameStore";
import { useMpStore } from "../store/multiplayerStore";
import { Bot, Crown, Info, Sparkles, Users } from "lucide-react";
import { cn } from "../lib/utils";

export function HomeScreen() {
  const { playerName, setPlayerName, numBots, setNumBots, newGame } =
    useGameStore();
  const mpSetName = useMpStore((s) => s.setName);
  const navigate = useNavigate();
  const [showRules, setShowRules] = useState(false);

  const startSinglePlayer = () => {
    newGame(playerName, numBots);
    navigate("/play");
  };

  const goMultiplayer = () => {
    mpSetName(playerName);
    navigate("/online");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 table-felt" />
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_30%,rgba(230,193,119,.4),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(91,156,125,.5),transparent_40%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel relative w-full max-w-md p-7"
      >
        <div className="text-center mb-6">
          <motion.div
            animate={{ rotate: [-3, 3, -3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="inline-block text-5xl mb-2"
          >
            🃏
          </motion.div>
          <h1 className="font-display text-4xl font-bold tracking-wide bg-gradient-to-b from-gold-400 to-gold-700 bg-clip-text text-transparent">
            KACHU FUL
          </h1>
          <div className="text-xs uppercase tracking-[0.3em] text-white/60 mt-1">
            The Judgement Card Game
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

        <div className="mb-5">
          <span className="text-xs uppercase tracking-widest text-white/60">
            Opponents (AI)
          </span>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {[2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setNumBots(n)}
                className={cn(
                  "h-12 rounded-lg border font-bold transition",
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
          onClick={startSinglePlayer}
          className="btn-primary w-full text-base"
        >
          <Sparkles className="w-4 h-4" /> Play vs AI
        </button>

        <button
          onClick={goMultiplayer}
          className="btn-ghost w-full mt-2"
        >
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
        <div className="flex items-center gap-2 mb-3">
          <Crown className="w-5 h-5 text-gold-400" />
          <h2 className="font-display text-xl">How to play Kachu Ful</h2>
        </div>
        <div className="space-y-3 text-sm text-white/85 leading-relaxed">
          <p>
            <b>Goal:</b> Win <i>exactly</i> the number of tricks you bid each
            round — no more, no fewer. Make your bid: score{" "}
            <span className="text-gold-400 font-semibold">10 + bid</span>. Miss:
            score 0.
          </p>
          <p>
            <b>Rounds:</b> The deal grows from 1 card up to 8, then back down.
            Trump rotates each round in the order ♠ ♥ ♦ ♣ → No Trump.
          </p>
          <p>
            <b>Bidding:</b> Going clockwise from the dealer's left, each player
            bids how many tricks they'll win. The dealer bids last and{" "}
            <b className="text-red-300">cannot</b> make the total bids equal
            the total tricks (someone must fail).
          </p>
          <p>
            <b>Playing:</b> The player left of the dealer leads first. Others
            must follow the led suit if they can. If not, play any card,
            including trump. Highest trump wins, otherwise highest card of the
            led suit. Trick winner leads next.
          </p>
          <p>
            <b>End:</b> After all rounds, the highest total wins. 👑
          </p>
        </div>
        <button onClick={onClose} className="btn-primary w-full mt-5">
          Got it
        </button>
      </motion.div>
    </motion.div>
  );
}
