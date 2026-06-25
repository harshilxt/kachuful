import { SITE_NAME, SITE_URL } from "../lib/siteConfig";

interface SeoProps {
  /** Full <title> text for the page. */
  title: string;
  /** Meta description (~150–160 chars ideal). */
  description: string;
  /** Route path, e.g. "/about" or "/game/uno". Used for the canonical URL. */
  path: string;
  /** Absolute or site-relative social share image. */
  image?: string;
  /** Set true to keep a page out of search results. */
  noIndex?: boolean;
  /** One or more JSON-LD structured-data objects. */
  jsonLd?: object | object[];
}

/**
 * Per-page SEO tags. React 19 automatically hoists <title>, <meta> and
 * <link> rendered anywhere in the tree into <head>, so no extra library
 * (react-helmet) is needed. Drop <Seo .../> at the top of any page.
 */
export function Seo({
  title,
  description,
  path,
  image = `${SITE_URL}/og-image.png`,
  noIndex,
  jsonLd,
}: SeoProps) {
  const url = `${SITE_URL}${path === "/" ? "/" : path}`;
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Structured data */}
      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
    </>
  );
}
