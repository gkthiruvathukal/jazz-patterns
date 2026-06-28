// Manage which instrument sounds are stored for offline use. The service worker
// (see vite.config.ts) caches every sound-CDN response into the "sound-samples"
// cache. Here we trigger downloads (by loading the instrument so smplr fetches
// it → the SW caches it), and query / remove / size cached entries by matching
// their CDN URLs — format-agnostic, so it works whether the browser fetched ogg,
// mp3, or m4a.
import { loadInstrument, type InstrumentKind } from "./player";

const SOUND_CACHE = "sound-samples";

/** Does this cached URL belong to the given instrument's samples? */
function matcherFor(id: string, kind: InstrumentKind): (url: string) => boolean {
  if (kind === "splendid") return (u) => u.includes("/sfzinstruments-splendid-grand-piano/");
  return (u) => u.includes(`/MusyngKite/${id}-`); // gleitz "<name>-ogg.js" / "<name>-mp3.js"
}

async function openCache(): Promise<Cache | null> {
  if (!("caches" in window)) return null;
  try {
    return await caches.open(SOUND_CACHE);
  } catch {
    return null;
  }
}

/** Is this instrument's audio already cached for offline play? */
export async function isCached(id: string, kind: InstrumentKind): Promise<boolean> {
  const cache = await openCache();
  if (!cache) return false;
  const match = matcherFor(id, kind);
  return (await cache.keys()).some((req) => match(req.url));
}

/** Download (or re-fetch) the instrument so its samples are cached for offline. */
export async function download(id: string, kind: InstrumentKind): Promise<void> {
  await loadInstrument(id, kind); // network fetch → service worker caches the responses
}

/** Remove the instrument's cached samples (frees offline storage). */
export async function remove(id: string, kind: InstrumentKind): Promise<void> {
  const cache = await openCache();
  if (!cache) return;
  const match = matcherFor(id, kind);
  for (const req of await cache.keys()) {
    if (match(req.url)) await cache.delete(req);
  }
}

/** Total offline storage the app is using, in bytes (Storage API; 0 if unsupported). */
export async function usageBytes(): Promise<number> {
  if (!navigator.storage?.estimate) return 0;
  const { usage } = await navigator.storage.estimate();
  return usage ?? 0;
}

/** Rough download size (MB) for the UI, before anything is fetched. */
export function estimatedMB(kind: InstrumentKind): number {
  return kind === "splendid" ? 15 : 3;
}
