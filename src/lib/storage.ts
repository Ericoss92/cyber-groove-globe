import type { Song } from "./types";

const KEYS = {
  playlists: "sw.playlists",
  favorites: "sw.favorites",
  recent: "sw.recent",
  settings: "sw.settings",
  auth: "sw.auth",
  users: "sw.users",
};

export type Playlist = {
  id: string;
  name: string;
  description?: string;
  color: string;
  songs: Song[];
  createdAt: string;
};

export type Theme = "cyberpunk" | "midnight" | "monochrome";

export type Settings = {
  volume: number;
  repeatMode: 0 | 1 | 2; // off | all | one
  shuffle: boolean;
  // audio engine
  gapless: boolean;
  crossfade: number; // 0..10 seconds
  // visual
  theme: Theme;
  neonIntensity: number; // 0..1
  // performance
  lowPerf: boolean;
};

export type AuthUser = {
  username: string;
  passwordHash: string; // weak local-only hash
  authorized: boolean;
  createdAt: string;
};

export type AuthState = { username: string | null };

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

const DEFAULT_SETTINGS: Settings = {
  volume: 0.75,
  repeatMode: 0,
  shuffle: false,
  gapless: true,
  crossfade: 3,
  theme: "cyberpunk",
  neonIntensity: 1,
  lowPerf: false,
};

// extremely weak hash — local-only, NOT real security (just obfuscation)
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
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
  getSettings: (): Settings => ({ ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEYS.settings, {}) }),
  setSettings: (s: Partial<Settings>) => write(KEYS.settings, { ...storage.getSettings(), ...s }),

  // ----- Auth (Gatekeeper) -----
  getUsers: (): AuthUser[] => read<AuthUser[]>(KEYS.users, []),
  setUsers: (u: AuthUser[]) => write(KEYS.users, u),
  getAuth: (): AuthState => read<AuthState>(KEYS.auth, { username: null }),
  setAuth: (a: AuthState) => write(KEYS.auth, a),
  currentUser: (): AuthUser | null => {
    const a = storage.getAuth();
    if (!a.username) return null;
    return storage.getUsers().find(u => u.username === a.username) ?? null;
  },
  register: (username: string, password: string): { ok: true } | { ok: false; error: string } => {
    const u = username.trim();
    if (u.length < 3) return { ok: false, error: "Identifiant trop court (3 caractères min)." };
    if (password.length < 6) return { ok: false, error: "Mot de passe trop court (6 caractères min)." };
    const users = storage.getUsers();
    if (users.find(x => x.username === u)) return { ok: false, error: "Cet identifiant est déjà pris." };
    users.push({ username: u, passwordHash: hash(password), authorized: false, createdAt: new Date().toISOString() });
    storage.setUsers(users);
    storage.setAuth({ username: u });
    return { ok: true };
  },
  login: (username: string, password: string): { ok: true } | { ok: false; error: string } => {
    const u = storage.getUsers().find(x => x.username === username.trim());
    if (!u || u.passwordHash !== hash(password)) return { ok: false, error: "Identifiant ou mot de passe incorrect." };
    storage.setAuth({ username: u.username });
    return { ok: true };
  },
  logout: () => storage.setAuth({ username: null }),
  // Admin helper — would normally live in a DB dashboard.
  setAuthorized: (username: string, authorized: boolean) => {
    const users = storage.getUsers();
    const u = users.find(x => x.username === username);
    if (!u) return;
    u.authorized = authorized;
    storage.setUsers(users);
  },
};
