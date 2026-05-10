import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import Globe from "@/components/Globe";
import { ARTISTS, COUNTRIES, artistsByCountry, countriesWithArtists } from "@/data/music";
import type { Country } from "@/lib/types";
import { usePlayer } from "@/lib/player";
import { Play } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SOUNDWAVE — Explorez la musique du monde" },
      { name: "description", content: "Globe 3D interactif. Découvrez des artistes par pays, créez des playlists, plongez dans une expérience cyberpunk." },
    ],
  }),
  component: Index,
});

function Index() {
  const [selected, setSelected] = useState<Country>(COUNTRIES.find(c => c.name === "France")!);
  const navigate = useNavigate();
  const p = usePlayer();
  const countriesAll = useMemo(() => countriesWithArtists(), []);
  const topArtists = useMemo(() => artistsByCountry(selected.name).slice(0, 5), [selected]);
  const featured = useMemo(() => [...ARTISTS].sort((a, b) => b.followers - a.followers).slice(0, 8), []);

  return (
    <div className="relative">
      {/* HERO with globe */}
      <section className="relative grid-bg">
        <div className="mx-auto max-w-[1600px] px-4 md:px-6 py-6 md:py-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="relative rounded-2xl glass overflow-hidden h-[60vh] min-h-[420px] box-glow-green">
              <div className="absolute top-4 left-4 z-10">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--neon-cyan)]">// LIVE NETWORK</p>
                <h1 className="font-display text-3xl md:text-5xl mt-1 glow-green">Le globe musical</h1>
                <p className="text-sm text-muted-foreground max-w-md mt-1">{COUNTRIES.length} pays · {ARTISTS.length} artistes connectés</p>
              </div>
              <Globe
                selected={selected.name}
                onSelect={(c) => setSelected(c)}
                onOpen={(c) => navigate({ to: "/country/$country", params: { country: c.name } })}
              />
            </div>

            {/* Sidebar */}
            <aside className="space-y-4">
              <div className="glass rounded-2xl p-5 box-glow-pink animate-rise">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--neon-pink)]">Pays sélectionné</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-4xl">{selected.flag}</span>
                  <div>
                    <h2 className="font-display text-2xl glow-pink">{selected.name}</h2>
                    <p className="text-xs text-muted-foreground font-mono">
                      {artistsByCountry(selected.name).length} artistes · {selected.continent}
                    </p>
                  </div>
                </div>
                <Link to="/country/$country" params={{ country: selected.name }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[color:var(--neon-pink)] text-[color:var(--background)] text-sm font-medium hover:scale-105 transition">
                  Voir tous les artistes →
                </Link>
              </div>

              <div className="glass rounded-2xl p-5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--neon-green)] mb-3">Top artistes</p>
                <ul className="space-y-1">
                  {topArtists.length === 0 && <li className="text-sm text-muted-foreground">Aucun artiste pour ce pays.</li>}
                  {topArtists.map((a, i) => (
                    <li key={a.slug} className="animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
                      <Link to="/artist/$slug" params={{ slug: a.slug }}
                        className="flex items-center gap-3 px-2 py-2 rounded hover:bg-[color:var(--neon-green)]/10 hover-glitch">
                        <img src={a.image} alt="" loading="lazy" className="size-10 rounded object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{a.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{a.genres.join(" · ")}</p>
                        </div>
                        <button
                          onClick={(e) => { e.preventDefault(); p.playQueue(a.songs, 0); }}
                          aria-label={`Lire ${a.name}`}
                          className="p-2 rounded-full bg-[color:var(--neon-green)]/20 hover:bg-[color:var(--neon-green)] hover:text-[color:var(--background)] transition">
                          <Play className="size-3.5" />
                        </button>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="glass rounded-2xl p-5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--neon-cyan)] mb-3">Pays connectés</p>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-auto">
                  {countriesAll.map(c => (
                    <button key={c.code} onClick={() => setSelected(c)}
                      className={`px-2.5 py-1 rounded-full text-xs font-mono border transition ${
                        selected.name === c.name
                          ? "bg-[color:var(--neon-cyan)] text-[color:var(--background)] border-[color:var(--neon-cyan)]"
                          : "border-[color:var(--neon-cyan)]/30 hover:border-[color:var(--neon-cyan)] hover:text-[color:var(--neon-cyan)]"
                      }`}>
                      {c.flag} {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-[1600px] px-4 md:px-6 py-10">
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--neon-green)]">// TRENDING NOW</p>
            <h2 className="font-display text-3xl mt-1 glow-green">Artistes en vedette</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {featured.map((a, i) => (
            <Link key={a.slug} to="/artist/$slug" params={{ slug: a.slug }}
              className="group relative rounded-xl overflow-hidden glass animate-rise hover:scale-[1.03] transition box-glow-cyan"
              style={{ animationDelay: `${i * 50}ms` }}>
              <div className="aspect-square overflow-hidden">
                <img src={a.image} alt={a.name} loading="lazy" className="size-full object-cover group-hover:scale-110 transition duration-500" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--background)] via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="font-display font-bold truncate group-hover:glow-green">{a.name}</p>
                <p className="text-[10px] font-mono text-muted-foreground truncate">{a.country} · {a.genres[0]}</p>
              </div>
              <button
                onClick={(e) => { e.preventDefault(); p.playQueue(a.songs, 0); }}
                aria-label={`Lire ${a.name}`}
                className="absolute top-3 right-3 size-10 rounded-full bg-[color:var(--neon-green)] text-[color:var(--background)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition box-glow-green">
                <Play className="size-4 ml-0.5" />
              </button>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
