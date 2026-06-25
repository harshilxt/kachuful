import { HelpCircle, ListChecks } from "lucide-react";

export interface GameFaq {
  q: string;
  a: string;
}

export interface GameInfoContentProps {
  /** Display name, e.g. "Kachuful". */
  name: string;
  /** 1–2 paragraph intro describing the game (good for keywords). */
  intro: string[];
  /** Ordered "how to play" steps. */
  howTo: string[];
  /** Frequently asked questions. */
  faqs: GameFaq[];
}

/**
 * Crawlable, keyword-rich content shown below a game's play card. Gives each
 * /game/* route real text content so it can rank (a name field + buttons
 * alone is a "thin" page that won't). Pair with <Seo> + FAQ JSON-LD.
 */
export function GameInfoContent({
  name,
  intro,
  howTo,
  faqs,
}: GameInfoContentProps) {
  return (
    <section className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pb-20 -mt-2">
      <div className="border-t border-white/10 pt-10">
        {/* Intro */}
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-4">
          About {name}
        </h2>
        <div className="space-y-3 text-[15px] leading-7 text-white/70">
          {intro.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {/* How to play */}
        <h2 className="font-display text-xl sm:text-2xl font-bold text-white mt-10 mb-4 flex items-center gap-2.5">
          <ListChecks className="w-5 h-5 text-gold-400" /> How to play {name}
        </h2>
        <ol className="space-y-3">
          {howTo.map((step, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-7 text-white/70">
              <span className="shrink-0 w-6 h-6 rounded-full bg-gold-500/15 border border-gold-500/30 text-gold-300 text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        {/* FAQ */}
        <h2 className="font-display text-xl sm:text-2xl font-bold text-white mt-10 mb-4 flex items-center gap-2.5">
          <HelpCircle className="w-5 h-5 text-gold-400" /> Frequently asked questions
        </h2>
        <div className="space-y-5">
          {faqs.map((f, i) => (
            <div key={i}>
              <h3 className="font-semibold text-white">{f.q}</h3>
              <p className="text-[15px] leading-7 text-white/65 mt-1">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Build FAQPage JSON-LD from a list of FAQs (for rich results). */
export function faqJsonLd(faqs: GameFaq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
