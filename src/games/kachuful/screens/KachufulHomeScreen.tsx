import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../../../store/gameStore";
import { useMpStore } from "../../../store/multiplayerStore";
import { DEFAULT_SETTINGS } from "../engine/engine";
import { ArrowLeft, Bot, Crown, Info, Sparkles, Users } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Seo } from "../../../components/Seo";
import { GameInfoContent, faqJsonLd } from "../../../components/GameInfoContent";
import { SITE_URL } from "../../../lib/siteConfig";

const INTRO = [
  "Kachuful — also known as Judgement, Kachufool or Oh Hell — is a classic trick-taking card game where the goal isn't to win the most tricks, but to win exactly the number you predict. It's a beloved card game that rewards sharp judgement over luck.",
  "On PlayGameHub you can play Kachuful online for free, against smart AI opponents or in real-time multiplayer rooms with 2–7 friends. No download or sign-up needed — just open your browser and deal.",
];

const HOW_TO = [
  "Each round every player is dealt the same number of cards. The deal grows from 1 card up to a chosen peak and back down again.",
  "Look at your hand and bid the exact number of tricks you think you'll win. The dealer bids last and can't make the total bids equal the number of tricks.",
  "Play clockwise — follow the led suit if you can. The highest trump, or the highest card of the led suit, wins the trick.",
  "Win exactly your bid to score 10 + your bid. Miss it (over or under) and you score zero that round.",
  "After all rounds are played, the highest total score wins the game.",
];

const FAQS = [
  {
    q: "Is Kachuful free to play?",
    a: "Yes. Kachuful is completely free to play on PlayGameHub, with no downloads, sign-ups or in-app purchases.",
  },
  {
    q: "Can I play Kachuful with friends online?",
    a: "Absolutely. Create a private room, share the room code with up to 7 friends, and play together in real time from any device.",
  },
  {
    q: "How many players can play Kachuful?",
    a: "Kachuful supports 2 to 7 players. You can fill empty seats with AI opponents to play solo or with a smaller group.",
  },
  {
    q: "What is another name for Kachuful?",
    a: "Kachuful is also known as Judgement, Kachufool, Oh Hell or Oh Pshaw — they're the same trick-prediction card game.",
  },
];

const GAME_JSONLD = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  name: "Kachuful (Judgement)",
  url: `${SITE_URL}/game/kachuful`,
  description:
    "Play Kachuful (Judgement) online free — a classic trick-taking card game for 2–7 players. Bid the exact tricks you'll win.",
  genre: ["Card game", "Trick-taking"],
  playMode: ["SinglePlayer", "MultiPlayer"],
  applicationCategory: "Game",
  operatingSystem: "Web browser",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export function KachufulHomeScreen() {
  const { playerName, setPlayerName, numBots, setNumBots, newGame } =
    useGameStore();
  const mpSetName = useMpStore((s) => s.setName);
  const setPendingGameType = useMpStore((s) => s.setPendingGameType);
  const navigate = useNavigate();
  const [showRules, setShowRules] = useState(false);
  const [maxCards, setMaxCards] = useState(DEFAULT_SETTINGS.maxCards);

  const startSinglePlayer = () => {
    newGame(playerName, numBots, { ...DEFAULT_SETTINGS, maxCards });
    navigate("/play");
  };

  const goMultiplayer = () => {
    mpSetName(playerName);
    setPendingGameType("kachuful");
    navigate("/online");
  };

  return (
    <div className="min-h-screen relative">
      <Seo
        title="Play Kachuful Online Free – Judgement Card Game | PlayGameHub"
        description="Play Kachuful (Judgement) online for free with friends or against AI. The classic trick-taking card game for 2–7 players — no download, instant play in your browser."
        path="/game/kachuful"
        jsonLd={[GAME_JSONLD, faqJsonLd(FAQS)]}
      />
      <div className="fixed inset-0 -z-10 table-felt" />
      <div className="fixed inset-0 -z-10 opacity-20 [background-image:radial-gradient(circle_at_20%_30%,rgba(230,193,119,.4),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(91,156,125,.5),transparent_40%)]" />

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
            animate={{ rotate: [-3, 3, -3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="inline-block text-5xl mb-2"
          >
            🃏
          </motion.div>
          <h1 className="font-display text-3xl font-bold tracking-wide bg-gradient-to-b from-gold-400 to-gold-700 bg-clip-text text-transparent">
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

        <div className="mb-4">
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

        <div className="mb-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-white/60">
              Game Length
            </span>
            <span className="text-[11px] text-white/65">
              <span className="text-gold-400 font-semibold">
                {2 * maxCards - 1}
              </span>{" "}
              rounds
            </span>
          </div>
          <div className="grid grid-cols-6 gap-1 mt-2">
            {[2, 3, 4, 5, 6, 7].map((max) => (
              <button
                key={max}
                onClick={() => setMaxCards(max)}
                className={cn(
                  "h-11 rounded-md border text-center transition leading-tight",
                  maxCards === max
                    ? "border-gold-400 bg-gold-500/15 text-gold-300 shadow-glow-soft"
                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                )}
                title={`${2 * max - 1} rounds (1 → ${max} → 1)`}
              >
                <div className="text-sm font-semibold">{max}</div>
                <div className="text-[9px] opacity-80">{2 * max - 1}r</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={startSinglePlayer}
          className="btn-primary w-full text-base"
        >
          <Sparkles className="w-4 h-4" /> Play vs AI
        </button>
        <button onClick={goMultiplayer} className="btn-ghost w-full mt-2">
          <Users className="w-4 h-4" /> Play Online with Friends
        </button>

        <button
          onClick={() => setShowRules(true)}
          className="block mx-auto text-xs text-white/60 hover:text-white mt-4 underline-offset-2 hover:underline"
        >
          <Info className="w-3 h-3 inline mr-1" /> How to play
        </button>
      </motion.div>
      </div>

      <GameInfoContent
        name="Kachuful"
        intro={INTRO}
        howTo={HOW_TO}
        faqs={FAQS}
      />

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
            round. Make your bid: score{" "}
            <span className="text-gold-400 font-semibold">10 + bid</span>. Miss:
            score 0.
          </p>
          <p>
            <b>Rounds:</b> The deal grows from 1 card up to the chosen peak,
            then back down. Trump rotates ♠ → ♦ → ♣ → ♥ each round.
          </p>
          <p>
            <b>Bidding:</b> Clockwise from the dealer's left. The dealer bids
            last and <b className="text-red-300">cannot</b> make total bids
            equal the trick count.
          </p>
          <p>
            <b>Playing:</b> Follow the led suit if you can. Highest trump wins,
            else highest card of the led suit. Trick winner leads next.
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
