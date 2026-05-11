import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ARTISTS, artistBySlug } from "@/data/music";
import SongTable from "@/components/SongTable";
import { usePlayer } from "@/lib/player";
import { storage } from "@/lib/storage";
import { Play, Heart, Plus, Instagram, Twitter, Youtube, Music2 } from "lucide-react";
import AddToPlaylistModal from "@/components/AddToPlaylistModal";
import { formatNumber } from "@/lib/format";

export const Route = createFileRoute("/artist/$slug")({
  loader: ({ params }) => {
    const a = artistBySlug(params.slug);
    if (!a) throw notFound();
    return { artist: a };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.artist.name ?? "Artiste"} · SOUNDWAVE` },
      { name: "description", content: loaderData?.artist.bio.slice(0, 160) ?? "" },
      { property: "og:image", content: loaderData?.artist.banner ?? "" },
    ],
  }),
  notFoundComponent: () => <div className="p-12 text-center"><h1 className="font-display text-3xl glow-pink">Artiste introuvable</h1></div>,
  component: ArtistPage,
});

function ArtistPage() {
  const { artist } = Route.useLoaderData();
  const p = usePlayer();
  const [addOpen, setAddOpen] = useState(false);
  const fav = artist.songs.length ? storage.isFavorite(artist.songs[0].id) : false;

  const recommended = useMemo(() =>
    ARTISTS.filter(a =>
      a.slug !== artist.slug && (a.country === artist.country || a.genres.some((g: string) => artist.genres.includes(g)))
    ).slice(0, 6),
  [artist]);

  return (
    <div>
      {/* Banner */}
      <section className="relative h-[40vh] min-h-[280px] overflow-hidden">
        <img src={artist.banner} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, color-mix(in oklab, var(--background) 30%, transparent) 0%, var(--background) 100%)" }} />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-[1600px] h-full px-4 md:px-6 flex items-end pb-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--neon-cyan)]">// ARTIST PROFILE</p>
            <h1 className="font-display text-5xl md:text-7xl glow-green hover-glitch">{artist.name}</h1>
          </div>
        </div>
      </section>

      {/* Info */}
      <section className="mx-auto max-w-[1600px] px-4 md:px-6 -mt-10 relative z-10">
        <div className="grid md:grid-cols-[200px_1fr_auto] gap-5 items-start glass rounded-2xl p-5 box-glow-green">
          <img src={artist.image} alt={artist.name} className="size-40 md:size-48 rounded-xl object-cover box-glow-pink" />
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">🌍 {artist.country} · {artist.continent} · ⏱ depuis {artist.foundedYear} · ⭐ {formatNumber(artist.followers)} fans</p>
            <div className="flex flex-wrap gap-1.5 my-2">
              {artist.genres.map((g: string) => (
                <span key={g} className="px-2 py-0.5 rounded-full text-xs font-mono bg-[color:var(--neon-pink)]/20 text-[color:var(--neon-pink)] border border-[color:var(--neon-pink)]/40">{g}</span>
              ))}
            </div>
            <p className="text-sm leading-relaxed text-foreground/80 max-w-3xl">{artist.bio}</p>
            <div className="flex gap-2 mt-3 text-muted-foreground">
              {artist.socials.instagram && <a href={artist.socials.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="hover:text-[color:var(--neon-pink)] hover:scale-110 transition"><Instagram className="size-4" /></a>}
              {artist.socials.twitter && <a href={artist.socials.twitter} target="_blank" rel="noreferrer" aria-label="Twitter" className="hover:text-[color:var(--neon-cyan)] hover:scale-110 transition"><Twitter className="size-4" /></a>}
              {artist.socials.youtube && <a href={artist.socials.youtube} target="_blank" rel="noreferrer" aria-label="YouTube" className="hover:text-[color:var(--neon-red)] hover:scale-110 transition"><Youtube className="size-4" /></a>}
              {artist.socials.spotify && <a href={artist.socials.spotify} target="_blank" rel="noreferrer" aria-label="Spotify" className="hover:text-[color:var(--neon-green)] hover:scale-110 transition"><Music2 className="size-4" /></a>}
            </div>
          </div>
          <div className="flex md:flex-col gap-2">
            <button onClick={() => p.playQueue(artist.songs, 0)}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-[color:var(--neon-green)] text-[color:var(--background)] font-medium hover:scale-105 transition box-glow-green">
              <Play className="size-4" /> Tout lire
            </button>
            <button onClick={() => { artist.songs.forEach((s: any) => storage.toggleFavorite(s)); p.bumpFav(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md border transition hover:scale-105 ${fav ? "border-[color:var(--neon-pink)] text-[color:var(--neon-pink)]" : "border-border hover:border-[color:var(--neon-pink)]"}`}>
              <Heart className="size-4" /> Favoris
            </button>
            <button onClick={() => artist.songs[0] && setAddOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-border hover:border-[color:var(--neon-cyan)] hover:text-[color:var(--neon-cyan)] hover:scale-105 transition">
              <Plus className="size-4" /> Playlist
            </button>
          </div>
        </div>
      </section>

      {/* Discography */}
      <section className="mx-auto max-w-[1600px] px-4 md:px-6 py-8">
        <h2 className="font-display text-2xl mb-4 glow-cyan">Discographie</h2>
        <SongTable songs={artist.songs} />
      </section>

      {/* Recommended */}
      {recommended.length > 0 && (
        <section className="mx-auto max-w-[1600px] px-4 md:px-6 pb-12">
          <h2 className="font-display text-2xl mb-4 glow-pink">Artistes similaires</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {recommended.map((a, i) => (
              <Link key={a.slug} to="/artist/$slug" params={{ slug: a.slug }}
                className="group rounded-xl overflow-hidden glass hover:scale-[1.04] transition animate-rise"
                style={{ animationDelay: `${i * 50}ms` }}>
                <div className="aspect-square overflow-hidden">
                  <img src={a.image} alt={a.name} loading="lazy" className="size-full object-cover group-hover:scale-110 transition duration-500" />
                </div>
                <div className="p-2">
                  <p className="text-sm font-medium truncate">{a.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground truncate">{a.country}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {addOpen && artist.songs[0] && <AddToPlaylistModal song={artist.songs[0]} onClose={() => setAddOpen(false)} />}
    </div>
  );
}
