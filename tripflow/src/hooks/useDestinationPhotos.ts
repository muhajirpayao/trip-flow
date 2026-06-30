import { useEffect, useState } from 'react';

interface DestinationPhotos {
  hero: string | null;
  gallery: string[];
  loading: boolean;
}

const cache = new Map<string, { hero: string | null; gallery: string[] }>();

function primaryQuery(destination: string) {
  // "Hong Kong, China" -> "Hong Kong"
  return destination.split(',')[0].trim();
}

async function resolveTitle(query: string): Promise<string | null> {
  if (!query) return null;
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
      query
    )}&limit=1&namespace=0&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[1]?.[0] ?? null;
  } catch {
    return null;
  }
}

async function fetchHero(title: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.originalimage?.source ?? data?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

async function fetchGallery(title: string, exclude: string | null): Promise<string[]> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(title)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items = (data?.items ?? []) as any[];
    const urls = items
      .filter((i) => i.type === 'image' && Array.isArray(i.srcset) && i.srcset.length)
      .map((i) => {
        const best = i.srcset[i.srcset.length - 1]?.src ?? '';
        return best.startsWith('http') ? best : `https:${best}`;
      })
      .filter((u) => /\.(jpe?g|png)$/i.test(u) && u !== exclude);
    return Array.from(new Set(urls)).slice(0, 4);
  } catch {
    return [];
  }
}

export function useDestinationPhotos(destination: string): DestinationPhotos {
  const [hero, setHero] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!destination) {
      setHero(null);
      setGallery([]);
      setLoading(false);
      return;
    }

    if (cache.has(destination)) {
      const c = cache.get(destination)!;
      setHero(c.hero);
      setGallery(c.gallery);
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);

    (async () => {
      const title =
        (await resolveTitle(primaryQuery(destination))) ?? (await resolveTitle(destination));

      if (!title) {
        if (alive) {
          cache.set(destination, { hero: null, gallery: [] });
          setHero(null);
          setGallery([]);
          setLoading(false);
        }
        return;
      }

      const heroUrl = await fetchHero(title);
      const galleryUrls = await fetchGallery(title, heroUrl);

      if (alive) {
        cache.set(destination, { hero: heroUrl, gallery: galleryUrls });
        setHero(heroUrl);
        setGallery(galleryUrls);
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [destination]);

  return { hero, gallery, loading };
}