import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../store/gameStore";
import { GAMES, type GameInfo } from "../games/catalog";
import { cn } from "../lib/utils";
import { Gamepad2, Lock, Users, ChevronRight } from "lucide-react";

export function DashboardScreen() {
  const { playerName, setPlayerName } = useGameStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 table-felt" />
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_15%_15%,rgba(230,193,119,.45),transparent_38%),radial-gradient(circle_at_85%_25%,rgba(91,156,125,.5),transparent_42%),radial-gradient(circle_at_50%_100%,rgba(244,114,182,.25),transparent_45%)]" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-3 mb-8 sm:mb-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-700 flex items-center justify-center text-2xl shadow-lg shadow-black/30">
              🃏
            </div>
            <div>
              <div className="font-display text-xl sm:text-2xl font-bold tracking-wide bg-gradient-to-b from-gold-300 to-gold-600 bg-clip-text text-transparent leading-none">
                CARD ROOM
              </div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/45 mt-0.5">
                Multiplayer card games
              </div>
            </div>
          </div>

          {/* Player chip */}
          <div className="panel flex items-center gap-2 px-3 py-1.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-felt-300 to-felt-600 flex items-center justify-center text-sm shrink-0">
              🧑‍🎓
            </div>
            <input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={14}
              aria-label="Your name"
              className="w-24 bg-transparent text-sm font-semibold outline-none focus:text-gold-300 transition"
            />
          </div>
        </header>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white/95">
            Choose your game
          </h1>
          <p className="text-white/55 text-sm mt-1 flex items-center gap-1.5">
            <Gamepad2 className="w-4 h-4" /> Pick a table, invite friends, and
            play in real time.
          </p>
        </motion.div>

        {/* Game grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {GAMES.map((g, i) => (
            <GameTile
              key={g.id}
              game={g}
              index={i}
              onPlay={() => g.route && navigate(g.route)}
            />
          ))}
        </div>

        <div className="text-center text-[11px] text-white/35 mt-8">
          More games coming soon · built for friends
        </div>
      </div>
    </div>
  );
}

function GameTile({
  game,
  index,
  onPlay,
}: {
  game: GameInfo;
  index: number;
  onPlay: () => void;
}) {
  const disabled = !game.available;
  return (
    <motion.button
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      whileHover={disabled ? undefined : { y: -4 }}
      whileTap={disabled ? undefined : { scale: 0.99 }}
      onClick={disabled ? undefined : onPlay}
      disabled={disabled}
      className={cn(
        "group relative text-left rounded-2xl border overflow-hidden transition-shadow",
        "border-white/10 bg-gradient-to-br",
        game.accent,
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer " + game.ring
      )}
    >
      {/* subtle pattern */}
      <div className="absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(45deg,#fff_0_2px,transparent_2px_14px)]" />

      <div className="relative p-5 flex flex-col gap-3 min-h-[150px]">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "w-14 h-14 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center text-3xl shadow-inner",
              !disabled && "group-hover:scale-105 transition"
            )}
          >
            {game.emoji}
          </div>
          {disabled ? (
            <span className="chip bg-black/40 text-white/60 text-[10px]">
              <Lock className="w-3 h-3" /> Coming soon
            </span>
          ) : (
            <span className="chip bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
              ● Live
            </span>
          )}
        </div>

        <div className="flex-1">
          <div className="font-display text-2xl font-bold text-white">
            {game.name}
          </div>
          <div className="text-sm text-white/65 mt-0.5">{game.tagline}</div>
        </div>

        <div className="flex items-center justify-between">
          <span className="chip bg-black/30 text-white/70 text-xs">
            <Users className="w-3.5 h-3.5" /> {game.players}
          </span>
          {!disabled && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-gold-300 group-hover:gap-2 transition-all">
              Play <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
