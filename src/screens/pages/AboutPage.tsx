import { Link } from "react-router-dom";
import {
  Gamepad2,
  Users,
  Sparkles,
  ShieldCheck,
  Zap,
  Globe,
} from "lucide-react";
import { PageLayout, ContentCard } from "../../components/PageLayout";
import { Seo } from "../../components/Seo";
import { SITE_NAME, SITE_DOMAIN } from "../../lib/siteConfig";

const FEATURES = [
  {
    icon: Users,
    title: "Real-time multiplayer",
    body: "Create a room, share the code, and play live with friends from anywhere.",
  },
  {
    icon: Zap,
    title: "No downloads",
    body: "Everything runs right in your browser on desktop or mobile — just open and play.",
  },
  {
    icon: Sparkles,
    title: "Play vs AI",
    body: "No friends online? Practise against smart computer opponents any time.",
  },
  {
    icon: ShieldCheck,
    title: "Free forever",
    body: "All our games are completely free to play. No paywalls, no pay-to-win.",
  },
];

export function AboutPage() {
  return (
    <PageLayout
      eyebrow="About us"
      title={`Welcome to ${SITE_NAME}`}
      subtitle={`${SITE_DOMAIN} is a free online gaming platform where you can play classic card and casual games with friends or against the computer — instantly, in your browser.`}
      width="wide"
    >
      <Seo
        title={`About ${SITE_NAME} – Free Online Card Games Platform`}
        description={`Learn about ${SITE_NAME} (${SITE_DOMAIN}), a free online platform for playing Kachuful, UNO and Blackjack with friends or against AI in your browser.`}
        path="/about"
      />
      <ContentCard className="mb-6">
        <h2 className="font-display text-xl text-white mb-3 flex items-center gap-2">
          <Globe className="w-5 h-5 text-gold-400" /> What is {SITE_NAME}?
        </h2>
        <div className="space-y-3 text-white/75 leading-relaxed text-sm sm:text-base">
          <p>
            {SITE_NAME} is a free online multiplayer and casual gaming platform.
            We bring well-loved card games like <b>Kachuful (Judgement)</b>,{" "}
            <b>UNO</b> and <b>Blackjack</b> to your browser, so you can jump into
            a game in seconds — no sign-up, no installs, no fuss.
          </p>
          <p>
            Whether you want a quick solo round against AI opponents or a lively
            table full of friends, {SITE_NAME} makes it easy. Spin up a private
            room, send the join code to your friends, and you're playing in real
            time within moments.
          </p>
        </div>
      </ContentCard>

      <ContentCard className="mb-6">
        <h2 className="font-display text-xl text-white mb-3 flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-gold-400" /> Our mission
        </h2>
        <p className="text-white/75 leading-relaxed text-sm sm:text-base">
          Our mission is simple: to keep the joy of playing classic games with
          friends alive on the modern web — fast, free, and accessible to
          everyone, on any device. We're a small team of card-game lovers who
          believe great games should be easy to start and fun to share. We're
          always working on new games and improvements, with more titles coming
          soon.
        </p>
      </ContentCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="panel p-5 flex gap-4 items-start"
          >
            <div className="w-10 h-10 shrink-0 rounded-xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center">
              <f.icon className="w-5 h-5 text-gold-300" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{f.title}</h3>
              <p className="text-sm text-white/60 mt-1 leading-relaxed">
                {f.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      <ContentCard className="text-center">
        <h2 className="font-display text-xl text-white mb-2">
          Ready to play?
        </h2>
        <p className="text-white/60 text-sm mb-5">
          Pick a table and start a game in seconds.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/" className="btn-primary">
            <Gamepad2 className="w-4 h-4" /> Browse games
          </Link>
          <Link to="/contact" className="btn-ghost">
            Contact us
          </Link>
        </div>
      </ContentCard>
    </PageLayout>
  );
}
