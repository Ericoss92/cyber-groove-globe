import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import Globe from "@/components/Globe";
import { ARTISTS } from "@/data/music";
import { usePlayer } from "@/lib/player";
import { Play, Maximize2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SOUNDWAVE — Explorez la musique du monde" },
      {
        name: "description",
        content:
          "Globe 3D interactif. Découvrez des artistes par pays, créez des playlists, plongez dans une expérience cyberpunk.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const p = usePlayer();
  const [globeExpanded, setGlobeExpanded] = useState(false);
  const featured = useMemo(
    () => [...ARTISTS].sort((a, b) => b.followers - a.followers),
    [],
  );

  return (
    <div className="relative">
      {/* Layout 2 colonnes desktop, stack mobile */}
      <section className="mx-auto max-w-[1600px] px-4 md:px-6 py-6 md:py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
          {/* === FEATURED ARTISTS === */}
          <div className="min-w-0">
            <div className="flex items-end justify-between mb-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--neon-green)]">
                  // TRENDING NOW
                </p>
                <h1 className="font-display text-3xl md:text-5xl mt-1 glow-green">
                  Artistes en vedette
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {ARTISTS.length} artistes connectés au réseau musical
                </p>
              </div>
            </div>

            {/* Desktop : grille scrollable verticale - Mobile : stack vertical */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:max-h-[78vh] lg:overflow-y-auto lg:pr-2 lg:snap-y lg:snap-mandatory">
              {featured.map((a, i) => (
                <Link
                  key={a.slug}
                  to="/artist/$slug"
                  params={{ slug: a.slug }}
                  className="group relative rounded-xl overflow-hidden glass animate-rise hover:scale-[1.03] transition box-glow-cyan lg:snap-start"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={a.image}
                      alt={a.name}
                      loading="lazy"
                      className="size-full object-cover group-hover:scale-110 transition duration-500"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--background)] via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="font-display font-bold truncate group-hover:glow-green">
                      {a.name}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground truncate">
                      {a.country} · {a.genres[0]}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      p.playQueue(a.songs, 0);
                    }}
                    aria-label={`Lire ${a.name}`}
                    className="absolute top-3 right-3 size-10 rounded-full bg-[color:var(--neon-green)] text-[color:var(--background)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition box-glow-green"
                  >
                    <Play className="size-4 ml-0.5" />
                  </button>
                </Link>
              ))}
            </div>
          </div>

          {/* === GLOBE COMPACT (droite desktop / dessous mobile) === */}
          <aside className="lg:sticky lg:top-6">
            <div className="glass rounded-2xl p-3 box-glow-green">
              <div className="flex items-center justify-between mb-2 px-1">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--neon-green)]">
                    // LIVE NETWORK
                  </p>
                  <h2 className="font-display text-lg glow-green">
                    Le globe musical
                  </h2>
                </div>
                <button
                  onClick={() => setGlobeExpanded(true)}
                  aria-label="Agrandir le globe"
                  className="size-9 rounded-full border border-[color:var(--neon-cyan)] text-[color:var(--neon-cyan)] hover:bg-[color:var(--neon-cyan)] hover:text-[color:var(--background)] transition flex items-center justify-center"
                >
                  <Maximize2 className="size-4" />
                </button>
              </div>
              {/* Compact : 300px mobile, 75vh desktop */}
              <div className="h-[300px] lg:h-[75vh]">
                <Globe
                  expanded={globeExpanded}
                  onExpandedChange={setGlobeExpanded}
                />
              </div>
              <p className="text-center text-[11px] font-mono text-muted-foreground mt-2">
                Clic / touche pour agrandir
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
