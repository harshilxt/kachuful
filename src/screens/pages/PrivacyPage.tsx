import type { ReactNode } from "react";
import { PageLayout } from "../../components/PageLayout";
import { Seo } from "../../components/Seo";
import { SITE_NAME, SITE_DOMAIN, CONTACT_EMAIL } from "../../lib/siteConfig";

/** Last updated date for the policy. Update when you change the text. */
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

export function PrivacyPage() {
  return (
    <PageLayout
      eyebrow="Legal"
      title="Privacy Policy"
      subtitle={`How ${SITE_NAME} (${SITE_DOMAIN}) handles your data, cookies and advertising.`}
      width="wide"
    >
      <Seo
        title={`Privacy Policy – ${SITE_NAME}`}
        description={`Privacy Policy for ${SITE_NAME} (${SITE_DOMAIN}): how we use cookies, Google AdSense, advertising cookies and analytics, and how to opt out.`}
        path="/privacy"
      />
      <div>
        <p className="text-xs uppercase tracking-wider text-white/40 mb-2">
          Last updated: {LAST_UPDATED}
        </p>

        <Section title="Introduction">
          <p>
            This Privacy Policy explains how {SITE_NAME} ("we", "us" or "our"),
            available at {SITE_DOMAIN}, collects, uses and protects information
            when you use our website and games. By using {SITE_DOMAIN}, you
            agree to the practices described in this policy.
          </p>
        </Section>

        <Section title="Information we collect">
          <p>
            {SITE_NAME} is designed to let you play with minimal personal
            information. We may collect:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <b>Gameplay information</b> — such as the display name you choose
              and the rooms you create or join. This is used only to run the
              games.
            </li>
            <li>
              <b>Basic analytics data</b> — such as your browser type, device
              type, approximate region, pages visited and general usage
              statistics. This helps us understand how the site is used and
              improve it.
            </li>
            <li>
              <b>Cookies and similar technologies</b> — as described in the
              sections below.
            </li>
          </ul>
          <p>
            We do not require you to create an account, and we do not
            intentionally collect sensitive personal information.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            A cookie is a small text file stored on your device by your browser.
            {" "}
            {SITE_NAME} and our partners use cookies and similar technologies to
            keep the site working, remember your preferences, measure usage, and
            (where applicable) serve and personalise advertising.
          </p>
          <p>
            You can disable or delete cookies through your browser settings.
            Please note that some parts of the site may not function correctly
            if cookies are disabled.
          </p>
        </Section>

        <Section title="Advertising, Google AdSense & third-party vendors">
          <p>
            We may use third-party advertising companies, including{" "}
            <b>Google AdSense</b>, to serve ads when you visit {SITE_DOMAIN}.
            These companies and their partners use cookies and similar
            technologies to serve ads based on your prior visits to this and
            other websites.
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Third-party vendors, including Google, use cookies to serve ads
              based on a user's prior visits to our website or other websites.
            </li>
            <li>
              Google's use of advertising cookies — including the{" "}
              <b>DoubleClick cookie</b> (the Google advertising cookie) — enables
              it and its partners to serve ads to you based on your visit to our
              site and/or other sites on the Internet.
            </li>
            <li>
              Third-party vendors and ad networks may also serve ads on our
              site and may use cookies to measure ad performance and to deliver
              relevant advertising.
            </li>
          </ul>
        </Section>

        <Section title="How to opt out of personalised ads">
          <p>
            You may opt out of personalised advertising by visiting{" "}
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-300 underline underline-offset-2 hover:text-gold-200"
            >
              Google Ads Settings
            </a>
            . There you can manage how Google personalises the ads shown to you.
          </p>
          <p>
            You can also opt out of a third-party vendor's use of cookies for
            personalised advertising by visiting{" "}
            <a
              href="https://www.aboutads.info/choices/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-300 underline underline-offset-2 hover:text-gold-200"
            >
              www.aboutads.info
            </a>
            . If you have disabled personalised ads, you may still see
            non-personalised ads on our site.
          </p>
        </Section>

        <Section title="Analytics">
          <p>
            We may use analytics services to collect aggregated, non-identifying
            statistics about how visitors use {SITE_DOMAIN}. These services may
            set their own cookies. The information is used to understand traffic
            patterns and improve our games and content.
          </p>
        </Section>

        <Section title="Children's privacy">
          <p>
            {SITE_NAME} is intended for a general audience and is not directed at
            children under 13. We do not knowingly collect personal information
            from children under 13. If you believe a child has provided us with
            personal information, please contact us so we can remove it.
          </p>
        </Section>

        <Section title="Third-party links">
          <p>
            Our site may contain links to third-party websites or services. We
            are not responsible for the privacy practices of those sites and
            encourage you to review their privacy policies.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We may update this Privacy Policy from time to time. Any changes will
            be posted on this page with an updated "Last updated" date. We
            encourage you to review this page periodically.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            If you have any questions about this Privacy Policy, please contact
            us at{" "}
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
