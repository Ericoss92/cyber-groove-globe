import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Song } from "./types";
import { storage } from "./storage";
import { artistBySlug } from "@/data/music";
import { tokens } from "@/api/client";

/**
 * Listening-session tracker.
 *
 * We do NOT send a 0-duration log at play start. Instead we accumulate the
 * real wall-clock time the audio element was actively playing and POST a
 * single /api/history/log when the session ends (track change, pause-then-
 * other-track, ended, or beforeunload). This keeps `duration_played_seconds`,
 * `played_percentage` and `completed` accurate and avoids the bug where every
 * play created a row with `duration_played_seconds = 0`.
 *
 * Sessions shorter than 5s are dropped so quick skips do not pollute history.
 */
type PlaySession = {
  song: Song;
  accumulated: number;            // seconds actually played
  lastResume: number | null;      // ms epoch when playback last (re)started
};

const COMPLETION_THRESHOLD = 80; // percent

function computeFinal(s: PlaySession) {
  let secs = s.accumulated;
  if (s.lastResume) secs += (Date.now() - s.lastResume) / 1000;
  return Math.round(secs);
}

function buildLogPayload(s: PlaySession, opts?: { completed?: boolean }) {
  const secs = computeFinal(s);
  if (secs < 5) return null;
  const dur = s.song.duration || 0;
  const pct = dur ? Math.min(100, Math.round((secs / dur) * 10000) / 100) : 0;
  const completed = opts?.completed ?? pct >= COMPLETION_THRESHOLD;
  const a = artistBySlug(s.song.artistSlug);
  return {
    songId: s.song.id,
    songTitle: s.song.title,
    artistName: s.song.artistName,
    artistSlug: s.song.artistSlug,
    artistCountry: a?.country,
    artistContinent: a?.continent,
    genre: s.song.genre,
    durationPlayedSeconds: secs,
    completed,
    playedPercentage: pct,
  };
}

function flushSessionToServer(session: PlaySession, opts?: { completed?: boolean; beacon?: boolean }) {
  const payload = buildLogPayload(session, opts);
  if (!payload) return;
  const t = tokens.access;
  if (!t) return;
  if (opts?.beacon) {
    // beforeunload path — use keepalive fetch (sendBeacon can't set Authorization)
    try {
      fetch("/api/history/log", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch { /* noop */ }
    return;
  }
  import("@/api/client").then(({ api }) => { api.logPlay(payload).catch(() => {}); }).catch(() => {});
}

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

  favTick: number;
  bumpFav: () => void;
};

const PlayerCtx = createContext<Ctx | null>(null);

/**
 * PlayerProvider — Web Audio engine with two HTMLAudioElement nodes
 * for gapless / crossfade transitions.
 *
 * Strategy:
 *  - audioA / audioB are alternated. `activeKey` points at the current one.
 *  - GainNodes per element allow smooth fade in / fade out.
 *  - When the active track passes (duration - crossfade) seconds and
 *    crossfade > 0, we start the next track on the inactive element and
 *    cross-ramp gains over the configured duration.
 */
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  // Two audio elements + their gain nodes
  const audioA = useRef<HTMLAudioElement | null>(null);
  const audioB = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainA = useRef<GainNode | null>(null);
  const gainB = useRef<GainNode | null>(null);
  const masterGain = useRef<GainNode | null>(null);
  const activeKey = useRef<"A" | "B">("A");
  const crossfading = useRef(false);
  // Tracks the *resolved* src last loaded on each element. Used to avoid
  // reloading (and thus restarting) a song that's already playing after a
  // crossfade swap — without this, the `current` effect compares
  // `a.src` (absolute, resolved by the browser) to the raw audioUrl
  // (often a relative path), they differ, and the song restarts at 0.
  const loadedSrc = useRef<{ A: string | null; B: string | null }>({ A: null, B: null });
  // Active listening session (the song currently being timed). Flushed when
  // the user switches track, the track ends, or the page unloads.
  const session = useRef<PlaySession | null>(null);

  const startSession = useCallback((song: Song) => {
    // flush any previous session (track-change) before starting a new one
    if (session.current && session.current.song.id !== song.id) {
      flushSessionToServer(session.current);
    }
    session.current = { song, accumulated: 0, lastResume: Date.now() };
  }, []);
  const pauseSession = useCallback(() => {
    const s = session.current;
    if (!s || !s.lastResume) return;
    s.accumulated += (Date.now() - s.lastResume) / 1000;
    s.lastResume = null;
  }, []);
  const resumeSession = useCallback(() => {
    const s = session.current;
    if (!s) return;
    if (!s.lastResume) s.lastResume = Date.now();
  }, []);
  const flushSession = useCallback((opts?: { completed?: boolean; beacon?: boolean }) => {
    const s = session.current;
    if (!s) return;
    flushSessionToServer(s, opts);
    session.current = null;
  }, []);

  if (typeof window !== "undefined" && !audioA.current) {
    audioA.current = new Audio();
    audioB.current = new Audio();
    audioA.current.preload = "metadata";
    audioB.current.preload = "metadata";
    audioA.current.crossOrigin = "anonymous";
    audioB.current.crossOrigin = "anonymous";
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
  const [crossfade, setCrossfade] = useState(3);
  const bumpFav = useCallback(() => setFavTick(t => t + 1), []);

  const current = queue[index] ?? null;
  const getActive = () => (activeKey.current === "A" ? audioA.current! : audioB.current!);
  const getInactive = () => (activeKey.current === "A" ? audioB.current! : audioA.current!);
  const getActiveGain = () => (activeKey.current === "A" ? gainA.current : gainB.current);
  const getInactiveGain = () => (activeKey.current === "A" ? gainB.current : gainA.current);

  // Lazy-init Web Audio graph (after a user gesture browsers allow ctx)
  const ensureAudioGraph = useCallback(() => {
    if (typeof window === "undefined") return;
    if (ctxRef.current) return;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      ctxRef.current = ctx;
      masterGain.current = ctx.createGain();
      masterGain.current.gain.value = volume;
      masterGain.current.connect(ctx.destination);
      const sA = ctx.createMediaElementSource(audioA.current!);
      const sB = ctx.createMediaElementSource(audioB.current!);
      gainA.current = ctx.createGain();
      gainB.current = ctx.createGain();
      gainA.current.gain.value = 1;
      gainB.current.gain.value = 0;
      sA.connect(gainA.current).connect(masterGain.current);
      sB.connect(gainB.current).connect(masterGain.current);
    } catch (e) {
      console.warn("WebAudio unavailable, falling back to plain audio", e);
    }
  }, [volume]);

  // Hydrate settings (volume, repeat, shuffle, crossfade)
  useEffect(() => {
    const s = storage.getSettings();
    setVolumeState(s.volume);
    setRepeatMode(s.repeatMode);
    setShuffle(s.shuffle);
    setCrossfade(s.crossfade);
    if (audioA.current) audioA.current.volume = s.volume;
    if (audioB.current) audioB.current.volume = s.volume;
    // Watch for cross-tab settings changes
    const onStorage = () => {
      const ns = storage.getSettings();
      setCrossfade(ns.crossfade);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Persist settings
  useEffect(() => {
    storage.setSettings({ volume, repeatMode, shuffle });
    if (masterGain.current) masterGain.current.gain.value = muted ? 0 : volume;
    else {
      if (audioA.current) audioA.current.volume = muted ? 0 : volume;
      if (audioB.current) audioB.current.volume = muted ? 0 : volume;
    }
  }, [volume, repeatMode, shuffle, muted]);

  // Flush in-flight listening session before the page unloads. Uses
  // keepalive fetch so the Authorization header is preserved.
  useEffect(() => {
    const onUnload = () => { flushSession({ beacon: true }); };
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onUnload);
    };
  }, [flushSession]);

  // Audio events on active element
  useEffect(() => {
    const handler = () => {
      const a = getActive();
      setCurrentTime(a.currentTime);
      setDuration(a.duration || 0);
      // Crossfade trigger
      if (
        crossfade > 0 &&
        !crossfading.current &&
        a.duration &&
        a.currentTime >= a.duration - crossfade &&
        queue.length > 1 &&
        repeatMode !== 2
      ) {
        startCrossfade();
      }
    };
    const onPlay = () => { setPlaying(true); resumeSession(); };
    const onPause = () => { if (!crossfading.current) { setPlaying(false); pauseSession(); } };
    const onEnded = () => {
      if (crossfading.current) return;
      // Track played to natural end → completed = true
      flushSession({ completed: true });
      handleEnded();
    };

    [audioA.current, audioB.current].forEach(a => {
      if (!a) return;
      a.addEventListener("timeupdate", handler);
      a.addEventListener("loadedmetadata", handler);
      a.addEventListener("play", onPlay);
      a.addEventListener("pause", onPause);
      a.addEventListener("ended", onEnded);
    });
    return () => {
      [audioA.current, audioB.current].forEach(a => {
        if (!a) return;
        a.removeEventListener("timeupdate", handler);
        a.removeEventListener("loadedmetadata", handler);
        a.removeEventListener("play", onPlay);
        a.removeEventListener("pause", onPause);
        a.removeEventListener("ended", onEnded);
      });
    };
  });

  // Load src on track change (without crossfade)
  useEffect(() => {
    if (!current) return;
    if (crossfading.current) return; // crossfade path manages loading itself
    ensureAudioGraph();
    const a = getActive();
    const primary = current.audioUrl || current.url;
    // Guard: no playable URL (e.g. BDD-only row that couldn't be resolved to
    // the local catalog). Don't reuse the previously loaded src — that's the
    // bug where favorites/playlists "played the last song".
    if (!primary) {
      console.error(`[player] no audioUrl for "${current.title}" (${current.id})`);
      try { a.pause(); } catch {}
      setPlaying(false);
      return;
    }
    const fallback = current.audioUrl ? current.url : null;
    const key = activeKey.current;
    if (loadedSrc.current[key] !== primary) {
      const onErr = () => {
        if (fallback && loadedSrc.current[key] !== fallback) {
          console.warn(`[player] ${primary} failed, falling back to ${fallback}`);
          loadedSrc.current[key] = fallback;
          a.src = fallback;
          a.play().catch(() => setPlaying(false));
        } else {
          console.error(`[player] cannot play ${a.src}`);
          setPlaying(false);
        }
        a.removeEventListener("error", onErr);
      };
      a.addEventListener("error", onErr, { once: true });
      loadedSrc.current[key] = primary;
      a.src = primary;
      a.play().catch((e) => {
        console.warn("[player] play() rejected", e);
        setPlaying(false);
      });
      storage.addRecent(current);
      startSession(current);
    }
  }, [current, ensureAudioGraph, startSession]);


  function pickNextIndex(): number | null {
    if (queue.length === 0) return null;
    if (shuffle) return Math.floor(Math.random() * queue.length);
    let n = index + 1;
    if (n >= queue.length) {
      if (repeatMode === 1) return 0;
      return null;
    }
    return n;
  }

  function startCrossfade() {
    const next = pickNextIndex();
    if (next === null) return;
    const ctx = ctxRef.current;
    const gA = getActiveGain();
    const gB = getInactiveGain();
    const inactive = getInactive();
    if (!ctx || !gA || !gB) {
      // No WebAudio: just hard-skip
      setIndex(next);
      return;
    }
    crossfading.current = true;
    const nextSong = queue[next];
    const inactiveKey: "A" | "B" = activeKey.current === "A" ? "B" : "A";
    const nextSrc = nextSong.audioUrl || nextSong.url;
    loadedSrc.current[inactiveKey] = nextSrc;
    inactive.src = nextSrc;
    inactive.currentTime = 0;
    inactive.play().catch(() => {});
    storage.addRecent(nextSong);
    // The old song reached crossfade window → treat as completed and flush,
    // then start tracking the new one.
    flushSession({ completed: true });
    startSession(nextSong);




    const t = ctx.currentTime;
    gA.gain.cancelScheduledValues(t);
    gB.gain.cancelScheduledValues(t);
    gA.gain.setValueAtTime(gA.gain.value, t);
    gB.gain.setValueAtTime(0, t);
    gA.gain.linearRampToValueAtTime(0, t + crossfade);
    gB.gain.linearRampToValueAtTime(1, t + crossfade);

    window.setTimeout(() => {
      const oldActive = getActive();
      try { oldActive.pause(); oldActive.currentTime = 0; } catch {}
      activeKey.current = activeKey.current === "A" ? "B" : "A";
      crossfading.current = false;
      setIndex(next);
    }, crossfade * 1000);
  }

  function handleEnded() {
    if (repeatMode === 2) {
      const a = getActive(); if (a) { a.currentTime = 0; a.play(); }
      return;
    }
    const n = pickNextIndex();
    if (n === null) { setPlaying(false); return; }
    setIndex(n);
  }

  const value: Ctx = useMemo(() => ({
    current, queue, index, playing, currentTime, duration, volume, muted, repeatMode, shuffle,
    expanded, setExpanded,
    favTick, bumpFav,
    playQueue: (songs, startIndex = 0) => {
      if (!songs.length) return;
      ensureAudioGraph();
      setQueue(songs);
      setIndex(startIndex);
      setPlaying(true);
    },
    playSong: (song) => {
      ensureAudioGraph();
      const inQueue = queue.findIndex(s => s.id === song.id);
      if (inQueue >= 0) { setIndex(inQueue); setPlaying(true); getActive().play(); return; }
      setQueue([song]); setIndex(0); setPlaying(true);
    },
    toggle: () => {
      ensureAudioGraph();
      const a = getActive(); if (!a) return;
      if (a.paused) { ctxRef.current?.resume(); a.play(); } else a.pause();
    },
    next: () => {
      const n = pickNextIndex();
      if (n === null) return;
      setIndex(n);
    },
    prev: () => {
      const a = getActive();
      if (a && a.currentTime > 3) { a.currentTime = 0; return; }
      setIndex(i => Math.max(0, i - 1));
    },
    seek: (sec) => { const a = getActive(); if (a) a.currentTime = sec; },
    setVolume: (v) => {
      setVolumeState(v); setMuted(v === 0);
      if (masterGain.current) masterGain.current.gain.value = v;
      else { if (audioA.current) audioA.current.volume = v; if (audioB.current) audioB.current.volume = v; }
    },
    toggleMute: () => {
      const m = !muted; setMuted(m);
      if (masterGain.current) masterGain.current.gain.value = m ? 0 : volume;
      else { if (audioA.current) audioA.current.muted = m; if (audioB.current) audioB.current.muted = m; }
    },
    cycleRepeat: () => setRepeatMode(r => ((r + 1) % 3) as 0 | 1 | 2),
    toggleShuffle: () => setShuffle(s => !s),
  }), [current, queue, index, playing, currentTime, duration, volume, muted, repeatMode, shuffle, expanded, favTick, bumpFav, ensureAudioGraph]);

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
