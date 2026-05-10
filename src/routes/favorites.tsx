import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { storage } from "@/lib/storage";
import SongTable from "@/components/SongTable";
import { usePlayer } from "@/lib/player";
import { Play } from "lucide-react";

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "Mes favoris · SOUNDWAVE" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const p = usePlayer();
  // re-read on favTick changes
  const [, setT] = useState(0);
  if (typeof window !== "undefined") void p.favTick;
  const songs = typeof window !== "undefined" ? storage.getFavorites() : [];

  return (
    <div className="mx-auto max-w-[1600px] px-4 md:px-6 py-8">
      <header className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--neon-pink)]">// LIKED TRACKS</p>
          <h1 className="font-display text-4xl glow-pink">❤ Mes favoris</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">{songs.length} chansons</p>
        </div>
        {songs.length > 0 && (
          <button onClick={() => p.playQueue(songs, 0)}
            className="flex items-center gap-2 px-4 py-2 rounded bg-[color:var(--neon-pink)] text-[color:var(--background)] font-medium hover:scale-105 transition box-glow-pink">
            <Play className="size-4" /> Tout lire
          </button>
        )}
      </header>
      {songs.length === 0
        ? <p className="text-center text-muted-foreground py-16 font-mono">// no favorites yet</p>
        : <SongTable songs={songs} showArtist />}
      <button onClick={() => setT(t => t + 1)} className="hidden">refresh</button>
    </div>
  );
}
