import { useCallback, useEffect, useState } from "react";
import { api } from "@/api/client";

export type Stats = {
  totalListeningTimeMinutes: number;
  totalSongsPlayed: number;
  favoriteArtist: string | null;
  favoriteGenre: string | null;
  favoriteCountry: string | null;
  topArtists: { name: string; count: number; country?: string }[];
  topGenres: { name: string; count: number }[];
  topCountries: { name: string; count: number }[];
  listeningByMonth: Record<string, number>;
};

/**
 * Stats utilisateur. Cache court (60s) au mount; `refresh()` invalide le cache
 * et refetch. Réagit aussi à l'évènement `sw:stats-dirty` émis par le player
 * après un flush d'écoute — pas besoin de logout/login.
 */
export function useStats() {
  const [data, setData] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try { sessionStorage.removeItem("sw.stats"); } catch {}
    try {
      const s = await api.getStats() as Stats;
      setData(s);
      try { sessionStorage.setItem("sw.stats", JSON.stringify({ at: Date.now(), s })); } catch {}
    } catch (e: any) {
      setError(e?.message || "Erreur réseau");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("sw.stats");
      if (raw) {
        const { at, s } = JSON.parse(raw);
        if (Date.now() - at < 60_000) { setData(s); setLoading(false); return; }
      }
    } catch { /* noop */ }
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onDirty = () => { refresh(); };
    window.addEventListener("sw:stats-dirty", onDirty);
    return () => window.removeEventListener("sw:stats-dirty", onDirty);
  }, [refresh]);

  return { data, error, loading, refresh };
}
