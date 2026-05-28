import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useLibrary } from "@/lib/library";
import SongTable from "@/components/SongTable";
import { usePlayer } from "@/lib/player";
import { Play } from "lucide-react";

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "Mes favoris · SOUNDWAVE" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const p = usePlayer();
  const lib = useLibrary();
  const songs = lib.favorites;

  return (
    <div className="mx-auto max-w-[1600px] px-4 md:px-6 py-8">
      <header className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--neon-pink)]">// LIKED TRACKS</p>
          <h1 className="font-display text-4xl glow-pink">❤ Mes favoris</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">{songs.length} chansons</p>
        </div>
        {songs.length > 0 && (
          <button onClick={() => {
            const playable = songs.filter((s: any) => !s.__unplayable && (s.audioUrl || s.url));
            if (!playable.length) { toast.error("Aucun favori n'a de fichier audio disponible"); return; }
            p.playQueue(playable, 0);
          }}
            className="flex items-center gap-2 px-4 py-2 rounded bg-[color:var(--neon-pink)] text-[color:var(--background)] font-medium hover:scale-105 transition box-glow-pink">
            <Play className="size-4" /> Tout lire
          </button>
        )}
      </header>
      {songs.length === 0
        ? <p className="text-center text-muted-foreground py-16 font-mono">// no favorites yet</p>
        : <SongTable songs={songs} showArtist />}
    </div>
  );
}
