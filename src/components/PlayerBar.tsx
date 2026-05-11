import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Repeat, Repeat1, Shuffle, Heart, Plus, Maximize2, X
} from "lucide-react";
import { usePlayer } from "@/lib/player";
import { storage } from "@/lib/storage";
import { formatDuration } from "@/data/music";
import AddToPlaylistModal from "./AddToPlaylistModal";

export default function PlayerBar() {
  const p = usePlayer();
  const [addOpen, setAddOpen] = useState(false);

  if (!p.current) return null;

  const fav = storage.isFavorite(p.current.id);
  const pct = p.duration ? (p.currentTime / p.duration) * 100 : 0;

  return (
    <>
      <div className="fixed bottom-3 inset-x-3 md:inset-x-6 z-40 glass rounded-2xl border border-[color:var(--neon-green)]/40 box-glow-green animate-rise">
        <div className="mx-auto max-w-[1600px] grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-6 px-3 md:px-6 py-2.5">
          {/* Left: track info */}
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => p.setExpanded(true)} className="shrink-0 size-12 rounded overflow-hidden box-glow-cyan" aria-label="Agrandir le lecteur">
              <img src={p.current.cover} alt="" className="size-full object-cover" />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate glow-green">{p.current.title}</p>
              <Link to="/artist/$slug" params={{ slug: p.current.artistSlug }}
                className="text-xs text-muted-foreground hover:text-[color:var(--neon-cyan)] truncate block">
                {p.current.artistName}
              </Link>
            </div>
          </div>

          {/* Center: controls + progress */}
          <div className="flex flex-col items-center gap-1.5 min-w-[280px] md:min-w-[420px]">
            <div className="flex items-center gap-1 md:gap-2">
              <IconBtn onClick={p.toggleShuffle} active={p.shuffle} label="Aléatoire (S)"><Shuffle className="size-4" /></IconBtn>
              <IconBtn onClick={p.prev} label="Précédent (←)"><SkipBack className="size-5" /></IconBtn>
              <button onClick={p.toggle}
                className="size-10 rounded-full bg-[color:var(--neon-green)] text-[color:var(--background)] flex items-center justify-center hover:scale-105 active:scale-95 transition box-glow-green"
                aria-label={p.playing ? "Pause (Espace)" : "Lecture (Espace)"}>
                {p.playing ? <Pause className="size-5" /> : <Play className="size-5 ml-0.5" />}
              </button>
              <IconBtn onClick={p.next} label="Suivant (→)"><SkipForward className="size-5" /></IconBtn>
              <IconBtn onClick={p.cycleRepeat} active={p.repeatMode > 0} label="Répéter (R)">
                {p.repeatMode === 2 ? <Repeat1 className="size-4" /> : <Repeat className="size-4" />}
              </IconBtn>
            </div>
            <div className="flex items-center gap-2 w-full">
              <span className="text-[10px] font-mono text-muted-foreground tabular-nums w-10 text-right">{formatDuration(p.currentTime)}</span>
              <ProgressBar pct={pct} duration={p.duration} onSeek={p.seek} />
              <span className="text-[10px] font-mono text-muted-foreground tabular-nums w-10">{formatDuration(p.duration || p.current.duration)}</span>
            </div>
          </div>

          {/* Right: extras */}
          <div className="flex items-center justify-end gap-1 md:gap-2">
            <IconBtn onClick={() => { storage.toggleFavorite(p.current!); p.bumpFav(); }} active={fav} label="Favoris">
              <Heart className={`size-4 ${fav ? "fill-current" : ""}`} />
            </IconBtn>
            <IconBtn onClick={() => setAddOpen(true)} label="Ajouter à une playlist"><Plus className="size-4" /></IconBtn>
            <div className="hidden md:flex items-center gap-2">
              <button onClick={p.toggleMute} aria-label="Muet" className="text-muted-foreground hover:text-[color:var(--neon-cyan)]">
                {p.muted || p.volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
              <input type="range" min={0} max={1} step={0.01} value={p.muted ? 0 : p.volume}
                onChange={(e) => p.setVolume(parseFloat(e.target.value))}
                aria-label="Volume"
                className="w-24 accent-[color:var(--neon-cyan)]" />
            </div>
            <IconBtn onClick={() => p.setExpanded(true)} label="Plein écran"><Maximize2 className="size-4" /></IconBtn>
          </div>
        </div>
      </div>

      {p.expanded && <FullscreenPlayer onAddToPlaylist={() => setAddOpen(true)} />}
      {addOpen && <AddToPlaylistModal song={p.current} onClose={() => setAddOpen(false)} />}
    </>
  );
}

function IconBtn({ children, onClick, active, label }: { children: React.ReactNode; onClick?: () => void; active?: boolean; label: string }) {
  return (
    <button onClick={onClick} aria-label={label}
      className={`p-2 rounded-md transition hover:scale-110 ${active ? "text-[color:var(--neon-pink)] glow-pink" : "text-foreground/70 hover:text-[color:var(--neon-green)]"}`}>
      {children}
    </button>
  );
}

function ProgressBar({ pct, duration, onSeek }: { pct: number; duration: number; onSeek: (s: number) => void }) {
  return (
    <div
      className="relative flex-1 h-1.5 rounded-full bg-[color:var(--surface)] cursor-pointer group"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - r.left) / r.width;
        onSeek(Math.max(0, Math.min(1, ratio)) * duration);
      }}
      role="slider" aria-label="Progression" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}
    >
      <div className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--neon-green), var(--neon-pink))", boxShadow: "0 0 10px var(--neon-pink)" }} />
      <div className="absolute -top-1 size-3.5 rounded-full bg-white opacity-0 group-hover:opacity-100 transition"
        style={{ left: `calc(${pct}% - 7px)`, boxShadow: "0 0 10px var(--neon-cyan)" }} />
    </div>
  );
}

function FullscreenPlayer({ onAddToPlaylist }: { onAddToPlaylist: () => void }) {
  const p = usePlayer();
  if (!p.current) return null;
  const fav = storage.isFavorite(p.current.id);
  const pct = p.duration ? (p.currentTime / p.duration) * 100 : 0;

  return (
    <div role="dialog" aria-modal="true" aria-label="Lecteur plein écran"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 backdrop-blur-2xl"
      style={{ background: "color-mix(in oklab, var(--background) 92%, transparent)" }}>
      <button onClick={() => p.setExpanded(false)}
        className="absolute top-5 right-5 p-2 rounded-md hover:bg-[color:var(--neon-pink)]/20" aria-label="Fermer">
        <X className="size-6" />
      </button>
      <div className="w-full max-w-3xl flex flex-col items-center gap-6">
        <div className="size-[min(60vh,400px)] rounded-2xl overflow-hidden box-glow-pink animate-spin-slow">
          <img src={p.current.cover} alt="" className="size-full object-cover" />
        </div>
        <div className="text-center">
          <h2 className="font-display text-3xl md:text-5xl glow-green">{p.current.title}</h2>
          <Link to="/artist/$slug" params={{ slug: p.current.artistSlug }} onClick={() => p.setExpanded(false)}
            className="text-lg text-[color:var(--neon-cyan)] hover:underline">{p.current.artistName}</Link>
          <p className="font-mono text-xs text-muted-foreground mt-1">{p.current.genre} · {formatDuration(p.duration || p.current.duration)}</p>
        </div>
        <div className="w-full flex items-center gap-3">
          <span className="text-xs font-mono w-12 text-right">{formatDuration(p.currentTime)}</span>
          <ProgressBar pct={pct} duration={p.duration} onSeek={p.seek} />
          <span className="text-xs font-mono w-12">{formatDuration(p.duration || p.current.duration)}</span>
        </div>
        <div className="flex items-center gap-3">
          <IconBtn onClick={p.toggleShuffle} active={p.shuffle} label="Aléatoire"><Shuffle className="size-5" /></IconBtn>
          <IconBtn onClick={p.prev} label="Précédent"><SkipBack className="size-7" /></IconBtn>
          <button onClick={p.toggle}
            className="size-16 rounded-full bg-[color:var(--neon-green)] text-[color:var(--background)] flex items-center justify-center hover:scale-105 box-glow-green"
            aria-label={p.playing ? "Pause" : "Lecture"}>
            {p.playing ? <Pause className="size-7" /> : <Play className="size-7 ml-1" />}
          </button>
          <IconBtn onClick={p.next} label="Suivant"><SkipForward className="size-7" /></IconBtn>
          <IconBtn onClick={p.cycleRepeat} active={p.repeatMode > 0} label="Répéter">
            {p.repeatMode === 2 ? <Repeat1 className="size-5" /> : <Repeat className="size-5" />}
          </IconBtn>
        </div>
        <div className="flex items-center gap-3">
          <IconBtn onClick={() => { storage.toggleFavorite(p.current!); p.bumpFav(); }} active={fav} label="Favoris">
            <Heart className={`size-5 ${fav ? "fill-current" : ""}`} />
          </IconBtn>
          <IconBtn onClick={onAddToPlaylist} label="Ajouter à une playlist"><Plus className="size-5" /></IconBtn>
          <div className="flex items-center gap-2 ml-2">
            <button onClick={p.toggleMute} aria-label="Muet" className="text-muted-foreground hover:text-[color:var(--neon-cyan)]">
              {p.muted || p.volume === 0 ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </button>
            <input type="range" min={0} max={1} step={0.01} value={p.muted ? 0 : p.volume}
              onChange={(e) => p.setVolume(parseFloat(e.target.value))}
              aria-label="Volume" className="w-32 accent-[color:var(--neon-cyan)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
