import { useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

interface PageLayoutProps {
  /** Big page heading, e.g. "Privacy Policy". */
  title: string;
  /** Short line under the heading. */
  subtitle?: string;
  /** Optional eyebrow label above the title. */
  eyebrow?: string;
  /** Max-width of the content column. Defaults to a comfortable wide column. */
  width?: "default" | "wide";
  children: ReactNode;
}

/**
 * Shared shell for content pages (About, Privacy, Terms, Contact).
 * Uses the same site-wide header and footer as the home page so the
 * top chrome never changes between pages.
 */
export function PageLayout({
  title,
  subtitle,
  eyebrow,
  width = "default",
  children,
}: PageLayoutProps) {
  // Content pages should always open scrolled to the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Wide pages (About/Contact) fill the responsive site width; text-heavy
  // legal pages stay in a comfortable reading column.
  const bodyClass =
    width === "wide"
      ? "site-container"
      : "w-full max-w-4xl mx-auto px-4 sm:px-6";

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Backdrop */}
      <div className="fixed inset-0 -z-10 table-felt" />
      <div className="fixed inset-0 -z-10 opacity-20 [background-image:radial-gradient(circle_at_15%_15%,rgba(230,193,119,.4),transparent_40%),radial-gradient(circle_at_85%_20%,rgba(91,156,125,.45),transparent_42%),radial-gradient(circle_at_50%_100%,rgba(244,114,182,.2),transparent_45%)]" />

      <SiteHeader />

      {/* Body */}
      <main className={`relative z-10 flex-1 ${bodyClass} py-10 sm:py-14`}>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8"
        >
          {eyebrow && (
            <div className="text-xs uppercase tracking-[0.3em] text-gold-400/80 mb-2">
              {eyebrow}
            </div>
          )}
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white/95">
            {title}
          </h1>
          {subtitle && (
            <p className="text-white/55 text-sm sm:text-base mt-2 leading-relaxed max-w-2xl">
              {subtitle}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
        >
          {children}
        </motion.div>
      </main>

      <SiteFooter />
    </div>
  );
}

/** Reusable card/panel for grouping content within a page. */
export function ContentCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`panel p-6 sm:p-8 ${className}`}>{children}</div>;
}
