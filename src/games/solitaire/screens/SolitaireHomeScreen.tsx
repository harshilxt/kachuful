import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Layers, Sparkles } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Seo } from "../../../components/Seo";
import { GameInfoContent, faqJsonLd } from "../../../components/GameInfoContent";
import { SITE_URL } from "../../../lib/siteConfig";
import { useSolitaireStore } from "../store";
import type { DrawMode } from "../engine/types";

const INTRO = [
  "Solitaire — also known as Klondike or Patience — is the world's most famous single-player card game, made iconic by Windows. Your aim is to sort a shuffled 52-card deck into four ordered foundation piles, one for each suit, from Ace up to King.",
  "On PlayGameHub you can play Solitaire online for free, in either Draw-1 (easier) or Draw-3 (classic) mode — instantly in your browser, with no download or sign-up.",
];

const HOW_TO = [
  "Cards are dealt into 7 tableau columns. Only the top card of each column starts face up; the rest are face down.",
  "Build the 4 foundation piles up by suit, from Ace to King (A, 2, 3 … J, Q, K).",
  "In the tableau, stack cards downward in alternating colours — e.g. a red 6 on a black 7. Move a whole ordered run at once.",
  "Only a King (or a run starting with a King) can be placed on an empty column.",
  "Flip cards from the stock to the waste pile to find more moves; recycle the stock when it runs out.",
  "Win when all 52 cards reach the foundations. Tap a card to select it, tap a destination to move, or double-tap to send it straight to a foundation.",
];

const FAQS = [
  {
    q: "Is Solitaire free to play?",
    a: "Yes. Solitaire on PlayGameHub is completely free, with no downloads, sign-ups or in-app purchases.",
  },
  {
    q: "What is the difference between Draw-1 and Draw-3?",
    a: "Draw-1 flips one card from the stock at a time, making most games winnable and beginner-friendly. Draw-3 flips three at a time and only the top is playable — the classic, harder mode.",
  },
  {
    q: "What is the goal of Klondike Solitaire?",
    a: "Move all 52 cards onto the four foundation piles, each built up by suit from Ace to King.",
  },
  {
    q: "Can every Solitaire game be won?",
    a: "Not always — some deals are unsolvable. Draw-1 deals are winnable far more often than Draw-3. You can start a new game any time.",
  },
];

const GAME_JSONLD = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  name: "Solitaire (Klondike)",
  url: `${SITE_URL}/game/solitaire`,
  description:
    "Play Klondike Solitaire online free in Draw-1 or Draw-3 mode. Sort all 52 cards into four foundations from Ace to King.",
  genre: ["Card game", "Patience", "Single player"],
  playMode: ["SinglePlayer"],
  applicationCategory: "Game",
  operatingSystem: "Web browser",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export function SolitaireHomeScreen() {
  const navigate = useNavigate();
  const drawMode = useSolitaireStore((s) => s.drawMode);
  const setDrawMode = useSolitaireStore((s) => s.setDrawMode);
  const newGame = useSolitaireStore((s) => s.newGame);

  const [mode, setMode] = useState<DrawMode>(drawMode);

  const play = () => {
    setDrawMode(mode);
    newGame(mode);
    navigate("/game/solitaire/play");
  };

  return (
    <div className="min-h-screen relative">
      <Seo
        title="Play Solitaire Online Free – Klondike (Draw 1 & 3) | PlayGameHub"
        description="Play classic Klondike Solitaire online for free — choose Draw-1 or Draw-3, with timer, score, undo and auto-complete. No download, instant play in your browser."
        path="/game/solitaire"
        jsonLd={[GAME_JSONLD, faqJsonLd(FAQS)]}
      />
      <div className="fixed inset-0 -z-10 table-felt" />
      <div className="fixed inset-0 -z-10 opacity-20 [background-image:radial-gradient(circle_at_20%_25%,rgba(230,193,119,.4),transparent_42%),radial-gradient(circle_at_80%_75%,rgba(91,156,125,.5),transparent_42%)]" />

      <button
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 z-10 btn-ghost"
      >
        <ArrowLeft className="w-4 h-4" /> Games
      </button>

      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel relative w-full max-w-md p-7"
        >
          <div className="text-center mb-5">
            <motion.div
              animate={{ rotate: [-4, 4, -4] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-felt-400 to-felt-700 items-center justify-center mb-2 shadow-lg shadow-black/40 text-3xl"
            >
              🂡
            </motion.div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-gold-400">
              Solitaire
            </h1>
            <div className="text-xs uppercase tracking-[0.3em] text-white/60 mt-1">
              Klondike · Patience
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-5 text-sm text-white/75 leading-relaxed">
            Sort all 52 cards into the four foundations, Ace to King. Stack the
            tableau down in alternating colours, dig through the stock, and clear
            the board.
          </div>

          {/* Draw mode toggle */}
          <span className="text-xs uppercase tracking-widest text-white/60">
            Difficulty
          </span>
          <div className="grid grid-cols-2 gap-2 mt-2 mb-1">
            {([1, 3] as DrawMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-lg border px-3 py-3 text-left transition",
                  mode === m
                    ? "border-gold-400 bg-gold-500/15 shadow-glow-soft"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                )}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <Layers className="w-4 h-4 text-gold-300" /> Draw {m}
                </div>
                <div className="text-[11px] text-white/55 mt-0.5">
                  {m === 1 ? "Easier · flip 1 card" : "Classic · flip 3 cards"}
                </div>
              </button>
            ))}
          </div>

          <button onClick={play} className="btn-primary w-full text-base mt-4">
            <Sparkles className="w-4 h-4" /> Play Solitaire
          </button>
        </motion.div>
      </div>

      <GameInfoContent
        name="Solitaire"
        intro={INTRO}
        howTo={HOW_TO}
        faqs={FAQS}
      />
    </div>
  );
}
