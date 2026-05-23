import { useEffect, useState } from "react";
import { api } from "@/api/client";

export type Profile = {
  id: number;
  username: string;
  email?: string | null;
  authorized: boolean;
  is_admin: boolean;
  created_at: string;
  theme?: string;
  volume?: number;
  crossfade_duration?: number;
  gapless_playback?: boolean;
  language?: string;
  neon_intensity?: number;
  low_perf_mode?: boolean;
};

export function useProfile() {
  const [data, setData] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true); setError(null);
    try { setData(await api.getProfile() as Profile); }
    catch (e: any) { setError(e?.message || "Erreur réseau"); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);
  return { data, error, loading, refresh, setData };
}
