import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../../../store/gameStore";
import { useMpStore } from "../../../store/multiplayerStore";
import { ArrowLeft, Info, Spade, Users } from "lucide-react";
import { Seo } from "../../../components/Seo";
import { GameInfoContent, faqJsonLd } from "../../../components/GameInfoContent";
import { SITE_URL } from "../../../lib/siteConfig";

const INTRO = [
  "Blackjack — also called 21 — is the world's most popular casino card game. The aim is simple: build a hand worth more than the dealer's without going over 21. It's quick to learn, fast to play and endlessly replayable.",
  "On PlayGameHub you can play Blackjack online for free with virtual chips — no real money and no download. Play solo against the dealer or create a room and invite up to 7 friends to the table.",
];

const HOW_TO = [
  "Place a chip bet to start the round. You and the dealer each receive two cards; one of the dealer's cards stays face-down.",
  "Card values: number cards are face value, J/Q/K are worth 10, and an Ace counts as 1 or 11.",
  "On your turn choose Hit (take a card), Stand (stop), Double (double your bet for one more card) or Split (two same-rank cards into two hands). Go over 21 and you bust.",
  "The dealer then reveals the hole card and must keep drawing until reaching 17 or more.",
  "Win 1:1, or a natural Blackjack pays 3:2. A tie is a push and your bet is returned.",
];

const FAQS = [
  {
    q: "Is this Blackjack game free?",
    a: "Yes. Blackjack on PlayGameHub is free to play with virtual chips. There is no real-money gambling and nothing to download.",
  },
  {
    q: "Can I play Blackjack against friends?",
    a: "Yes. Create a private room and share the code so up to 7 friends can join the same table, or play solo against the dealer.",
  },
  {
    q: "What does Blackjack pay?",
    a: "A standard win pays 1:1. A natural Blackjack (an Ace plus a 10-value card) pays 3:2. Ties are a push and your bet is returned.",
  },
  {
    q: "Does the dealer hit on 17?",
    a: "The dealer draws cards until reaching a total of 17 or more, then stands.",
  },
];

const GAME_JSONLD = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  name: "Blackjack (21)",
  url: `${SITE_URL}/game/blackjack`,
  description:
    "Play Blackjack (21) online free with virtual chips. Beat the dealer without going over 21 — solo or multiplayer for 1–7 players.",
  genre: ["Card game", "Casino"],
  playMode: ["SinglePlayer", "MultiPlayer"],
  applicationCategory: "Game",
  operatingSystem: "Web browser",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export function BlackjackHomeScreen() {
  const { playerName, setPlayerName } = useGameStore();
  const mpSetName = useMpStore((s) => s.setName);
  const setPendingGameType = useMpStore((s) => s.setPendingGameType);
  const navigate = useNavigate();
  const [showRules, setShowRules] = useState(false);

  const goMultiplayer = () => {
    mpSetName(playerName);
    setPendingGameType("blackjack");
    navigate("/online");
  };

  return (
    <div className="min-h-screen relative">
      <Seo
        title="Play Blackjack Online Free – 21 Card Game | PlayGameHub"
        description="Play Blackjack (21) online for free with virtual chips. Beat the dealer solo or with friends — hit, stand, double and split. No download, instant play in your browser."
        path="/game/blackjack"
        jsonLd={[GAME_JSONLD, faqJsonLd(FAQS)]}
      />
      <div className="fixed inset-0 -z-10 table-felt" />
      <div className="fixed inset-0 -z-10 opacity-20 [background-image:radial-gradient(circle_at_20%_25%,rgba(244,114,182,.35),transparent_40%),radial-gradient(circle_at_80%_75%,rgba(230,193,119,.35),transparent_42%)]" />

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
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-600 to-ink-900 items-center justify-center mb-2 shadow-lg shadow-black/40">
            <Spade className="w-7 h-7 text-white" fill="currentColor" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-wide bg-gradient-to-b from-gold-400 to-gold-700 bg-clip-text text-transparent">
            BLACKJACK
          </h1>
          <div className="text-xs uppercase tracking-[0.3em] text-white/60 mt-1">
            Beat the dealer · 21
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
              <div className="text-gold-300 font-bold text-lg">$1,000</div>
              <div className="text-[10px] text-white/50">Starting chips</div>
            </div>
            <div>
              <div className="text-gold-300 font-bold text-lg">3:2</div>
              <div className="text-[10px] text-white/50">Blackjack pays</div>
            </div>
            <div>
              <div className="text-gold-300 font-bold text-lg">1–7</div>
              <div className="text-[10px] text-white/50">Players</div>
            </div>
          </div>
          Get closer to 21 than the dealer without busting. Hit, Stand, Double,
          Split. Dealer stands on 17. Play solo vs the dealer or invite friends.
        </div>

        <button
          onClick={goMultiplayer}
          className="btn-primary w-full text-base"
        >
          <Users className="w-4 h-4" /> Play Online
        </button>
        <div className="text-[11px] text-white/45 text-center mt-2">
          Create a room and play alone vs the dealer, or share the code.
        </div>

        <button
          onClick={() => setShowRules(true)}
          className="block mx-auto text-xs text-white/60 hover:text-white mt-4 underline-offset-2 hover:underline"
        >
          <Info className="w-3 h-3 inline mr-1" /> How to play
        </button>
      </motion.div>
      </div>

      <GameInfoContent
        name="Blackjack"
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
          <Spade className="w-5 h-5 text-gold-400" fill="currentColor" />
          <h2 className="font-display text-xl">How to play Blackjack</h2>
        </div>
        <div className="space-y-3 text-sm text-white/85 leading-relaxed">
          <p>
            <b>Goal:</b> Beat the dealer by getting a hand total closer to{" "}
            <b>21</b> without going over. Number cards = face value, J/Q/K = 10,
            Ace = 1 or 11.
          </p>
          <p>
            <b>Bet:</b> Place a chip bet each round. You and the dealer each get
            two cards (one of the dealer's stays face-down).
          </p>
          <p>
            <b>Your turn:</b> <b>Hit</b> (take a card), <b>Stand</b> (stop),{" "}
            <b>Double</b> (double the bet, take exactly one card), or{" "}
            <b>Split</b> (two same-rank cards into two hands). Over 21 = bust.
          </p>
          <p>
            <b>Dealer:</b> reveals the hole card and draws until 17 or more.
          </p>
          <p>
            <b>Payouts:</b> win 1:1, a natural{" "}
            <span className="text-gold-400 font-semibold">
              Blackjack pays 3:2
            </span>
            , tie is a push (bet returned).
          </p>
        </div>
        <button onClick={onClose} className="btn-primary w-full mt-5">
          Got it
        </button>
      </motion.div>
    </motion.div>
  );
}
