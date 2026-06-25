import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { PageLayout } from "../../components/PageLayout";
import { Seo } from "../../components/Seo";
import { SITE_NAME, SITE_DOMAIN, CONTACT_EMAIL } from "../../lib/siteConfig";

const LAST_UPDATED = "June 25, 2026";

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-white/10 pt-8 mt-8 first:border-0 first:pt-0 first:mt-0">
      <h2 className="font-display text-xl sm:text-2xl font-bold text-white mb-3 flex items-center gap-3">
        <span className="inline-block w-1.5 h-6 rounded-full bg-gradient-to-b from-gold-300 to-gold-600" />
        {title}
      </h2>
      <div className="space-y-3 text-[15px] leading-7 text-white/70 max-w-4xl">
        {children}
      </div>
    </section>
  );
}

export function TermsPage() {
  return (
    <PageLayout
      eyebrow="Legal"
      title="Terms of Service"
      subtitle={`The rules for using ${SITE_NAME} (${SITE_DOMAIN}). Please read them carefully.`}
      width="wide"
    >
      <Seo
        title={`Terms of Service – ${SITE_NAME}`}
        description={`The terms and conditions for using ${SITE_NAME} (${SITE_DOMAIN}), the free online card games platform.`}
        path="/terms"
      />
      <div>
        <p className="text-xs uppercase tracking-wider text-white/40 mb-2">
          Last updated: {LAST_UPDATED}
        </p>

        <Section title="1. Acceptance of terms">
          <p>
            By accessing or using {SITE_NAME} at {SITE_DOMAIN} (the "Service"),
            you agree to be bound by these Terms of Service. If you do not agree
            with any part of these terms, please do not use the Service.
          </p>
        </Section>

        <Section title="2. Use of the Service">
          <p>
            {SITE_NAME} provides free online card and casual games for
            entertainment purposes only. You agree to use the Service only for
            lawful purposes and in a way that does not infringe the rights of, or
            restrict or inhibit the use and enjoyment of, the Service by anyone
            else.
          </p>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Cheat, exploit bugs, or use bots or automated tools to gain an unfair advantage.</li>
            <li>Harass, abuse, or harm other players, including through chat or display names.</li>
            <li>Attempt to disrupt, overload, hack, or reverse-engineer the Service.</li>
            <li>Use the Service to distribute spam, malware, or unlawful content.</li>
          </ul>
        </Section>

        <Section title="3. No gambling">
          <p>
            {SITE_NAME} is intended purely for entertainment. Our games do not
            involve real-money betting, wagering, or prizes of monetary value.
            Any in-game points, chips or scores have no real-world cash value and
            cannot be redeemed.
          </p>
        </Section>

        <Section title="4. Accounts and display names">
          <p>
            You may be asked to choose a display name to play. You are
            responsible for the name you choose and for your conduct while using
            the Service. We may remove names or restrict access where content is
            offensive, infringing, or otherwise inappropriate.
          </p>
        </Section>

        <Section title="5. Intellectual property">
          <p>
            The Service, including its design, code, graphics, and original
            content, is owned by {SITE_NAME} and protected by applicable laws.
            Game names such as classic card games are used to describe gameplay
            and remain the property of their respective owners. You may not copy,
            modify, or redistribute our content without permission.
          </p>
        </Section>

        <Section title="6. Advertising">
          <p>
            The Service may display third-party advertising, including ads served
            by Google AdSense. Your interactions with advertisers and any
            third-party websites are solely between you and that third party. See
            our{" "}
            <Link
              to="/privacy"
              className="text-gold-300 underline underline-offset-2 hover:text-gold-200"
            >
              Privacy Policy
            </Link>{" "}
            for details on advertising cookies.
          </p>
        </Section>

        <Section title="7. Disclaimer of warranties">
          <p>
            The Service is provided "as is" and "as available" without warranties
            of any kind, whether express or implied. We do not guarantee that the
            Service will be uninterrupted, error-free, or secure. Your use of the
            Service is at your own risk.
          </p>
        </Section>

        <Section title="8. Limitation of liability">
          <p>
            To the maximum extent permitted by law, {SITE_NAME} shall not be
            liable for any indirect, incidental, or consequential damages arising
            out of your use of, or inability to use, the Service.
          </p>
        </Section>

        <Section title="9. Changes to the Service and terms">
          <p>
            We may modify, suspend, or discontinue any part of the Service at any
            time. We may also update these Terms from time to time; the updated
            version will be posted on this page with a new "Last updated" date.
            Continued use of the Service after changes means you accept the
            revised Terms.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            If you have any questions about these Terms, please contact us at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-gold-300 underline underline-offset-2 hover:text-gold-200"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>
      </div>
    </PageLayout>
  );
}
