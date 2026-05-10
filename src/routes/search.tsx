import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { searchAll } from "@/data/music";
import SongTable from "@/components/SongTable";

export const Route = createFileRoute("/search")({
  validateSearch: z.object({ q: z.string().optional() }),
  head: () => ({ meta: [{ title: "Recherche · SOUNDWAVE" }] }),
  component: SearchPage,
});

function SearchPage() {
  const { q = "" } = Route.useSearch();
  const [tab, setTab] = useState<"all" | "artists" | "songs">("all");
  const results = useMemo(() => searchAll(q), [q]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 md:px-6 py-8">
      <h1 className="font-display text-4xl glow-green mb-1">Résultats</h1>
      <p className="font-mono text-sm text-muted-foreground mb-6">pour « {q} » — {results.artists.length} artistes · {results.songs.length} chansons</p>

      <div className="flex gap-2 mb-6">
        {(["all", "artists", "songs"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase border transition ${
              tab === t
                ? "bg-[color:var(--neon-green)] text-[color:var(--background)] border-[color:var(--neon-green)]"
                : "border-[color:var(--neon-green)]/30 hover:border-[color:var(--neon-green)]"
            }`}>
            {t === "all" ? "Tout" : t === "artists" ? "Artistes" : "Chansons"}
          </button>
        ))}
      </div>

      {(tab === "all" || tab === "artists") && results.artists.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-xl mb-3 glow-cyan">Artistes</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {results.artists.map((a, i) => (
              <Link key={a.slug} to="/artist/$slug" params={{ slug: a.slug }}
                className="group rounded-xl overflow-hidden glass hover:scale-[1.03] transition animate-rise"
                style={{ animationDelay: `${i * 40}ms` }}>
                <img src={a.image} alt={a.name} className="aspect-square object-cover" />
                <div className="p-2">
                  <p className="font-medium truncate">{a.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground truncate">{a.country} · {a.genres[0]}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(tab === "all" || tab === "songs") && results.songs.length > 0 && (
        <section>
          <h2 className="font-display text-xl mb-3 glow-pink">Chansons</h2>
          <SongTable songs={results.songs} showArtist />
        </section>
      )}

      {results.artists.length === 0 && results.songs.length === 0 && (
        <p className="text-muted-foreground text-center py-16 font-mono">// no signal</p>
      )}
    </div>
  );
}
