import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLibrary, type ApiPlaylist } from "@/lib/library";
import SongTable from "@/components/SongTable";
import { usePlayer } from "@/lib/player";
import type { Song } from "@/lib/types";
import { Plus, Trash2, Play } from "lucide-react";

export const Route = createFileRoute("/playlists")({
  head: () => ({ meta: [{ title: "Mes playlists · SOUNDWAVE" }] }),
  component: PlaylistsPage,
});

const COLORS = ["#00FF41", "#FF006E", "#00D4FF", "#FFD700"];

function PlaylistsPage() {
  const lib = useLibrary();
  const list = lib.playlists;
  const [open, setOpen] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [details, setDetails] = useState<{ playlist: ApiPlaylist; songs: Song[] } | null>(null);
  const p = usePlayer();

  useEffect(() => {
    if (open == null) { setDetails(null); return; }
    let cancelled = false;
    lib.getPlaylistWithSongs(open).then(d => { if (!cancelled) setDetails(d); });
    return () => { cancelled = true; };
  }, [open, lib, list]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 md:px-6 py-8">
      <header className="flex items-end justify-between mb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--neon-pink)]">// COLLECTIONS</p>
          <h1 className="font-display text-4xl glow-pink">Mes playlists</h1>
        </div>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-[color:var(--neon-green)] text-[color:var(--background)] font-medium hover:scale-105 transition box-glow-green">
          <Plus className="size-4" /> Créer playlist
        </button>
      </header>

      {creating && (
        <div className="glass rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Nom"
            className="px-3 py-2 rounded bg-[color:var(--surface)] border border-[color:var(--neon-cyan)]/30 outline-none font-mono text-sm flex-1 min-w-[200px]" />
          <div className="flex gap-1">
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} aria-label={c}
                className={`size-7 rounded-full transition ${color === c ? "ring-2 ring-white" : ""}`}
                style={{ background: c, boxShadow: `0 0 10px ${c}` }} />
            ))}
          </div>
          <button onClick={() => setCreating(false)} className="px-3 py-2 rounded border border-border text-sm">Annuler</button>
          <button disabled={!name.trim()} onClick={async () => { await lib.createPlaylist(name.trim(), color); setName(""); setCreating(false); }}
            className="px-4 py-2 rounded bg-[color:var(--neon-pink)] text-[color:var(--background)] disabled:opacity-50 font-medium">Créer</button>
        </div>
      )}

      {list.length === 0 ? (
        <p className="text-center text-muted-foreground py-16 font-mono">// no playlists yet</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
          {list.map((pl, i) => (
            <button key={pl.id} onClick={() => setOpen(pl.id)}
              className="text-left glass rounded-xl p-4 hover:scale-[1.03] transition animate-rise"
              style={{ animationDelay: `${i * 50}ms`, boxShadow: `0 0 20px ${pl.color}55, inset 0 0 1px ${pl.color}` }}>
              <div className="aspect-square rounded mb-3 grid place-items-center" style={{ background: pl.color, opacity: 0.2 }}>
                <span className="font-display text-4xl" style={{ color: pl.color, opacity: 1 }}>{pl.name.charAt(0).toUpperCase()}</span>
              </div>
              <p className="font-display font-bold truncate" style={{ color: pl.color }}>{pl.name}</p>
              <p className="text-[10px] font-mono text-muted-foreground">{pl.songCount} chansons</p>
            </button>
          ))}
        </div>
      )}

      {details && (
        <section className="glass rounded-xl p-5 box-glow-pink">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="font-display text-2xl" style={{ color: details.playlist.color, textShadow: `0 0 10px ${details.playlist.color}` }}>{details.playlist.name}</h2>
              <p className="text-xs font-mono text-muted-foreground">{details.songs.length} chansons</p>
            </div>
            <div className="flex gap-2">
              <button disabled={details.songs.length === 0} onClick={() => p.playQueue(details.songs, 0)}
                className="flex items-center gap-2 px-3 py-2 rounded bg-[color:var(--neon-green)] text-[color:var(--background)] disabled:opacity-50 font-medium">
                <Play className="size-4" /> Lire
              </button>
              <button onClick={async () => { if (confirm("Supprimer cette playlist ?")) { await lib.deletePlaylist(details.playlist.id); setOpen(null); } }}
                className="flex items-center gap-2 px-3 py-2 rounded border border-[color:var(--neon-red)]/40 text-[color:var(--neon-red)] hover:bg-[color:var(--neon-red)]/10">
                <Trash2 className="size-4" /> Supprimer
              </button>
            </div>
          </div>
          {details.songs.length > 0 ? <SongTable songs={details.songs} showArtist /> : <p className="text-muted-foreground text-center py-8">Playlist vide.</p>}
        </section>
      )}
    </div>
  );
}
