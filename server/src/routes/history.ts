import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { exec, query } from "../database/connection.js";
import { computeStats } from "../services/analyticsService.js";

export const historyRouter = Router();

const logBody = z.object({
  songId: z.string().max(255),
  songTitle: z.string().max(255).optional(),
  artistName: z.string().max(255).optional(),
  artistSlug: z.string().max(255).optional(),
  artistCountry: z.string().max(100).optional(),
  artistContinent: z.string().max(100).optional(),
  genre: z.string().max(100).optional(),
  durationPlayedSeconds: z.number().int().min(0).optional(),
  completed: z.boolean().optional(),
  playedPercentage: z.number().min(0).max(100).optional(),
});

historyRouter.post("/log", requireAuth, async (req, res, next) => {
  try {
    const d = logBody.parse(req.body);
    await exec(
      `INSERT INTO listening_history
        (user_id, song_id, song_title, artist_name, artist_slug, artist_country, artist_continent, genre,
         duration_played_seconds, completed, played_percentage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user!.sub, d.songId, d.songTitle, d.artistName, d.artistSlug,
        d.artistCountry, d.artistContinent, d.genre,
        d.durationPlayedSeconds ?? 0, !!d.completed, d.playedPercentage ?? 0,
      ],
    );
    res.json({ success: true });
  } catch (e) { next(e); }
});

historyRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const rows = await query(
      `SELECT song_id AS songId, song_title AS title, artist_name AS artist, artist_slug AS artistSlug,
              played_at AS playedAt, duration_played_seconds AS durationSeconds, genre
         FROM listening_history WHERE user_id = ?
        ORDER BY played_at DESC LIMIT ? OFFSET ?`,
      [req.user!.sub, limit, offset],
    );
    res.json(rows);
  } catch (e) { next(e); }
});

historyRouter.get("/stats", requireAuth, async (req, res, next) => {
  try { res.json(await computeStats(req.user!.sub)); } catch (e) { next(e); }
});

historyRouter.get("/top-artists", requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const period = (req.query.period as string) || "all";
    const where = period === "week" ? "AND played_at >= NOW() - INTERVAL 7 DAY"
                : period === "month" ? "AND played_at >= NOW() - INTERVAL 30 DAY" : "";
    const rows = await query(
      `SELECT artist_name AS name, artist_slug AS slug, artist_country AS country,
              COUNT(*) AS playCount, ROUND(SUM(duration_played_seconds)/60) AS totalMinutes
         FROM listening_history WHERE user_id = ? ${where} AND artist_slug IS NOT NULL
        GROUP BY artist_slug, artist_name, artist_country
        ORDER BY playCount DESC LIMIT ?`,
      [req.user!.sub, limit],
    );
    res.json(rows);
  } catch (e) { next(e); }
});

historyRouter.get("/by-country", requireAuth, async (req, res, next) => {
  try {
    const country = String(req.query.country || "");
    if (!country) return res.status(400).json({ error: "country required" });
    const rows = await query(
      `SELECT song_id AS songId, song_title AS title, artist_name AS artist,
              COUNT(*) AS playCount, ROUND(SUM(duration_played_seconds)/60) AS totalMinutes
         FROM listening_history WHERE user_id = ? AND artist_country = ?
        GROUP BY song_id, song_title, artist_name
        ORDER BY playCount DESC LIMIT 100`,
      [req.user!.sub, country],
    );
    res.json(rows);
  } catch (e) { next(e); }
});
