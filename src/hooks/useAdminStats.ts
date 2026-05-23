import { useEffect, useState } from "react";
import { api } from "@/api/client";

export type AdminStats = {
  totalUsers: number;
  activeUsers: number;
  pendingApprovals: number;
  newUsersThisWeek: number;
  topArtistsGlobal: { name: string; count: number }[];
  topGenresGlobal: { name: string; count: number }[];
  topCountriesGlobal: { name: string; count: number }[];
  dailyActiveUsers: { date: string; count: number }[];
};

const CACHE_KEY = "sw.adminStats";
const CACHE_MS = 60_000;

/** Stats globales admin avec cache court (60s) pour limiter les hits API. */
export function useAdminStats() {
  const [data, setData] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true); setError(null);
    try {
      const s = await api.adminStats() as AdminStats;
      setData(s);
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), s })); } catch {}
    } catch (e: any) {
      setError(e?.message || "Erreur réseau");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const { at, s } = JSON.parse(raw);
        if (Date.now() - at < CACHE_MS) { setData(s); setLoading(false); return; }
      }
    } catch {}
    refresh();
  }, []);

  return { data, error, loading, refresh };
}
