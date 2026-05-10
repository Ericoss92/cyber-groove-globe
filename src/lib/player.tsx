import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Song } from "./types";
import { storage } from "./storage";

type Ctx = {
  current: Song | null;
  queue: Song[];
  index: number;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  repeatMode: 0 | 1 | 2;
  shuffle: boolean;

  playQueue: (songs: Song[], startIndex?: number) => void;
  playSong: (song: Song) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (sec: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;

  expanded: boolean;
  setExpanded: (b: boolean) => void;

  favTick: number; // bump to refresh UI consumers
  bumpFav: () => void;
};

const PlayerCtx = createContext<Ctx | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (typeof window !== "undefined" && !audioRef.current) {
    audioRef.current = new Audio();
    audioRef.current.preload = "metadata";
  }

  const [queue, setQueue] = useState<Song[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.75);
  const [muted, setMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState<0 | 1 | 2>(0);
  const [shuffle, setShuffle] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [favTick, setFavTick] = useState(0);
  const bumpFav = useCallback(() => setFavTick(t => t + 1), []);

  const current = queue[index] ?? null;

  // Hydrate settings
  useEffect(() => {
    const s = storage.getSettings();
    setVolumeState(s.volume);
    setRepeatMode(s.repeatMode);
    setShuffle(s.shuffle);
    if (audioRef.current) audioRef.current.volume = s.volume;
  }, []);

  // Persist settings
  useEffect(() => {
    storage.setSettings({ volume, repeatMode, shuffle });
  }, [volume, repeatMode, shuffle]);

  // Audio events
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    const onTime = () => setCurrentTime(a.currentTime);
    const onMeta = () => setDuration(a.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => handleEnded();
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
    };
  });

  // Load src on track change
  useEffect(() => {
    const a = audioRef.current; if (!a || !current) return;
    if (a.src !== current.url) {
      a.src = current.url;
      a.play().catch(() => setPlaying(false));
      storage.addRecent(current);
    }
  }, [current]);

  function handleEnded() {
    if (repeatMode === 2) {
      const a = audioRef.current; if (a) { a.currentTime = 0; a.play(); }
      return;
    }
    nextInternal();
  }

  const nextInternal = useCallback(() => {
    if (queue.length === 0) return;
    let n: number;
    if (shuffle) {
      n = Math.floor(Math.random() * queue.length);
    } else {
      n = index + 1;
      if (n >= queue.length) {
        if (repeatMode === 1) n = 0;
        else { setPlaying(false); audioRef.current?.pause(); return; }
      }
    }
    setIndex(n);
  }, [queue, index, shuffle, repeatMode]);

  const value: Ctx = useMemo(() => ({
    current, queue, index, playing, currentTime, duration, volume, muted, repeatMode, shuffle,
    expanded, setExpanded,
    favTick, bumpFav,
    playQueue: (songs, startIndex = 0) => {
      if (!songs.length) return;
      setQueue(songs);
      setIndex(startIndex);
      setPlaying(true);
    },
    playSong: (song) => {
      const inQueue = queue.findIndex(s => s.id === song.id);
      if (inQueue >= 0) { setIndex(inQueue); setPlaying(true); audioRef.current?.play(); return; }
      setQueue([song]); setIndex(0); setPlaying(true);
    },
    toggle: () => {
      const a = audioRef.current; if (!a) return;
      if (a.paused) a.play(); else a.pause();
    },
    next: nextInternal,
    prev: () => {
      const a = audioRef.current;
      if (a && a.currentTime > 3) { a.currentTime = 0; return; }
      setIndex(i => Math.max(0, i - 1));
    },
    seek: (sec) => { const a = audioRef.current; if (a) a.currentTime = sec; },
    setVolume: (v) => {
      setVolumeState(v); setMuted(v === 0);
      const a = audioRef.current; if (a) { a.volume = v; a.muted = v === 0; }
    },
    toggleMute: () => {
      const a = audioRef.current; if (!a) return;
      const m = !muted; setMuted(m); a.muted = m;
    },
    cycleRepeat: () => setRepeatMode(r => ((r + 1) % 3) as 0 | 1 | 2),
    toggleShuffle: () => setShuffle(s => !s),
  }), [current, queue, index, playing, currentTime, duration, volume, muted, repeatMode, shuffle, expanded, favTick, nextInternal, bumpFav]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); value.toggle(); }
      else if (e.code === "ArrowRight") value.next();
      else if (e.code === "ArrowLeft") value.prev();
      else if (e.code === "ArrowUp") { e.preventDefault(); value.setVolume(Math.min(1, volume + 0.05)); }
      else if (e.code === "ArrowDown") { e.preventDefault(); value.setVolume(Math.max(0, volume - 0.05)); }
      else if (e.key.toLowerCase() === "r") value.cycleRepeat();
      else if (e.key.toLowerCase() === "s") value.toggleShuffle();
      else if (e.key === "Escape") value.setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [value, volume]);

  return <PlayerCtx.Provider value={value}>{children}</PlayerCtx.Provider>;
}

export function usePlayer() {
  const c = useContext(PlayerCtx);
  if (!c) throw new Error("usePlayer must be used within PlayerProvider");
  return c;
}
