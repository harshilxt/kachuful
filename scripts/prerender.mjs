/**
 * Post-build pre-rendering.
 *
 * Runs the *real* built SPA in headless Chrome (Puppeteer), waits for React to
 * render each route, and writes the finished HTML to dist/<route>/index.html.
 * This is version-agnostic (works with any Vite/React version) because it
 * snapshots the running app rather than rendering components on Node.
 *
 * Failures are non-fatal: if Chrome can't launch, the build still succeeds and
 * the site ships as a normal SPA (just without pre-rendered HTML).
 */
import { preview } from "vite";
import puppeteer from "puppeteer";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, "..", "dist");

// Routes to pre-render (the public, indexable pages).
const ROUTES = [
  "/",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/game/kachuful",
  "/game/uno",
  "/game/blackjack",
  "/game/solitaire",
  "/game/mendikot",
];

if (process.env.PRERENDER === "false") {
  console.log("[prerender] skipped (PRERENDER=false)");
  process.exit(0);
}

async function run() {
  // Serve the freshly built dist/ with SPA fallback.
  const server = await preview({
    preview: { port: 4188, strictPort: false },
  });
  const base = server.resolvedUrls.local[0].replace(/\/$/, "");

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch (err) {
    console.warn(
      "[prerender] ⚠ Could not launch Chrome — skipping pre-render. " +
        "The site will still work as an SPA.\n  " +
        err.message
    );
    await server.close();
    process.exit(0);
  }

  // Phase 1: capture every route's HTML *before* writing anything, so the
  // served shell (dist/index.html) stays pristine for every navigation.
  const captured = [];
  for (const route of ROUTES) {
    const page = await browser.newPage();
    try {
      await page.goto(`${base}${route}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      // Wait for React to render real content (every page has an <h1>),
      // then give document metadata a moment to hoist into <head>.
      await page.waitForSelector("#root h1", { timeout: 20000 });
      await new Promise((r) => setTimeout(r, 400));

      const html = await page.evaluate(() => {
        // De-duplicate head tags, keeping the last (React-managed) of each —
        // the static shell tags are parsed first, React appends after.
        const head = document.head;
        // document.title always reflects React's current per-page title.
        // Replace every <title> with a single element holding that value.
        const desiredTitle = document.title;
        head.querySelectorAll("title").forEach((t) => t.remove());
        const titleEl = document.createElement("title");
        titleEl.textContent = desiredTitle;
        head.appendChild(titleEl);
        const keepLast = (selector, keyOf) => {
          const last = new Map();
          head.querySelectorAll(selector).forEach((el) => last.set(keyOf(el), el));
          head.querySelectorAll(selector).forEach((el) => {
            if (last.get(keyOf(el)) !== el) el.remove();
          });
        };
        keepLast('meta[name="description"]', () => "description");
        keepLast('link[rel="canonical"]', () => "canonical");
        keepLast("meta[property^='og:']", (el) => el.getAttribute("property"));
        keepLast("meta[name^='twitter:']", (el) => el.getAttribute("name"));
        return "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
      });

      captured.push({ route, html });
      console.log(`[prerender] ✓ ${route}`);
    } catch (err) {
      console.warn(`[prerender] ✗ ${route} — ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  await server.close();

  // Phase 2: write all snapshots to disk.
  for (const { route, html } of captured) {
    const outDir = route === "/" ? distDir : join(distDir, route);
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, "index.html"), html, "utf8");
  }

  console.log(
    `[prerender] done — ${captured.length}/${ROUTES.length} routes pre-rendered`
  );
}

run().catch((err) => {
  console.warn("[prerender] ⚠ unexpected error, skipping:", err.message);
  process.exit(0);
});
