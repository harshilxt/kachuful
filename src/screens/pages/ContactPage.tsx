import { useState, type FormEvent } from "react";
import { Mail, Send, MessageSquare, Clock, CheckCircle2 } from "lucide-react";
import { PageLayout, ContentCard } from "../../components/PageLayout";
import { Seo } from "../../components/Seo";
import { SITE_NAME, CONTACT_EMAIL } from "../../lib/siteConfig";

export function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // No backend mailer is wired up, so we hand off to the user's email
    // client with a pre-filled message addressed to our support inbox.
    const subject = encodeURIComponent(`[${SITE_NAME}] Message from ${name || "a visitor"}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`
    );
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  const inputClass =
    "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold-500 transition placeholder:text-white/30";

  return (
    <PageLayout
      eyebrow="Get in touch"
      title="Contact us"
      subtitle={`Questions, feedback, bug reports or partnership ideas? We'd love to hear from you.`}
      width="wide"
    >
      <Seo
        title={`Contact ${SITE_NAME} – Get in Touch`}
        description={`Contact the ${SITE_NAME} team with questions, feedback or bug reports. We'd love to hear from you.`}
        path="/contact"
      />
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Info column */}
        <div className="md:col-span-2 space-y-4">
          <ContentCard className="!p-5">
            <div className="w-10 h-10 rounded-xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center mb-3">
              <Mail className="w-5 h-5 text-gold-300" />
            </div>
            <h3 className="font-semibold text-white">Email us</h3>
            <p className="text-sm text-white/60 mt-1 mb-2">
              Reach us directly at:
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-sm font-semibold text-gold-300 underline underline-offset-2 hover:text-gold-200 break-all"
            >
              {CONTACT_EMAIL}
            </a>
          </ContentCard>

          <ContentCard className="!p-5">
            <div className="w-10 h-10 rounded-xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5 text-gold-300" />
            </div>
            <h3 className="font-semibold text-white">Response time</h3>
            <p className="text-sm text-white/60 mt-1">
              We're a small team and read every message. We usually reply within
              2–3 business days.
            </p>
          </ContentCard>
        </div>

        {/* Form column */}
        <div className="md:col-span-3">
          <ContentCard>
            <h2 className="font-display text-xl text-white mb-1 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gold-400" /> Send a message
            </h2>
            <p className="text-sm text-white/55 mb-5">
              Fill in the form below and your email app will open with the
              message ready to send.
            </p>

            {sent && (
              <div className="mb-5 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Your email app should have opened with your message. If it
                  didn't, email us directly at{" "}
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="underline underline-offset-2"
                  >
                    {CONTACT_EMAIL}
                  </a>
                  .
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs uppercase tracking-widest text-white/60">
                    Your name
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={60}
                    placeholder="Jane Doe"
                    className={`mt-1 ${inputClass}`}
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-widest text-white/60">
                    Your email
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className={`mt-1 ${inputClass}`}
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-white/60">
                  Message
                </span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={5}
                  maxLength={2000}
                  placeholder="How can we help?"
                  className={`mt-1 ${inputClass} resize-y`}
                />
              </label>
              <button type="submit" className="btn-primary w-full sm:w-auto">
                <Send className="w-4 h-4" /> Send message
              </button>
            </form>
          </ContentCard>
        </div>
      </div>
    </PageLayout>
  );
}
