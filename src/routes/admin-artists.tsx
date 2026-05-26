import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UserCog, Search, Save } from "lucide-react";
import { api, cachedUser } from "@/api/client";
import { ARTISTS } from "@/data/music";

export const Route = createFileRoute("/admin-artists")({
  head: () => ({ meta: [{ title: "Admin · Artistes — SOUNDWAVE" }] }),
  component: AdminArtistsPage,
});

function AdminArtistsPage() {
  const u = cachedUser.get();
  if (!u?.admin) return <Navigate to="/" />;
  const [q, setQ] = useState("");
  const [meta, setMeta] = useState<Record<string, any>>({});

  useEffect(() => {
    api.adminListArtists().then((rows) => {
      const m: Record<string, any> = {};
      (rows || []).forEach((r: any) => { m[r.slug] = r; });
      setMeta(m);
    }).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return ARTISTS;
    return ARTISTS.filter(a =>
      a.name.toLowerCase().includes(needle) ||
      a.slug.toLowerCase().includes(needle) ||
      (a.country || "").toLowerCase().includes(needle));
  }, [q]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-8 space-y-6">
      <header className="flex items-center gap-3">
        <UserCog className="size-7 text-[color:var(--neon-cyan)]" />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--neon-cyan)]">// ADMIN · ARTISTS</p>
          <h1 className="font-display text-3xl md:text-4xl glow-green">Édition des artistes</h1>
          <p className="text-xs text-muted-foreground mt-1">{ARTISTS.length} artistes · les modifications sont persistées en base.</p>
        </div>
      </header>

      <div className="glass rounded-xl p-3 flex items-center gap-2">
        <Search className="size-4 text-[color:var(--neon-cyan)]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un artiste…"
          className="flex-1 bg-transparent outline-none text-sm font-mono" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.slice(0, 60).map((a) => {
          const m = meta[a.slug];
          return (
            <Link key={a.slug} to="/admin-artists/$slug" params={{ slug: a.slug }}
              className="glass rounded-xl p-3 flex items-center gap-3 hover:scale-[1.02] transition">
              <img src={m?.imageUrl || a.image} alt="" loading="lazy"
                className="size-14 rounded-lg object-cover shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-display truncate">{a.name}</p>
                <p className="text-[11px] font-mono text-muted-foreground truncate">
                  {a.country} · {m?.mainGenre || a.genres[0] || "—"}
                </p>
              </div>
              {m ? (
                <span className="text-[10px] font-mono text-[color:var(--neon-green)]">●</span>
              ) : (
                <Save className="size-3.5 text-muted-foreground/50" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
