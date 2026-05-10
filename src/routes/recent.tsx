import { createFileRoute } from "@tanstack/react-router";
import { storage } from "@/lib/storage";
import SongTable from "@/components/SongTable";

export const Route = createFileRoute("/recent")({
  head: () => ({ meta: [{ title: "Récemment écouté · SOUNDWAVE" }] }),
  component: RecentPage,
});

function RecentPage() {
  const songs = typeof window !== "undefined" ? storage.getRecent() : [];
  return (
    <div className="mx-auto max-w-[1600px] px-4 md:px-6 py-8">
      <p className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--neon-cyan)]">// HISTORY LOG</p>
      <h1 className="font-display text-4xl glow-cyan mb-1">Récemment écouté</h1>
      <p className="text-xs font-mono text-muted-foreground mb-6">{songs.length} chansons</p>
      {songs.length === 0
        ? <p className="text-center text-muted-foreground py-16 font-mono">// no history yet</p>
        : <SongTable songs={songs} showArtist />}
    </div>
  );
}
