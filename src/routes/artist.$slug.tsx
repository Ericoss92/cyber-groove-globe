import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ARTISTS, artistBySlug } from "@/data/music";
import SongTable from "@/components/SongTable";
import { usePlayer } from "@/lib/player";
import { storage } from "@/lib/storage";
import { Play, Heart, Plus, Instagram, Twitter, Youtube, Music2, Pencil } from "lucide-react";
import AddToPlaylistModal from "@/components/AddToPlaylistModal";
import { formatNumber } from "@/lib/format";
import { api, cachedUser } from "@/api/client";

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

type Meta = {
  biography?: string | null;
  description?: string | null;
  mainGenre?: string | null;
  yearsActive?: string | null;
  imageUrl?: string | null;
  country?: string | null;
  socialLinks?: Record<string, string> | null;
};

function ArtistPage() {
  const { artist } = Route.useLoaderData();
  const p = usePlayer();
  const u = cachedUser.get();
  const [addOpen, setAddOpen] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);

  useEffect(() => {
    let active = true;
    api.getArtistMeta(artist.slug)
      .then((m) => { if (active) setMeta(m || null); })
      .catch(() => {});
    return () => { active = false; };
  }, [artist.slug]);

  const fav = artist.songs.length ? storage.isFavorite(artist.songs[0].id) : false;

  // Merge BDD metadata with generated catalog data — BDD wins.
  const display = useMemo(() => {
    const socials = { ...artist.socials, ...(meta?.socialLinks || {}) };
    return {
      name: artist.name,
      image: meta?.imageUrl || artist.image,
      banner: artist.banner,
      country: meta?.country || artist.country,
      continent: artist.continent,
      yearsActive: meta?.yearsActive || `depuis ${artist.foundedYear}`,
      mainGenre: meta?.mainGenre || artist.genres[0],
      description: meta?.description || "",
      biography: meta?.biography || artist.bio,
      socials,
      genres: artist.genres,
    };
  }, [artist, meta]);

  const recommended = useMemo(() =>
    ARTISTS.filter(a =>
      a.slug !== artist.slug && (a.country === display.country || a.genres.some((g: string) => artist.genres.includes(g)))
    ).slice(0, 6),
  [artist, display.country]);

  return (
    <div>
      {/* Banner — visual atmosphere only, no name overlap */}
      <section className="relative h-[28vh] min-h-[180px] md:h-[34vh] md:min-h-[240px] overflow-hidden">
        <img src={display.banner} alt="" className="absolute inset-0 size-full object-cover opacity-70" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, color-mix(in oklab, var(--background) 45%, transparent) 0%, var(--background) 100%)" }} />
        <div className="absolute inset-0 grid-bg opacity-25" />
      </section>

      {/* Header card — image + clean info column, no overlap */}
      <section className="mx-auto max-w-[1600px] px-4 md:px-6 -mt-16 md:-mt-20 relative z-10">
        <div className="glass rounded-2xl p-4 md:p-6 box-glow-green">
          <div className="flex flex-col md:flex-row gap-5 items-start">
            <img
              src={display.image}
              alt={display.name}
              className="size-32 md:size-44 rounded-xl object-cover box-glow-pink shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--neon-cyan)]">// ARTIST PROFILE</p>
              <h1 className="font-display text-3xl md:text-5xl glow-green leading-tight break-words mt-1">
                {display.name}
              </h1>
              <p className="font-mono text-xs text-muted-foreground mt-2">
                🌍 {display.country} · {display.continent} · ⏱ {display.yearsActive} · ⭐ {formatNumber(artist.followers)} fans
              </p>
              <div className="flex flex-wrap gap-1.5 my-3">
                {display.mainGenre && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-[color:var(--neon-green)]/15 text-[color:var(--neon-green)] border border-[color:var(--neon-green)]/40">
                    {display.mainGenre}
                  </span>
                )}
                {display.genres.filter((g: string) => g !== display.mainGenre).map((g: string) => (
                  <span key={g} className="px-2 py-0.5 rounded-full text-xs font-mono bg-[color:var(--neon-pink)]/15 text-[color:var(--neon-pink)] border border-[color:var(--neon-pink)]/30">{g}</span>
                ))}
              </div>
              {display.description && (
                <p className="text-sm italic text-foreground/75 max-w-3xl">{display.description}</p>
              )}
              <div className="flex gap-3 mt-3 text-muted-foreground">
                {display.socials.instagram && <a href={display.socials.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="hover:text-[color:var(--neon-pink)] hover:scale-110 transition"><Instagram className="size-4" /></a>}
                {display.socials.twitter && <a href={display.socials.twitter} target="_blank" rel="noreferrer" aria-label="Twitter" className="hover:text-[color:var(--neon-cyan)] hover:scale-110 transition"><Twitter className="size-4" /></a>}
                {display.socials.youtube && <a href={display.socials.youtube} target="_blank" rel="noreferrer" aria-label="YouTube" className="hover:text-[color:var(--neon-red)] hover:scale-110 transition"><Youtube className="size-4" /></a>}
                {display.socials.spotify && <a href={display.socials.spotify} target="_blank" rel="noreferrer" aria-label="Spotify" className="hover:text-[color:var(--neon-green)] hover:scale-110 transition"><Music2 className="size-4" /></a>}
              </div>
            </div>

            {/* Action column */}
            <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto md:shrink-0">
              <button onClick={() => p.playQueue(artist.songs, 0)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-[color:var(--neon-green)] text-[color:var(--background)] font-medium hover:scale-105 transition box-glow-green">
                <Play className="size-4" /> Tout lire
              </button>
              <button onClick={() => { artist.songs.forEach((s: any) => storage.toggleFavorite(s)); p.bumpFav(); }}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md border transition hover:scale-105 ${fav ? "border-[color:var(--neon-pink)] text-[color:var(--neon-pink)]" : "border-border hover:border-[color:var(--neon-pink)]"}`}>
                <Heart className="size-4" /> Favoris
              </button>
              <button onClick={() => artist.songs[0] && setAddOpen(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-border hover:border-[color:var(--neon-cyan)] hover:text-[color:var(--neon-cyan)] hover:scale-105 transition">
                <Plus className="size-4" /> Playlist
              </button>
              {u?.admin && (
                <Link to="/admin-artists/$slug" params={{ slug: artist.slug }}
                  className="md:mt-1 flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-[color:var(--neon-cyan)]/40 text-[color:var(--neon-cyan)] text-sm hover:bg-[color:var(--neon-cyan)]/10 transition">
                  <Pencil className="size-3.5" /> Modifier
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Biography */}
      {display.biography && (
        <section className="mx-auto max-w-[1600px] px-4 md:px-6 pt-8">
          <h2 className="font-display text-xl mb-3 glow-cyan">Biographie</h2>
          <div className="glass rounded-xl p-5 max-w-4xl">
            <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-line">{display.biography}</p>
          </div>
        </section>
      )}

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
