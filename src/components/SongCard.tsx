import { Play } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Song } from "@/lib/types";
import { usePlayer } from "@/lib/player";
import { formatDuration } from "@/data/music";

export default function SongCard({ song, queue }: { song: Song; queue?: Song[] }) {
  const p = usePlayer();
  const onPlay = () => {
    const q = queue && queue.length ? queue : [song];
    const idx = Math.max(0, q.findIndex(s => s.id === song.id));
    p.playQueue(q, idx);
  };
  return (
    <div className="group relative w-44 shrink-0 rounded-xl glass p-3 hover:scale-[1.03] transition">
      <button onClick={onPlay} aria-label={`Lire ${song.title}`} className="block w-full">
        <div className="relative aspect-square rounded-lg overflow-hidden mb-2">
          <img src={song.cover} alt="" loading="lazy" className="size-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40">
            <Play className="size-8 text-[color:var(--neon-green)] drop-shadow" />
          </div>
        </div>
        <div className="truncate text-sm font-semibold">{song.title}</div>
      </button>
      <Link
        to="/artist/$slug"
        params={{ slug: song.artistSlug }}
        className="block truncate text-xs text-muted-foreground hover:text-[color:var(--neon-cyan)]"
      >
        {song.artistName}
      </Link>
      <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
        <span className="truncate">{song.genre}</span>
        <span>{formatDuration(song.duration)}</span>
      </div>
    </div>
  );
}
