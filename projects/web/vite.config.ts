import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import { VitePWA } from "vite-plugin-pwa";

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
);

export default defineConfig({
  base: "/",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      // Generate icons / apple-touch-icon / maskable / favicon from one source SVG
      // and inject the <link> tags automatically.
      pwaAssets: { image: "public/pwa-icon.svg" },
      manifest: {
        name: "Jazz Scales Practice ∀",
        short_name: "Jazz Scales",
        description:
          "Practice jazz scales — see the notation and play it back, online or off.",
        theme_color: "#16181d",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        scope: "/",
        categories: ["music", "education"],
      },
      workbox: {
        // Precache the app shell (UI + notation + bundled fonts) so it works offline.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2,ttf,otf}"],
        // The SPA navigation fallback serves index.html for navigations that aren't
        // precached. The Marp slide deck is added to dist/slides *after* the Vite
        // build, so it isn't in the precache — without this denylist the SW would
        // hijack /slides/ and serve the app shell instead of the deck. Let those
        // navigations hit the network (Pages serves the real deck).
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/slides(\/|$)/],
        // Sounds stream from public CDNs (CORS-enabled). Cache each fetched sample
        // so anything played/downloaded works offline. The user manages this via
        // the Offline-sounds picker; no expiration so downloads persist until removed.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(gleitz\.github\.io|smpldsnds\.github\.io|goldst\.dev)\//,
            handler: "CacheFirst",
            options: {
              cacheName: "sound-samples",
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 4000 },
            },
          },
        ],
      },
    }),
  ],
});
