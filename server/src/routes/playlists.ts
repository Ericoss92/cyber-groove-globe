import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { exec, query, queryOne } from "../database/connection.js";

export const playlistRouter = Router();

const playlistBody = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const songBody = z.object({
  songId: z.string().min(1).max(255),
  songTitle: z.string().max(255).optional(),
  artistName: z.string().max(255).optional(),
  artistSlug: z.string().max(255).optional(),
  duration: z.number().int().min(0).optional(),
  cover: z.string().max(500).optional(),
  genre: z.string().max(100).optional(),
});

playlistRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT p.id, p.name, p.color, p.description, p.created_at,
              (SELECT COUNT(*) FROM playlist_songs ps WHERE ps.playlist_id = p.id) AS songCount
         FROM playlists p WHERE p.user_id = ? ORDER BY p.created_at DESC`,
      [req.user!.sub],
    );
    res.json(rows);
  } catch (e) { next(e); }
});

playlistRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const data = playlistBody.parse(req.body);
    const r = await exec(
      `INSERT INTO playlists (user_id, name, description, color) VALUES (?, ?, ?, ?)`,
      [req.user!.sub, data.name, data.description ?? null, data.color ?? "#00FF41"],
    );
    res.status(201).json({ id: r.insertId, name: data.name, color: data.color ?? "#00FF41", songs: [] });
  } catch (e) { next(e); }
});

async function ensureOwnPlaylist(userId: number, id: number) {
  const p = await queryOne<any>(`SELECT id FROM playlists WHERE id = ? AND user_id = ?`, [id, userId]);
  return !!p;
}

playlistRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const p = await queryOne<any>(`SELECT * FROM playlists WHERE id = ? AND user_id = ?`, [id, req.user!.sub]);
    if (!p) return res.status(404).json({ error: "Playlist introuvable" });
    const songs = await query(`SELECT * FROM playlist_songs WHERE playlist_id = ? ORDER BY added_at ASC`, [id]);
    res.json({ ...p, songs });
  } catch (e) { next(e); }
});

playlistRouter.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!(await ensureOwnPlaylist(req.user!.sub, id))) return res.status(404).json({ error: "Introuvable" });
    const data = playlistBody.partial().parse(req.body);
    const fields = Object.keys(data);
    if (!fields.length) return res.json({ success: true });
    const set = fields.map((f) => `${f} = ?`).join(", ");
    const values = fields.map((f) => (data as any)[f]);
    await exec(`UPDATE playlists SET ${set} WHERE id = ?`, [...values, id]);
    res.json({ success: true });
  } catch (e) { next(e); }
});

playlistRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const r = await exec(`DELETE FROM playlists WHERE id = ? AND user_id = ?`, [id, req.user!.sub]);
    if (!r.affectedRows) return res.status(404).json({ error: "Introuvable" });
    res.json({ success: true });
  } catch (e) { next(e); }
});

playlistRouter.post("/:id/songs", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!(await ensureOwnPlaylist(req.user!.sub, id))) return res.status(404).json({ error: "Introuvable" });
    const s = songBody.parse(req.body);
    await exec(
      `INSERT IGNORE INTO playlist_songs (playlist_id, song_id, song_title, artist_name, artist_slug, duration, cover_image, genre)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, s.songId, s.songTitle, s.artistName, s.artistSlug, s.duration ?? null, s.cover, s.genre],
    );
    const c = await queryOne<any>(`SELECT COUNT(*) AS n FROM playlist_songs WHERE playlist_id = ?`, [id]);
    res.json({ success: true, songCount: c?.n ?? 0 });
  } catch (e) { next(e); }
});

playlistRouter.delete("/:id/songs/:songId", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!(await ensureOwnPlaylist(req.user!.sub, id))) return res.status(404).json({ error: "Introuvable" });
    await exec(`DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?`, [id, req.params.songId]);
    res.json({ success: true });
  } catch (e) { next(e); }
});
