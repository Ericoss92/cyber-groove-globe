import { useEffect, useState } from "react";
import { api } from "@/api/client";
import { ARTISTS, allSongs } from "@/data/music";
import type { Song } from "@/lib/types";

export type RecentRow = {
  songId: string; title: string; artist: string; artistSlug: string;
  playedAt: string; durationSeconds: number; genre?: string;
};
export type TopArtistRow = {
  name: string; slug: string; country?: string;
  playCount: number; totalMinutes: number;
};

export type DiscoverData = {
  recent: Song[];
  topArtists: TopArtistRow[];
  suggestions: Song[];
};

/** Maps an API history row back to a full Song from the local catalog (if found). */
function rowToSong(r: RecentRow): Song | null {
  const local = allSongs().find(s => s.id === r.songId);
  if (local) return local;
  // Fallback minimal Song
  return {
    id: r.songId,
    title: r.title,
    duration: r.durationSeconds || 0,
    url: "",
    artistSlug: r.artistSlug,
    artistName: r.artist,
    genre: r.genre || "",
    cover: `https://picsum.photos/seed/${encodeURIComponent(r.songId)}/600/600`,
  };
}

/** Picks N random suggestion songs from the catalog, biased toward known artists. */
function pickSuggestions(n: number, preferGenres: Set<string>): Song[] {
  const pool = allSongs();
  if (pool.length === 0) return [];
  const scored = pool.map(s => ({ s, score: preferGenres.has(s.genre) ? 1 : 0 }));
  scored.sort((a, b) => b.score - a.score || Math.random() - 0.5);
  return scored.slice(0, n).map(x => x.s);
}

export function useDiscoverData(period: "day" | "week" | "month" | "year" | "all" = "week") {
  const [data, setData] = useState<DiscoverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const [historyRes, topRes] = await Promise.allSettled([
          api.history(10, 0) as Promise<RecentRow[]>,
          api.topArtists(period, 10) as Promise<TopArtistRow[]>,
        ]);
        const recentRows = historyRes.status === "fulfilled" ? historyRes.value : [];
        const topArtists = topRes.status === "fulfilled" ? topRes.value : [];

        const recent = recentRows.map(rowToSong).filter(Boolean) as Song[];
        const preferGenres = new Set(recent.map(s => s.genre).filter(Boolean));
        const exclude = new Set(recent.map(s => s.id));
        const suggestions = pickSuggestions(12, preferGenres).filter(s => !exclude.has(s.id)).slice(0, 10);

        if (!cancelled) setData({ recent, topArtists, suggestions });
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Erreur réseau");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [period]);

  return { data, loading, error, hasCatalog: ARTISTS.length > 0 };
}
