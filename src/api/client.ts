/**
 * SOUNDWAVE — API client (browser)
 * - Reads VITE_API_URL (default http://localhost:3001)
 * - Stores access + refresh tokens in localStorage
 * - Auto-refreshes on 401
 */

const BASE = "";

const KEYS = {
  access: "sw.token",
  refresh: "sw.refresh",
  user: "sw.user",
};

export type ApiUser = {
  id: number;
  username: string;
  email?: string | null;
  authorized: boolean;
  admin: boolean;
  createdAt?: string;
  lastLogin?: string | null;
};

const isBrowser = typeof window !== "undefined";

export const tokens = {
  get access() { return isBrowser ? localStorage.getItem(KEYS.access) : null; },
  get refresh() { return isBrowser ? localStorage.getItem(KEYS.refresh) : null; },
  set(access: string | null, refresh: string | null) {
    if (!isBrowser) return;
    if (access) localStorage.setItem(KEYS.access, access); else localStorage.removeItem(KEYS.access);
    if (refresh) localStorage.setItem(KEYS.refresh, refresh); else localStorage.removeItem(KEYS.refresh);
  },
  clear() {
    if (!isBrowser) return;
    localStorage.removeItem(KEYS.access);
    localStorage.removeItem(KEYS.refresh);
    localStorage.removeItem(KEYS.user);
  },
};

export const cachedUser = {
  get(): ApiUser | null {
    if (!isBrowser) return null;
    try { return JSON.parse(localStorage.getItem(KEYS.user) || "null"); } catch { return null; }
  },
  set(u: ApiUser | null) {
    if (!isBrowser) return;
    if (u) localStorage.setItem(KEYS.user, JSON.stringify(u));
    else localStorage.removeItem(KEYS.user);
  },
};

async function tryRefresh(): Promise<boolean> {
  const r = tokens.refresh;
  if (!r) return false;
  try {
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: r }),
    });
    if (!res.ok) return false;
    const j = await res.json();
    tokens.set(j.token, j.refreshToken);
    return true;
  } catch { return false; }
}

async function request<T = any>(method: string, path: string, body?: any, retry = true): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const t = tokens.access;
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && retry && tokens.refresh) {
    if (await tryRefresh()) return request<T>(method, path, body, false);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error || `HTTP ${res.status}`), { status: res.status, data: err });
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // ---------- AUTH ----------
  async register(username: string, password: string) {
    return request("POST", "/api/auth/register", { username, password });
  },
  async login(username: string, password: string) {
    const j = await request<{ token: string; refreshToken: string; user: ApiUser }>(
      "POST", "/api/auth/login", { username, password },
    );
    tokens.set(j.token, j.refreshToken);
    cachedUser.set(j.user);
    return j;
  },
  async logout() {
    try { await request("POST", "/api/auth/logout"); } catch { /* ignore */ }
    tokens.clear();
  },
  async me() {
    const u = await request<ApiUser>("GET", "/api/auth/me");
    cachedUser.set(u);
    return u;
  },

  // ---------- USER ----------
  getProfile: () => request("GET", "/api/user/profile"),
  getPreferences: () => request("GET", "/api/user/preferences"),
  updatePreferences: (prefs: any) => request("PUT", "/api/user/preferences", prefs),
  getStats: () => request("GET", "/api/user/stats"),

  // ---------- PLAYLISTS ----------
  listPlaylists: () => request("GET", "/api/playlists"),
  createPlaylist: (data: { name: string; description?: string; color?: string }) =>
    request("POST", "/api/playlists", data),
  getPlaylist: (id: number) => request("GET", `/api/playlists/${id}`),
  updatePlaylist: (id: number, data: any) => request("PUT", `/api/playlists/${id}`, data),
  deletePlaylist: (id: number) => request("DELETE", `/api/playlists/${id}`),
  addSongToPlaylist: (id: number, song: any) =>
    request("POST", `/api/playlists/${id}/songs`, song),
  removeSongFromPlaylist: (id: number, songId: string) =>
    request("DELETE", `/api/playlists/${id}/songs/${encodeURIComponent(songId)}`),

  // ---------- FAVORITES ----------
  listFavorites: () => request("GET", "/api/favorites"),
  isFavorite: (songId: string) =>
    request<{ isFavorite: boolean }>("GET", `/api/favorites/${encodeURIComponent(songId)}`),
  addFavorite: (songId: string, song: any) =>
    request("POST", `/api/favorites/${encodeURIComponent(songId)}`, song),
  removeFavorite: (songId: string) =>
    request("DELETE", `/api/favorites/${encodeURIComponent(songId)}`),

  // ---------- HISTORY ----------
  logPlay: (data: any) => request("POST", "/api/history/log", data),
  history: (limit = 50, offset = 0) =>
    request("GET", `/api/history?limit=${limit}&offset=${offset}`),
  topArtists: (period: "day" | "week" | "month" | "year" | "all" = "all", limit = 10) =>
    request("GET", `/api/history/top-artists?period=${period}&limit=${limit}`),
  topGenres: (period: "day" | "week" | "month" | "year" | "all" = "all", country?: string, limit = 10) => {
    const q = new URLSearchParams({ period, limit: String(limit) });
    if (country) q.set("country", country);
    return request("GET", `/api/history/top-genres?${q.toString()}`);
  },

  // ---------- ARTIST METADATA (public read) ----------
  getArtistMeta: (slug: string) =>
    request<any>("GET", `/api/artists/${encodeURIComponent(slug)}`),

  // ---------- ADMIN ----------
  adminUsers: (status: "pending" | "authorized" | "all" = "all") =>
    request("GET", `/api/admin/users?status=${status}`),
  adminAuthorize: (userId: number, approved: boolean, reason?: string) =>
    request("PUT", `/api/admin/users/${userId}/authorize`, { approved, reason }),
  adminDeleteUser: (userId: number, reason?: string) =>
    request("DELETE", `/api/admin/users/${userId}`, { reason }),
  adminStats: () => request("GET", `/api/admin/stats`),
  adminLogs: (limit = 50) => request("GET", `/api/admin/logs?limit=${limit}`),

  // ---------- ADMIN: ARTIST METADATA ----------
  adminListArtists: () => request<any[]>("GET", `/api/admin/artists`),
  adminGetArtist: (slug: string) =>
    request<any>("GET", `/api/admin/artists/${encodeURIComponent(slug)}`),
  adminUpdateArtist: (slug: string, data: any) =>
    request("PUT", `/api/admin/artists/${encodeURIComponent(slug)}`, data),
};

export const API_URL = BASE;
