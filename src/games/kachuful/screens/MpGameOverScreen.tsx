import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useMpStore } from "../../../store/multiplayerStore";
import { leaderboard } from "../engine/engine";
import type { GameState } from "../engine/types";
import { Crown, Home, RefreshCw } from "lucide-react";
import { cn } from "../../../lib/utils";

export function MpGameOverScreen() {
  const { gameState, room, playerId, returnToLobby, leaveRoom } = useMpStore();
  const navigate = useNavigate();
  const handleLeave = () => {
    leaveRoom();
    navigate("/online");
  };
  if (!gameState) return null;
  const board = leaderboard(gameState as GameState);
  const winner = board[0];
  const isHost = room?.hostId === playerId;

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
              <div className="flex-1 font-medium">
                {entry.player.name}
                {entry.player.id === playerId && (
                  <span className="chip bg-gold-500/20 text-gold-300 text-[10px] ml-2">
                    You
                  </span>
                )}
              </div>
              {i === 0 && <Crown className="w-4 h-4 text-gold-400" />}
              <div className="font-bold text-gold-400">{entry.total}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-6">
          {isHost ? (
            <button onClick={returnToLobby} className="btn-primary">
              <RefreshCw className="w-4 h-4" /> Play Again
            </button>
          ) : (
            <button disabled className="btn-primary">
              Waiting for host…
            </button>
          )}
          <button onClick={handleLeave} className="btn-ghost">
            <Home className="w-4 h-4" /> Leave Room
          </button>
        </div>
      </motion.div>
    </div>
  );
}
