import { Link } from "react-router-dom";
import { Heart, Gamepad2 } from "lucide-react";
import { SITE_NAME, SITE_LAUNCH_YEAR } from "../lib/siteConfig";
import { BrandMark } from "./BrandMark";

const FOOTER_LINKS = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Service" },
];

const GAME_LINKS = [
  { to: "/game/kachuful", label: "Kachuful" },
  { to: "/game/blackjack", label: "Blackjack" },
  { to: "/game/uno", label: "UNO" },
  { to: "/game/solitaire", label: "Solitaire" },
];

/**
 * Site-wide footer. AdSense reviewers expect Privacy, Terms, About and
 * Contact links to be reachable from the footer, so they live here.
 */
export function SiteFooter() {
  const currentYear = new Date().getFullYear();
  const yearLabel =
    SITE_LAUNCH_YEAR === currentYear
      ? `${currentYear}`
      : `${SITE_LAUNCH_YEAR}–${currentYear}`;

  return (
    <footer className="relative z-10 mt-16 border-t border-white/10 bg-felt-900/80 backdrop-blur-md">
      {/* gold accent strip */}
      <div className="h-[3px] bg-gradient-to-r from-gold-700 via-gold-400 to-gold-700" />

      <div className="site-container py-12">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8 md:gap-6">
          {/* Brand */}
          <div className="col-span-2 md:col-span-5">
            <div className="flex items-center gap-2.5">
              <BrandMark size={40} className="rounded-[13px] shadow-lg shadow-black/30" />
              <div className="font-display text-xl font-extrabold tracking-tight text-gold-400">
                {SITE_NAME}
              </div>
            </div>
            <p className="text-sm text-white/55 mt-4 leading-relaxed max-w-sm">
              A free online gaming platform for classic multiplayer card games.
              Play Kachuful, UNO and Blackjack with friends or against AI — right
              in your browser, no download needed.
            </p>
            <Link
              to="/"
              className="btn-primary mt-5 !px-4 !py-2 text-sm inline-flex"
            >
              <Gamepad2 className="w-4 h-4" /> Start playing
            </Link>
          </div>

          <div className="md:col-span-1 hidden md:block" />

          {/* Pages */}
          <div className="md:col-span-3">
            <h3 className="text-xs uppercase tracking-[0.25em] text-gold-400/80 mb-4">
              Pages
            </h3>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-sm text-white/60 hover:text-gold-300 hover:translate-x-0.5 inline-block transition-all"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Games */}
          <div className="md:col-span-3">
            <h3 className="text-xs uppercase tracking-[0.25em] text-gold-400/80 mb-4">
              Games
            </h3>
            <ul className="space-y-2.5">
              {GAME_LINKS.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-sm text-white/60 hover:text-gold-300 hover:translate-x-0.5 inline-block transition-all"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li className="text-sm text-white/30">More coming soon…</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/40">
            © {yearLabel} {SITE_NAME}. All rights reserved.
          </p>
          <p className="text-xs text-white/40 flex items-center gap-1.5">
            Made with <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />{" "}
            for card-game lovers
          </p>
        </div>
      </div>
    </footer>
  );
}
