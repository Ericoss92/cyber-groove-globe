import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { exec, query, queryOne } from "../database/connection.js";

export const favoritesRouter = Router();

const songBody = z.object({
  songTitle: z.string().max(255).optional(),
  artistName: z.string().max(255).optional(),
  artistSlug: z.string().max(255).optional(),
  duration: z.number().int().min(0).optional(),
  cover: z.string().max(500).optional(),
  genre: z.string().max(100).optional(),
});

favoritesRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT song_id AS songId, song_title AS title, artist_name AS artist, artist_slug AS artistSlug,
              duration, cover_image AS cover, genre, added_at AS addedAt
         FROM favorites WHERE user_id = ? ORDER BY added_at DESC`,
      [req.user!.sub],
    );
    res.json(rows);
  } catch (e) { next(e); }
});

favoritesRouter.get("/:songId", requireAuth, async (req, res, next) => {
  try {
    const r = await queryOne(`SELECT id FROM favorites WHERE user_id = ? AND song_id = ?`, [req.user!.sub, req.params.songId]);
    res.json({ isFavorite: !!r });
  } catch (e) { next(e); }
});

favoritesRouter.post("/:songId", requireAuth, async (req, res, next) => {
  try {
    const s = songBody.parse(req.body);
    await exec(
      `INSERT IGNORE INTO favorites (user_id, song_id, song_title, artist_name, artist_slug, duration, cover_image, genre)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user!.sub, req.params.songId, s.songTitle, s.artistName, s.artistSlug, s.duration ?? null, s.cover, s.genre],
    );
    res.json({ success: true });
  } catch (e) { next(e); }
});

favoritesRouter.delete("/:songId", requireAuth, async (req, res, next) => {
  try {
    await exec(`DELETE FROM favorites WHERE user_id = ? AND song_id = ?`, [req.user!.sub, req.params.songId]);
    res.json({ success: true });
  } catch (e) { next(e); }
});
