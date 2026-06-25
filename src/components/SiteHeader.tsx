import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Gamepad2 } from "lucide-react";
import { useGameStore } from "../store/gameStore";
import { SITE_NAME } from "../lib/siteConfig";
import { cn } from "../lib/utils";
import { BrandMark } from "./BrandMark";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

/**
 * Single site-wide header used on every page (home + content pages) so the
 * top chrome stays consistent. Sticky, with a gold accent strip, brand,
 * primary nav, the player-name chip and a mobile menu.
 */
export function SiteHeader() {
  const { playerName, setPlayerName } = useGameStore();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <header className="sticky top-0 z-40">
      {/* gold accent strip */}
      <div className="h-[3px] bg-gradient-to-r from-gold-700 via-gold-400 to-gold-700" />

      <div className="border-b border-white/10 bg-felt-900/85 backdrop-blur-xl shadow-lg shadow-black/40">
        <div className="site-container h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <BrandMark
              size={40}
              className="shrink-0 shadow-lg shadow-black/30 rounded-[13px] group-hover:scale-105 group-hover:-rotate-3 transition"
            />
            <div className="leading-tight">
              <div className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-gold-400">
                {SITE_NAME}
              </div>
              <div className="text-[9px] uppercase tracking-[0.3em] text-white/45 mt-0.5 hidden sm:block">
                Online Card Games
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 ml-auto mr-2">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "relative px-4 py-2 text-sm font-semibold rounded-lg transition-colors",
                  isActive(n.to)
                    ? "text-gold-300"
                    : "text-white/65 hover:text-white hover:bg-white/5"
                )}
              >
                {n.label}
                {isActive(n.to) && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute left-3 right-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-gold-400 to-gold-600"
                  />
                )}
              </Link>
            ))}
            <Link to="/" className="btn-primary ml-2 !px-4 !py-2 text-sm">
              <Gamepad2 className="w-4 h-4" /> Play
            </Link>
          </nav>

          {/* Right side: player chip + mobile toggle */}
          <div className="flex items-center gap-2">
            <div className="panel flex items-center gap-2 px-2.5 py-1.5 !rounded-xl">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-felt-300 to-felt-600 flex items-center justify-center text-sm shrink-0">
                🧑‍🎓
              </div>
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={14}
                aria-label="Your name"
                placeholder="Your name"
                className="w-20 sm:w-24 bg-transparent text-sm font-semibold outline-none focus:text-gold-300 transition placeholder:text-white/30"
              />
            </div>

            <button
              onClick={() => setOpen((o) => !o)}
              aria-label="Toggle menu"
              className="md:hidden w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/80 hover:bg-white/10 transition"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {open && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="md:hidden overflow-hidden border-t border-white/10"
            >
              <div className="px-4 py-3 flex flex-col gap-1">
                {NAV.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors",
                      isActive(n.to)
                        ? "text-gold-300 bg-gold-500/10"
                        : "text-white/75 hover:bg-white/5"
                    )}
                  >
                    {n.label}
                  </Link>
                ))}
                <Link
                  to="/"
                  onClick={() => setOpen(false)}
                  className="btn-primary mt-1 justify-center text-sm"
                >
                  <Gamepad2 className="w-4 h-4" /> Play now
                </Link>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
