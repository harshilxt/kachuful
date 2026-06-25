import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { GAMES, type GameInfo } from "../games/catalog";
import { cn } from "../lib/utils";
import { SITE_NAME, SITE_URL } from "../lib/siteConfig";
import { Seo } from "../components/Seo";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import {
  Gamepad2,
  Lock,
  Users,
  Sparkles,
  Zap,
  Wifi,
  Play,
} from "lucide-react";

const liveCount = GAMES.filter((g) => g.available).length;

export function DashboardScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col relative">
      <Seo
        title="PlayGameHub – Play Kachuful, UNO & Blackjack Online Free"
        description="Free online multiplayer card games. Play Kachuful (Judgement), UNO and Blackjack with friends or against AI — instantly in your browser, no download, no sign-up."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: [
            { name: "Kachuful", url: `${SITE_URL}/game/kachuful` },
            { name: "UNO", url: `${SITE_URL}/game/uno` },
            { name: "Blackjack", url: `${SITE_URL}/game/blackjack` },
          ].map((g, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: g.name,
            url: g.url,
          })),
        }}
      />
      <div className="fixed inset-0 -z-10 table-felt" />
      <div className="fixed inset-0 -z-10 opacity-25 [background-image:radial-gradient(circle_at_15%_15%,rgba(230,193,119,.45),transparent_38%),radial-gradient(circle_at_85%_25%,rgba(91,156,125,.5),transparent_42%),radial-gradient(circle_at_50%_100%,rgba(244,114,182,.25),transparent_45%)]" />

      <SiteHeader />

      <main className="relative z-10 flex-1 site-container py-10 sm:py-14">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-12 sm:mb-16 text-center"
        >
          {/* floating decorative suits */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {["♠", "♥", "♦", "♣"].map((s, i) => (
              <motion.span
                key={s}
                aria-hidden
                className={cn(
                  "absolute select-none font-display",
                  i === 0 && "left-[6%] top-2 text-6xl text-white/[0.06]",
                  i === 1 && "right-[8%] top-0 text-7xl text-rose-400/[0.10]",
                  i === 2 && "left-[16%] bottom-0 text-5xl text-rose-400/[0.08]",
                  i === 3 && "right-[18%] bottom-2 text-6xl text-white/[0.06]"
                )}
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 4 + i,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.5,
                }}
              >
                {s}
              </motion.span>
            ))}
          </div>

          <span className="chip bg-gold-500/15 text-gold-300 border border-gold-500/25 mb-5">
            <Sparkles className="w-3.5 h-3.5" /> Free · No download · Instant play
          </span>
          <h1 className="font-display text-4xl sm:text-6xl font-bold text-white/95 leading-[1.05] max-w-3xl mx-auto">
            Play card games with friends,{" "}
            <span className="bg-gradient-to-b from-gold-200 to-gold-600 bg-clip-text text-transparent">
              anywhere.
            </span>
          </h1>
          <p className="text-white/60 text-base sm:text-lg mt-5 max-w-2xl mx-auto leading-relaxed">
            Welcome to {SITE_NAME} — your home for classic multiplayer card and
            casual games. Pick a table, invite friends with a room code, or play
            against smart AI. All free, right in your browser.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-7">
            <span className="chip bg-black/30 text-white/75 text-xs px-3 py-1.5 border border-white/10">
              <Zap className="w-3.5 h-3.5 text-gold-300" /> {liveCount} games live
            </span>
            <span className="chip bg-black/30 text-white/75 text-xs px-3 py-1.5 border border-white/10">
              <Wifi className="w-3.5 h-3.5 text-emerald-300" /> Real-time multiplayer
            </span>
            <span className="chip bg-black/30 text-white/75 text-xs px-3 py-1.5 border border-white/10">
              <Users className="w-3.5 h-3.5 text-sky-300" /> Up to 10 players
            </span>
          </div>
        </motion.section>

        {/* Section heading */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <Gamepad2 className="w-6 h-6 text-gold-300" />
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white/95">
              Choose your game
            </h2>
          </div>
          <span className="text-sm text-white/40 hidden sm:block">
            {GAMES.length} titles
          </span>
        </div>

        {/* Game grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {GAMES.map((g, i) => (
            <GameTile
              key={g.id}
              game={g}
              index={i}
              onPlay={() => g.route && navigate(g.route)}
            />
          ))}
        </div>

        <div className="text-center text-sm text-white/40 mt-10">
          🎉 More games coming soon — built for friends
        </div>
      </main>

      <SiteFooter />
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      whileHover={disabled ? undefined : { y: -6 }}
      whileTap={disabled ? undefined : { scale: 0.985 }}
      onClick={disabled ? undefined : onPlay}
      disabled={disabled}
      className={cn(
        "group relative text-left rounded-3xl border overflow-hidden transition-shadow shadow-card",
        "border-white/10 bg-gradient-to-br",
        game.accent,
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:shadow-card-hover " + game.ring
      )}
    >
      {/* soft corner glow */}
      <div className="absolute inset-0 [background-image:radial-gradient(circle_at_78%_18%,rgba(255,255,255,0.14),transparent_55%)]" />
      {/* top sheen */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/10 to-transparent" />
      {/* giant watermark */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-4 -bottom-6 text-[8.5rem] leading-none rotate-[-12deg] opacity-[0.13] group-hover:opacity-20 group-hover:scale-110 transition-all duration-500 select-none"
      >
        {game.emoji}
      </span>

      <div className="relative p-6 flex flex-col gap-4 min-h-[248px]">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "w-16 h-16 rounded-2xl bg-black/35 border border-white/15 flex items-center justify-center text-4xl shadow-inner shadow-black/40",
              !disabled && "group-hover:scale-110 group-hover:-rotate-3 transition"
            )}
          >
            {game.emoji}
          </div>
          {disabled ? (
            <span className="chip bg-black/40 text-white/60 text-[10px]">
              <Lock className="w-3 h-3" /> Coming soon
            </span>
          ) : (
            <span className="chip bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold ring-1 ring-emerald-400/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />{" "}
              Live
            </span>
          )}
        </div>

        <div className="flex-1">
          <div className="font-display text-2xl sm:text-[1.7rem] font-bold text-white leading-tight">
            {game.name}
          </div>
          <div className="text-sm text-white/65 mt-1.5 leading-snug">
            {game.tagline}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="chip bg-black/30 text-white/70 text-xs border border-white/10">
            <Users className="w-3.5 h-3.5" /> {game.players}
          </span>
          {!disabled && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 text-ink-900 font-bold text-sm pl-3.5 pr-3 py-1.5 shadow-lg shadow-black/30 group-hover:bg-gold-400 transition">
              Play <Play className="w-3.5 h-3.5 fill-ink-900" />
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
