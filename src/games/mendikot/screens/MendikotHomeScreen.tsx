import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Sparkles } from "lucide-react";
import { Seo } from "../../../components/Seo";
import { GameInfoContent, faqJsonLd } from "../../../components/GameInfoContent";
import { SITE_URL } from "../../../lib/siteConfig";
import { useMendikotStore } from "../store";
import { useMpStore } from "../../../store/multiplayerStore";

const INTRO = [
  "Mendikot — also called Mendicot or Dehla Pakad — is a beloved Indian trick-taking card game for four players in two partnerships. The whole game revolves around one thing: capturing the four 10s (the 'dehla').",
  "On PlayGameHub you can play Mendikot online for free against three smart AI players (with one as your partner) — with the authentic hidden-trump rule, right in your browser, no download or sign-up.",
];

const HOW_TO = [
  "Four players sit in two teams; you and the player across from you are partners. All 52 cards are dealt — 13 each.",
  "You secretly choose a trump suit. It stays hidden from everyone until a player can't follow suit — then the trump is revealed for the rest of the hand.",
  "Each trick, follow the led suit if you can. The highest card of the led suit wins — or the highest trump once trump is revealed.",
  "Your goal is to win tricks containing 10s. The four 10s are all that matter for winning.",
  "The team that captures 3 or 4 of the 10s wins the hand. If the 10s split 2–2, the team with more tricks (7+) wins.",
  "Capture all four 10s for a 'Mendikot', or win all 13 tricks for a 'Whitewash'.",
];

const FAQS = [
  {
    q: "Is Mendikot free to play?",
    a: "Yes. Mendikot on PlayGameHub is completely free, with no downloads, sign-ups or in-app purchases.",
  },
  {
    q: "What is the goal of Mendikot?",
    a: "To capture tricks containing the four 10s. The team that wins 3 or 4 of the 10s wins the hand; if the 10s are split 2–2, the team with more tricks wins.",
  },
  {
    q: "What does 'Mendikot' mean?",
    a: "Winning all four 10s in a single hand is called a Mendikot. Winning all 13 tricks is a 'whitewash' (52-card Mendikot).",
  },
  {
    q: "How does the trump work in Mendikot?",
    a: "A trump suit is chosen but kept secret. The first time any player cannot follow the suit that was led, the trump is revealed and applies for the rest of the hand.",
  },
  {
    q: "Is Mendikot the same as Dehla Pakad?",
    a: "They are very closely related — Dehla Pakad is the North-Indian name for essentially the same 'catch the 10s' partnership game.",
  },
];

const GAME_JSONLD = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  name: "Mendikot (Dehla Pakad)",
  url: `${SITE_URL}/game/mendikot`,
  description:
    "Play Mendikot (Dehla Pakad) online free — the Indian 4-player partnership trick-taking game where you capture the four 10s, with hidden trump.",
  genre: ["Card game", "Trick-taking", "Partnership"],
  playMode: ["SinglePlayer"],
  applicationCategory: "Game",
  operatingSystem: "Web browser",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export function MendikotHomeScreen() {
  const navigate = useNavigate();
  const playerName = useMendikotStore((s) => s.playerName);
  const setPlayerName = useMendikotStore((s) => s.setPlayerName);
  const newGame = useMendikotStore((s) => s.newGame);
  const mpSetName = useMpStore((s) => s.setName);
  const setPendingGameType = useMpStore((s) => s.setPendingGameType);

  const play = () => {
    newGame(playerName);
    navigate("/game/mendikot/play");
  };

  const goMultiplayer = () => {
    mpSetName(playerName);
    setPendingGameType("mendikot");
    navigate("/online");
  };

  return (
    <div className="min-h-screen relative">
      <Seo
        title="Play Mendikot Online Free – Dehla Pakad Card Game | PlayGameHub"
        description="Play Mendikot (Dehla Pakad) online for free — the Indian 4-player partnership card game where you capture the four 10s, with the authentic hidden-trump rule. No download."
        path="/game/mendikot"
        jsonLd={[GAME_JSONLD, faqJsonLd(FAQS)]}
      />
      <div className="fixed inset-0 -z-10 table-felt" />
      <div className="fixed inset-0 -z-10 opacity-20 [background-image:radial-gradient(circle_at_20%_25%,rgba(230,193,119,.4),transparent_42%),radial-gradient(circle_at_80%_75%,rgba(91,156,125,.5),transparent_42%)]" />

      <button onClick={() => navigate("/")} className="absolute top-4 left-4 z-10 btn-ghost">
        <ArrowLeft className="w-4 h-4" /> Games
      </button>

      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="panel relative w-full max-w-md p-7">
          <div className="text-center mb-5">
            <motion.div
              animate={{ rotate: [-4, 4, -4] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-felt-400 to-felt-700 items-center justify-center mb-2 shadow-lg shadow-black/40 text-3xl"
            >
              🔟
            </motion.div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-gold-400">Mendikot</h1>
            <div className="text-xs uppercase tracking-[0.3em] text-white/60 mt-1">Dehla Pakad · Catch the 10s</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-5 text-sm text-white/75 leading-relaxed">
            A 4-player partnership game (you + a partner vs two rivals). Choose a
            secret trump, win tricks, and capture the four <b className="text-gold-300">10s</b> to win.
          </div>

          <label className="block mb-4">
            <span className="text-xs uppercase tracking-widest text-white/60">Your name</span>
            <input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={14}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-gold-500 transition"
              placeholder="Enter name"
            />
          </label>

          <button onClick={play} className="btn-primary w-full text-base">
            <Sparkles className="w-4 h-4" /> Play vs AI
          </button>
          <button onClick={goMultiplayer} className="btn-ghost w-full text-base mt-2">
            <Users className="w-4 h-4" /> Play Online with Friends
          </button>
          <div className="text-[11px] text-white/45 text-center mt-2">
            Empty seats are filled with AI so the game always starts.
          </div>
        </motion.div>
      </div>

      <GameInfoContent name="Mendikot" intro={INTRO} howTo={HOW_TO} faqs={FAQS} />
    </div>
  );
}
