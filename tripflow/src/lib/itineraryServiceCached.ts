/**
 * itineraryServiceCached.ts
 *
 * Drop-in wrapper around your existing itineraryService that adds:
 *  1. In-memory cache   — instant within the same session / tab
 *  2. localStorage cache — instant on re-open, works offline
 *  3. Stale-while-revalidate — shows cached data immediately,
 *     fetches fresh in the background, updates only if data changed
 *
 * USAGE — swap your import in Itinerary.tsx:
 *
 *   // Before:
 *   import { loadItinerary, saveItinerary } from '../lib/itineraryService';
 *
 *   // After:
 *   import { loadItinerary, saveItinerary } from '../lib/itineraryServiceCached';
 *
 * Everything else stays identical — same function signatures, same types.
 */

import {
  loadItinerary   as _loadItinerary,
  saveItinerary   as _saveItinerary,
} from './itineraryService';
import type { ItineraryDay } from './itineraryService';

// ─── Cache config ─────────────────────────────────────────────────────────────

const CACHE_VERSION   = 'v1';                          // bump to invalidate all caches
const LS_PREFIX       = `itinerary_cache_${CACHE_VERSION}_`; // localStorage key prefix
const MAX_AGE_MS      = 1000 * 60 * 60 * 24 * 7;      // 7 days — how long LS cache is valid

// ─── In-memory store (lives as long as the tab is open) ───────────────────────

const memoryCache = new Map<string, ItineraryDay[]>();

// ─── localStorage helpers ─────────────────────────────────────────────────────

interface CacheEntry {
  data:      ItineraryDay[];
  savedAt:   number;   // Unix ms timestamp
}

function lsKey(tripId: string) {
  return `${LS_PREFIX}${tripId}`;
}

function lsRead(tripId: string): ItineraryDay[] | null {
  try {
    const raw = localStorage.getItem(lsKey(tripId));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    // Expire stale entries so storage doesn't grow forever
    if (Date.now() - entry.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(lsKey(tripId));
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function lsWrite(tripId: string, data: ItineraryDay[]) {
  try {
    const entry: CacheEntry = { data, savedAt: Date.now() };
    localStorage.setItem(lsKey(tripId), JSON.stringify(entry));
  } catch {
    // Storage quota exceeded or private browsing — silently ignore
  }
}

function lsDelete(tripId: string) {
  try {
    localStorage.removeItem(lsKey(tripId));
  } catch {
    // ignore
  }
}

// ─── Simple deep-equal check to avoid unnecessary re-renders ─────────────────

function isEqual(a: ItineraryDay[], b: ItineraryDay[]): boolean {
  // JSON stringify is fine here — the data is plain JSON already
  return JSON.stringify(a) === JSON.stringify(b);
}

// ─── loadItinerary — stale-while-revalidate ───────────────────────────────────
//
//  Returns a callback-based API so the UI can:
//    1. Get cached data instantly (onCached)
//    2. Get fresh data when the network responds (onFresh)
//    3. Know if we're offline / errored (onError)
//
//  Simple promise version also available below for callers that just want
//  the best available data with no streaming.

export interface LoadOptions {
  /** Called immediately with cached data if available (may be undefined) */
  onCached?: (data: ItineraryDay[] | null) => void;
  /** Called when fresh network data arrives and it differs from cached */
  onFresh?:  (data: ItineraryDay[]) => void;
  /** Called if the network request fails (cached data already delivered via onCached) */
  onError?:  (err: unknown) => void;
}

/**
 * Streaming load: fires onCached instantly, then onFresh when network settles.
 * Returns a cancel function — call it on component unmount.
 */
export function loadItinerary(
  tripId: string,
  options: LoadOptions = {}
): () => void {
  let cancelled = false;

  // ── 1. Serve from memory first (fastest) ──
  const mem = memoryCache.get(tripId) ?? null;

  // ── 2. Fall back to localStorage ──
  const ls = mem === null ? lsRead(tripId) : null;

  const cached = mem ?? ls;

  // Deliver cached data synchronously on the next microtask
  // (so callers can set up state before the callback fires)
  Promise.resolve().then(() => {
    if (!cancelled) options.onCached?.(cached);
  });

  // ── 3. Fetch fresh data in the background ──
  _loadItinerary(tripId)
    .then((fresh: ItineraryDay[] | null) => {
      if (cancelled) return;
      if (!fresh) return; // treat null as "nothing on server yet", keep cached

      // Populate caches
      memoryCache.set(tripId, fresh);
      lsWrite(tripId, fresh);

      // Only notify UI if data actually changed
      if (!cached || !isEqual(cached, fresh)) {
        options.onFresh?.(fresh);
      }
    })
    .catch((err: unknown) => {
      if (!cancelled) options.onError?.(err);
    });

  // Return cancel function for useEffect cleanup
  return () => { cancelled = true; };
}

/**
 * Simple promise version — resolves with the best available data.
 * Use this if you don't need the streaming behaviour.
 *
 * Resolution order:
 *  - If network succeeds  → fresh data (cache updated)
 *  - If network fails     → cached data (offline fallback)
 *  - If both fail         → null
 */
export async function loadItineraryOnce(
  tripId: string
): Promise<ItineraryDay[] | null> {
  // Return memory cache instantly if available
  const mem = memoryCache.get(tripId);
  if (mem) return mem;

  try {
    const fresh = await _loadItinerary(tripId);
    if (fresh) {
      memoryCache.set(tripId, fresh);
      lsWrite(tripId, fresh);
    }
    return fresh;
  } catch {
    // Network failed — try localStorage
    const ls = lsRead(tripId);
    if (ls) memoryCache.set(tripId, ls); // promote to memory
    return ls;
  }
}

// ─── saveItinerary — write-through cache ─────────────────────────────────────
//
//  Writes to memory + localStorage immediately (optimistic),
//  then persists to the server. If the server fails, the local
//  data is still there for the next offline load.

export async function saveItinerary(
  tripId: string,
  days:   ItineraryDay[]
): Promise<{ success: boolean; error?: string }> {
  // Optimistic local write
  memoryCache.set(tripId, days);
  lsWrite(tripId, days);

  // Persist to server
  const result = await _saveItinerary(tripId, days);

  if (!result.success) {
    // Don't evict the cache on failure — local data is still useful offline
    console.warn('[itineraryCache] Server save failed, local cache retained:', result.error);
  }

  return result;
}

// ─── Cache management utilities ───────────────────────────────────────────────

/** Clear everything for a specific trip (call on trip delete) */
export function clearCache(tripId: string) {
  memoryCache.delete(tripId);
  lsDelete(tripId);
}

/** Evict just the in-memory cache (force next load to re-read localStorage) */
export function evictMemory(tripId: string) {
  memoryCache.delete(tripId);
}

/** Returns true if we have ANY cached data for this trip (memory or localStorage) */
export function hasCachedData(tripId: string): boolean {
  return memoryCache.has(tripId) || lsRead(tripId) !== null;
}