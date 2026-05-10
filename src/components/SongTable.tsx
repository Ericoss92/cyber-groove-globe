import { useState } from "react";
import { Play, Heart, Plus } from "lucide-react";
import type { Song } from "@/lib/types";
import { usePlayer } from "@/lib/player";
import { storage } from "@/lib/storage";
import { formatDuration } from "@/data/music";
import AddToPlaylistModal from "./AddToPlaylistModal";

export default function SongTable({ songs, showArtist = false }: { songs: Song[]; showArtist?: boolean }) {
  const p = usePlayer();
  const [addSong, setAddSong] = useState<Song | null>(null);

  return (
    <>
      <div className="rounded-xl glass overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs font-mono uppercase text-muted-foreground border-b border-[color:var(--neon-green)]/20">
            <tr>
              <th className="px-3 py-2 w-10 text-left">#</th>
              <th className="px-3 py-2 text-left">Titre</th>
              {showArtist && <th className="px-3 py-2 text-left hidden md:table-cell">Artiste</th>}
              <th className="px-3 py-2 text-left hidden md:table-cell">Genre</th>
              <th className="px-3 py-2 text-right w-20">Durée</th>
              <th className="px-3 py-2 w-32"></th>
            </tr>
          </thead>
          <tbody>
            {songs.map((s, i) => {
              const isCurrent = p.current?.id === s.id;
              const fav = storage.isFavorite(s.id);
              return (
                <tr key={s.id}
                  className={`group border-b border-white/5 transition hover:bg-[color:var(--neon-green)]/5 ${isCurrent ? "bg-[color:var(--neon-green)]/10" : ""}`}>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {isCurrent && p.playing ? <span className="inline-block size-2 rounded-full bg-[color:var(--neon-green)] animate-pulse-neon" /> : i + 1}
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => p.playQueue(songs, i)} className="flex items-center gap-3 text-left">
                      <img src={s.cover} alt="" loading="lazy" className="size-9 rounded object-cover" />
                      <span className={`truncate ${isCurrent ? "text-[color:var(--neon-green)] glow-green" : ""}`}>{s.title}</span>
                    </button>
                  </td>
                  {showArtist && <td className="px-3 py-2 hidden md:table-cell text-muted-foreground">{s.artistName}</td>}
                  <td className="px-3 py-2 hidden md:table-cell text-muted-foreground font-mono text-xs">{s.genre}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground tabular-nums">{formatDuration(s.duration)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => p.playQueue(songs, i)} aria-label="Lire" className="p-1.5 rounded hover:text-[color:var(--neon-green)] hover:scale-110 transition"><Play className="size-4" /></button>
                      <button onClick={() => { storage.toggleFavorite(s); p.bumpFav(); }} aria-label="Favoris" className={`p-1.5 rounded hover:scale-110 transition ${fav ? "text-[color:var(--neon-pink)]" : "hover:text-[color:var(--neon-pink)]"}`}>
                        <Heart className={`size-4 ${fav ? "fill-current" : ""}`} />
                      </button>
                      <button onClick={() => setAddSong(s)} aria-label="Ajouter à une playlist" className="p-1.5 rounded hover:text-[color:var(--neon-cyan)] hover:scale-110 transition"><Plus className="size-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {addSong && <AddToPlaylistModal song={addSong} onClose={() => setAddSong(null)} />}
    </>
  );
}
