import { motion } from "framer-motion";
import { Navigate, useNavigate } from "react-router-dom";
import { useGameStore } from "../store/gameStore";
import { leaderboard } from "../game/engine";
import { Crown, Home, RefreshCw } from "lucide-react";
import { cn } from "../lib/utils";

export function GameOverScreen() {
  const { state, resetGame, newGame, playerName, numBots } = useGameStore();
  const navigate = useNavigate();
  if (!state) return <Navigate to="/" replace />;
  const board = leaderboard(state);
  const winner = board[0];

  const playAgain = () => {
    newGame(playerName, numBots);
    navigate("/play");
  };
  const goHome = () => {
    resetGame();
    navigate("/");
  };

  return (
    <div className="min-h-screen relative table-felt flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 [background-image:radial-gradient(ellipse_at_center,rgba(212,165,116,0.3),transparent_60%)]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel relative max-w-lg w-full p-8 text-center"
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="inline-block text-6xl mb-2"
        >
          👑
        </motion.div>
        <div className="text-xs uppercase tracking-[0.3em] text-white/60">
          Champion
        </div>
        <div className="font-display text-3xl text-gold-400 mt-1">
          {winner.player.name} {winner.player.avatar}
        </div>
        <div className="text-white/70 text-sm">
          with <b className="text-gold-300">{winner.total}</b> points
        </div>

        <div className="mt-6 space-y-2 text-left">
          {board.map((entry, i) => (
            <motion.div
              key={entry.player.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg border",
                i === 0
                  ? "bg-gold-500/10 border-gold-500/40"
                  : "bg-white/5 border-white/10"
              )}
            >
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm">
                {i + 1}
              </div>
              <div className="text-2xl">{entry.player.avatar}</div>
              <div className="flex-1 font-medium">{entry.player.name}</div>
              {i === 0 && <Crown className="w-4 h-4 text-gold-400" />}
              <div className="font-bold text-gold-400">{entry.total}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-6">
          <button onClick={playAgain} className="btn-primary">
            <RefreshCw className="w-4 h-4" /> Play Again
          </button>
          <button onClick={goHome} className="btn-ghost">
            <Home className="w-4 h-4" /> Home
          </button>
        </div>
      </motion.div>
    </div>
  );
}
