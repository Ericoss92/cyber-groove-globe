import type { Song } from "./types";

const KEYS = {
  playlists: "sw.playlists",
  favorites: "sw.favorites",
  recent: "sw.recent",
  settings: "sw.settings",
};

export type Playlist = {
  id: string;
  name: string;
  description?: string;
  color: string;
  songs: Song[];
  createdAt: string;
};

export type Settings = {
  volume: number;
  repeatMode: 0 | 1 | 2; // off | all | one
  shuffle: boolean;
};

const isBrowser = typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (!isBrowser) return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export const storage = {
  // playlists
  getPlaylists: (): Playlist[] => read<Playlist[]>(KEYS.playlists, []),
  setPlaylists: (p: Playlist[]) => write(KEYS.playlists, p),
  createPlaylist: (name: string, color = "#00FF41", description = ""): Playlist => {
    const list = storage.getPlaylists();
    const pl: Playlist = {
      id: crypto.randomUUID(),
      name, description, color,
      songs: [],
      createdAt: new Date().toISOString(),
    };
    list.unshift(pl);
    storage.setPlaylists(list);
    return pl;
  },
  deletePlaylist: (id: string) => {
    storage.setPlaylists(storage.getPlaylists().filter(p => p.id !== id));
  },
  addToPlaylist: (id: string, song: Song) => {
    const list = storage.getPlaylists();
    const p = list.find(x => x.id === id);
    if (!p) return;
    if (!p.songs.find(s => s.id === song.id)) p.songs.push(song);
    storage.setPlaylists(list);
  },
  removeFromPlaylist: (id: string, songId: string) => {
    const list = storage.getPlaylists();
    const p = list.find(x => x.id === id);
    if (!p) return;
    p.songs = p.songs.filter(s => s.id !== songId);
    storage.setPlaylists(list);
  },

  // favorites
  getFavorites: (): Song[] => read<Song[]>(KEYS.favorites, []),
  isFavorite: (songId: string) => storage.getFavorites().some(s => s.id === songId),
  toggleFavorite: (song: Song) => {
    const list = storage.getFavorites();
    const idx = list.findIndex(s => s.id === song.id);
    if (idx >= 0) list.splice(idx, 1);
    else list.unshift(song);
    write(KEYS.favorites, list);
    return idx < 0;
  },

  // recent
  getRecent: (): Song[] => read<Song[]>(KEYS.recent, []),
  addRecent: (song: Song) => {
    const list = storage.getRecent().filter(s => s.id !== song.id);
    list.unshift(song);
    write(KEYS.recent, list.slice(0, 50));
  },

  // settings
  getSettings: (): Settings => read<Settings>(KEYS.settings, { volume: 0.75, repeatMode: 0, shuffle: false }),
  setSettings: (s: Settings) => write(KEYS.settings, s),
};
