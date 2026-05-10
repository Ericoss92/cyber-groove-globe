import { useState } from "react";
import { X, Plus } from "lucide-react";
import { storage, type Playlist } from "@/lib/storage";
import type { Song } from "@/lib/types";

const COLORS = ["#00FF41", "#FF006E", "#00D4FF", "#FFD700"];

export default function AddToPlaylistModal({ song, onClose }: { song: Song; onClose: () => void }) {
  const [playlists, setPlaylists] = useState<Playlist[]>(storage.getPlaylists());
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [toast, setToast] = useState("");

  const refresh = () => setPlaylists(storage.getPlaylists());

  return (
    <div role="dialog" aria-modal="true" aria-label="Ajouter à une playlist"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "color-mix(in oklab, var(--background) 80%, transparent)" }}
      onClick={onClose}>
      <div className="glass rounded-xl w-full max-w-md p-5 animate-rise box-glow-cyan" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg glow-cyan">Ajouter à une playlist</h3>
          <button onClick={onClose} aria-label="Fermer" className="p-1 hover:text-[color:var(--neon-pink)]"><X className="size-5" /></button>
        </div>
        <p className="text-xs font-mono text-muted-foreground mb-3 truncate">{song.title} · {song.artistName}</p>

        {playlists.length === 0 && !creating && (
          <p className="text-sm text-muted-foreground mb-3">Aucune playlist. Créez-en une.</p>
        )}

        <div className="space-y-1 max-h-60 overflow-auto mb-3">
          {playlists.map(pl => (
            <button key={pl.id}
              onClick={() => { storage.addToPlaylist(pl.id, song); setToast(`Ajouté à "${pl.name}"`); setTimeout(onClose, 700); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-[color:var(--neon-green)]/10 text-left">
              <span className="size-3 rounded-full" style={{ background: pl.color, boxShadow: `0 0 10px ${pl.color}` }} />
              <span className="flex-1 truncate">{pl.name}</span>
              <span className="text-xs font-mono text-muted-foreground">{pl.songs.length}</span>
            </button>
          ))}
        </div>

        {!creating ? (
          <button onClick={() => setCreating(true)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded border border-[color:var(--neon-green)]/40 text-[color:var(--neon-green)] hover:bg-[color:var(--neon-green)]/10">
            <Plus className="size-4" /> Créer une playlist
          </button>
        ) : (
          <div className="space-y-2">
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Nom de la playlist"
              className="w-full px-3 py-2 rounded bg-[color:var(--surface)]/60 border border-[color:var(--neon-cyan)]/30 focus:border-[color:var(--neon-cyan)] outline-none font-mono text-sm" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">Couleur :</span>
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} aria-label={`Couleur ${c}`}
                  className={`size-6 rounded-full transition ${color === c ? "ring-2 ring-offset-2 ring-offset-[color:var(--surface)] ring-white scale-110" : ""}`}
                  style={{ background: c, boxShadow: `0 0 10px ${c}` }} />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCreating(false)} className="flex-1 py-2 rounded border border-border text-sm">Annuler</button>
              <button disabled={!name.trim()} onClick={() => {
                const pl = storage.createPlaylist(name.trim(), color);
                storage.addToPlaylist(pl.id, song);
                setToast(`Créée et ajoutée à "${pl.name}"`); refresh();
                setTimeout(onClose, 700);
              }}
                className="flex-1 py-2 rounded bg-[color:var(--neon-green)] text-[color:var(--background)] font-medium disabled:opacity-50">
                Créer
              </button>
            </div>
          </div>
        )}

        {toast && (
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded glass text-sm glow-green">{toast}</div>
        )}
      </div>
    </div>
  );
}
