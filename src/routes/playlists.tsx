import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { storage, type Playlist } from "@/lib/storage";
import SongTable from "@/components/SongTable";
import { usePlayer } from "@/lib/player";
import { Plus, Trash2, Play } from "lucide-react";

export const Route = createFileRoute("/playlists")({
  head: () => ({ meta: [{ title: "Mes playlists · SOUNDWAVE" }] }),
  component: PlaylistsPage,
});

const COLORS = ["#00FF41", "#FF006E", "#00D4FF", "#FFD700"];

function PlaylistsPage() {
  const [list, setList] = useState<Playlist[]>(typeof window !== "undefined" ? storage.getPlaylists() : []);
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const p = usePlayer();
  const refresh = () => setList(storage.getPlaylists());

  const current = list.find(x => x.id === open);

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
          <button disabled={!name.trim()} onClick={() => { storage.createPlaylist(name.trim(), color); setName(""); setCreating(false); refresh(); }}
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
              <div className="aspect-square rounded mb-3 overflow-hidden grid grid-cols-2 grid-rows-2 gap-0.5">
                {Array.from({ length: 4 }).map((_, j) => {
                  const s = pl.songs[j];
                  return s ? <img key={j} src={s.cover} alt="" className="size-full object-cover" />
                           : <div key={j} className="size-full" style={{ background: pl.color, opacity: 0.2 }} />;
                })}
              </div>
              <p className="font-display font-bold truncate" style={{ color: pl.color }}>{pl.name}</p>
              <p className="text-[10px] font-mono text-muted-foreground">{pl.songs.length} chansons</p>
            </button>
          ))}
        </div>
      )}

      {current && (
        <section className="glass rounded-xl p-5 box-glow-pink">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="font-display text-2xl" style={{ color: current.color, textShadow: `0 0 10px ${current.color}` }}>{current.name}</h2>
              <p className="text-xs font-mono text-muted-foreground">{current.songs.length} chansons</p>
            </div>
            <div className="flex gap-2">
              <button disabled={current.songs.length === 0} onClick={() => p.playQueue(current.songs, 0)}
                className="flex items-center gap-2 px-3 py-2 rounded bg-[color:var(--neon-green)] text-[color:var(--background)] disabled:opacity-50 font-medium">
                <Play className="size-4" /> Lire
              </button>
              <button onClick={() => { if (confirm("Supprimer cette playlist ?")) { storage.deletePlaylist(current.id); setOpen(null); refresh(); } }}
                className="flex items-center gap-2 px-3 py-2 rounded border border-[color:var(--neon-red)]/40 text-[color:var(--neon-red)] hover:bg-[color:var(--neon-red)]/10">
                <Trash2 className="size-4" /> Supprimer
              </button>
            </div>
          </div>
          {current.songs.length > 0 ? <SongTable songs={current.songs} showArtist /> : <p className="text-muted-foreground text-center py-8">Playlist vide.</p>}
        </section>
      )}
    </div>
  );
}
