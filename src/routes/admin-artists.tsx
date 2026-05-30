import { createFileRoute, Link, Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UserCog, Search, Pencil, CheckCircle2, AlertCircle } from "lucide-react";
import { api, cachedUser } from "@/api/client";
import { ARTISTS } from "@/data/music";

export const Route = createFileRoute("/admin-artists")({
  head: () => ({ meta: [{ title: "Admin · Artistes — SOUNDWAVE" }] }),
  component: AdminArtistsPage,
});

function AdminArtistsPage() {
  // Hooks FIRST — never after a conditional return.
  const location = useLocation();
  const [q, setQ] = useState("");
  const [meta, setMeta] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const u = cachedUser.get();
  const isAdmin = !!u?.admin;
  const isListRoute = location.pathname.replace(/\/+$/, "") === "/admin-artists";

  useEffect(() => {
    if (!isAdmin || !isListRoute) return;
    let active = true;
    setLoading(true);
    api.adminListArtists()
      .then((rows) => {
        if (!active) return;
        const m: Record<string, any> = {};
        (rows || []).forEach((r: any) => { m[r.slug] = r; });
        setMeta(m);
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isAdmin, isListRoute]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return ARTISTS;
    return ARTISTS.filter(a =>
      a.name.toLowerCase().includes(needle) ||
      a.slug.toLowerCase().includes(needle) ||
      (a.country || "").toLowerCase().includes(needle));
  }, [q]);

  if (!isAdmin) return <Navigate to="/" />;
  if (!isListRoute) return <Outlet />;

  const completeCount = Object.values(meta).filter((m: any) => isComplete(m)).length;

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-8 space-y-6">
      <header className="flex items-center gap-3 flex-wrap">
        <UserCog className="size-7 text-[color:var(--neon-cyan)] shrink-0" />
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--neon-cyan)]">// ADMIN · ARTISTS</p>
          <h1 className="font-display text-3xl md:text-4xl glow-green">Édition des artistes</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {ARTISTS.length} artistes · {completeCount} avec métadonnées complètes · persistance MariaDB
          </p>
        </div>
      </header>

      <div className="glass rounded-xl p-3 flex items-center gap-2">
        <Search className="size-4 text-[color:var(--neon-cyan)] shrink-0" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un artiste…"
          className="flex-1 bg-transparent outline-none text-sm font-mono min-w-0" />
      </div>

      {loading ? (
        <p className="text-xs font-mono text-muted-foreground">// chargement…</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((a) => {
            const m = meta[a.slug];
            const complete = isComplete(m);
            return (
              <div key={a.slug} className="glass rounded-xl p-3 flex items-center gap-3 group hover:box-glow-cyan transition">
                <img
                  src={m?.imageUrl || a.image}
                  alt=""
                  loading="lazy"
                  className="size-14 rounded-lg object-cover shrink-0"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = a.image; }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-display truncate">{a.name}</p>
                  <p className="text-[11px] font-mono text-muted-foreground truncate">
                    {m?.country || a.country} · {m?.mainGenre || a.genres[0] || "—"}
                  </p>
                  <div className="mt-1 flex items-center gap-1">
                    {complete ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[color:var(--neon-green)]">
                        <CheckCircle2 className="size-3" /> complètes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[color:var(--neon-pink)]/80">
                        <AlertCircle className="size-3" /> à compléter
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  to="/admin-artists/$slug" params={{ slug: a.slug }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[color:var(--neon-cyan)]/40 text-[color:var(--neon-cyan)] text-xs font-mono hover:bg-[color:var(--neon-cyan)]/10 transition shrink-0"
                >
                  <Pencil className="size-3" /> Modifier
                </Link>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-full text-xs font-mono text-muted-foreground">// aucun résultat</p>
          )}
        </div>
      )}
    </div>
  );
}

function isComplete(m: any): boolean {
  if (!m) return false;
  return !!(m.biography && m.mainGenre && m.imageUrl);
}
