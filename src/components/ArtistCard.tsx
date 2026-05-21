import { Link } from "@tanstack/react-router";
import { artistBySlug } from "@/data/music";
import type { TopArtistRow } from "@/hooks/useDiscoverData";

export default function ArtistCard({ artist }: { artist: TopArtistRow }) {
  const local = artistBySlug(artist.slug);
  const img = local?.image ?? `https://picsum.photos/seed/${encodeURIComponent(artist.slug)}/400/400`;
  return (
    <Link
      to="/artist/$slug"
      params={{ slug: artist.slug }}
      className="group block rounded-xl glass p-3 hover:scale-[1.03] transition text-center"
    >
      <div className="relative mx-auto size-28 rounded-full overflow-hidden mb-2 ring-1 ring-[color:var(--neon-pink)]/30 group-hover:ring-[color:var(--neon-pink)] transition">
        <img src={img} alt="" loading="lazy" className="size-full object-cover" />
      </div>
      <div className="truncate font-semibold text-sm">{artist.name}</div>
      {artist.country && <div className="truncate text-[10px] font-mono text-muted-foreground">{artist.country}</div>}
      <div className="mt-1 text-[10px] font-mono text-[color:var(--neon-cyan)]">
        {artist.playCount} écoute{artist.playCount > 1 ? "s" : ""}
      </div>
    </Link>
  );
}
