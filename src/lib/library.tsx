/**
 * LibraryProvider — single source of truth for the user's favorites and
 * playlists. Always fetches from the API (MariaDB) when a token is present;
 * never trusts localStorage for cross-user data.
 *
 * - On mount / token change → fetches /api/favorites and /api/playlists.
 * - Mutations call the API then refresh local state.
 * - `clearUserCaches()` wipes any user-scoped localStorage/sessionStorage
 *   blobs at logout to prevent data from leaking between accounts.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import type { Song } from "./types";
import { api, tokens } from "@/api/client";
import { ARTISTS } from "@/data/music";

/** Build (lazy) lookup maps to enrich BDD rows into full catalog Songs. */
let _byId: Map<string, Song> | null = null;
let _byKey: Map<string, Song> | null = null; // `${artistSlug}::${normalizedTitle}`
const normTitle = (s: string) =>
  (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function ensureMaps() {
  if (_byId) return;
  _byId = new Map();
  _byKey = new Map();
  for (const a of ARTISTS) {
    for (const s of a.songs) {
      _byId.set(s.id, s);
      _byKey.set(`${s.artistSlug}::${normTitle(s.title)}`, s);
    }
  }
}
/** Resolve an API row (favorite / playlist_song) to the catalog Song with audioUrl. */
export function resolveCatalogSong(row: {
  songId?: string; song_id?: string;
  songTitle?: string; song_title?: string; title?: string;
  artistSlug?: string; artist_slug?: string;
  artistName?: string; artist_name?: string;
  cover?: string; cover_image?: string;
  genre?: string; duration?: number;
}): Song | null {
  ensureMaps();
  const id = String(row.songId ?? row.song_id ?? "");
  if (id && _byId!.has(id)) return _byId!.get(id)!;
  const slug = row.artistSlug ?? row.artist_slug ?? "";
  const title = row.title ?? row.songTitle ?? row.song_title ?? "";
  const k = `${slug}::${normTitle(title)}`;
  if (_byKey!.has(k)) return _byKey!.get(k)!;
  return null;
}

export type ApiPlaylist = {
  id: number;
  name: string;
  color: string;
  description?: string | null;
  songCount: number;
  songs?: ApiPlaylistSong[];
};

export type ApiPlaylistSong = {
  song_id: string;
  song_title: string;
  artist_name: string;
  artist_slug: string;
  duration: number;
  cover_image: string;
  genre: string;
};

type Ctx = {
  favorites: Song[];
  favoriteIds: Set<string>;
  playlists: ApiPlaylist[];
  loading: boolean;

  isFavorite: (songId: string) => boolean;
  toggleFavorite: (song: Song) => Promise<void>;

  reloadFavorites: () => Promise<void>;
  reloadPlaylists: () => Promise<void>;
  reloadAll: () => Promise<void>;

  createPlaylist: (name: string, color?: string, description?: string) => Promise<ApiPlaylist | null>;
  deletePlaylist: (id: number) => Promise<void>;
  addSongToPlaylist: (id: number, song: Song) => Promise<void>;
  removeSongFromPlaylist: (id: number, songId: string) => Promise<void>;
  getPlaylistWithSongs: (id: number) => Promise<{ playlist: ApiPlaylist; songs: Song[] } | null>;
};

const LibraryCtx = createContext<Ctx | null>(null);

/** Convert API favorite/playlist-song row to the front-end `Song` shape. */
function rowToSong(r: any): Song {
  return {
    id: String(r.songId ?? r.song_id),
    title: r.title ?? r.song_title ?? "",
    artistName: r.artist ?? r.artist_name ?? "",
    artistSlug: r.artistSlug ?? r.artist_slug ?? "",
    duration: Number(r.duration ?? 0),
    cover: r.cover ?? r.cover_image ?? "",
    genre: r.genre ?? "",
    url: "",
    audioUrl: undefined,
  };
}

/** Wipe every cache that could leak data between users on logout/login. */
export function clearUserCaches() {
  if (typeof window === "undefined") return;
  try {
    [
      "sw.favorites", "sw.playlists", "sw.recent",
      "sw.stats", "sw.user", "sw.profile",
    ].forEach(k => localStorage.removeItem(k));
    sessionStorage.removeItem("sw.stats");
  } catch { /* noop */ }
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<ApiPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const lastToken = useRef<string | null>(null);

  const reloadFavorites = useCallback(async () => {
    if (!tokens.access) { setFavorites([]); return; }
    try {
      const rows = await api.listFavorites() as any[];
      setFavorites((rows || []).map(rowToSong));
    } catch { /* keep prev */ }
  }, []);

  const reloadPlaylists = useCallback(async () => {
    if (!tokens.access) { setPlaylists([]); return; }
    try {
      const rows = await api.listPlaylists() as any[];
      setPlaylists((rows || []).map((r) => ({
        id: r.id, name: r.name, color: r.color || "#00FF41",
        description: r.description ?? null,
        songCount: Number(r.songCount ?? 0),
      })));
    } catch { /* keep prev */ }
  }, []);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([reloadFavorites(), reloadPlaylists()]);
    setLoading(false);
  }, [reloadFavorites, reloadPlaylists]);

  // Initial load + react to token changes (login/logout in this tab or other tabs)
  useEffect(() => {
    const tick = () => {
      const t = tokens.access;
      if (t !== lastToken.current) {
        lastToken.current = t;
        if (t) reloadAll();
        else { setFavorites([]); setPlaylists([]); }
      }
    };
    tick();
    const id = window.setInterval(tick, 1500);
    window.addEventListener("storage", tick);
    return () => { window.clearInterval(id); window.removeEventListener("storage", tick); };
  }, [reloadAll]);

  const favoriteIds = useMemo(() => new Set(favorites.map(f => f.id)), [favorites]);

  const isFavorite = useCallback((songId: string) => favoriteIds.has(songId), [favoriteIds]);

  const toggleFavorite = useCallback(async (song: Song) => {
    if (!tokens.access) return;
    const exists = favoriteIds.has(song.id);
    // optimistic
    setFavorites(prev => exists ? prev.filter(s => s.id !== song.id) : [song, ...prev]);
    try {
      if (exists) await api.removeFavorite(song.id);
      else await api.addFavorite(song.id, {
        songTitle: song.title, artistName: song.artistName, artistSlug: song.artistSlug,
        duration: song.duration, cover: song.cover, genre: song.genre,
      });
    } catch {
      // rollback
      await reloadFavorites();
    }
  }, [favoriteIds, reloadFavorites]);

  const createPlaylist = useCallback(async (name: string, color = "#00FF41", description = "") => {
    if (!tokens.access) return null;
    try {
      const pl = await api.createPlaylist({ name, color, description }) as any;
      const norm: ApiPlaylist = { id: pl.id, name: pl.name, color: pl.color || color, description, songCount: 0 };
      setPlaylists(prev => [norm, ...prev]);
      return norm;
    } catch { return null; }
  }, []);

  const deletePlaylist = useCallback(async (id: number) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
    try { await api.deletePlaylist(id); } catch { await reloadPlaylists(); }
  }, [reloadPlaylists]);

  const addSongToPlaylist = useCallback(async (id: number, song: Song) => {
    try {
      await api.addSongToPlaylist(id, {
        songId: song.id, songTitle: song.title, artistName: song.artistName,
        artistSlug: song.artistSlug, duration: song.duration, cover: song.cover, genre: song.genre,
      });
      setPlaylists(prev => prev.map(p => p.id === id ? { ...p, songCount: p.songCount + 1 } : p));
    } catch { await reloadPlaylists(); }
  }, [reloadPlaylists]);

  const removeSongFromPlaylist = useCallback(async (id: number, songId: string) => {
    try {
      await api.removeSongFromPlaylist(id, songId);
      setPlaylists(prev => prev.map(p => p.id === id ? { ...p, songCount: Math.max(0, p.songCount - 1) } : p));
    } catch { await reloadPlaylists(); }
  }, [reloadPlaylists]);

  const getPlaylistWithSongs = useCallback(async (id: number) => {
    try {
      const p = await api.getPlaylist(id) as any;
      const songs: Song[] = (p.songs || []).map(rowToSong);
      const playlist: ApiPlaylist = {
        id: p.id, name: p.name, color: p.color || "#00FF41",
        description: p.description ?? null, songCount: songs.length,
      };
      return { playlist, songs };
    } catch { return null; }
  }, []);

  const value: Ctx = {
    favorites, favoriteIds, playlists, loading,
    isFavorite, toggleFavorite,
    reloadFavorites, reloadPlaylists, reloadAll,
    createPlaylist, deletePlaylist, addSongToPlaylist, removeSongFromPlaylist,
    getPlaylistWithSongs,
  };

  return <LibraryCtx.Provider value={value}>{children}</LibraryCtx.Provider>;
}

export function useLibrary() {
  const c = useContext(LibraryCtx);
  if (!c) throw new Error("useLibrary must be used within LibraryProvider");
  return c;
}
