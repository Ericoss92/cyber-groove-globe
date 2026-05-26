import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { exec, queryOne } from "../database/connection.js";
import { computeStats } from "../services/analyticsService.js";

export const userRouter = Router();

userRouter.get("/profile", requireAuth, async (req, res, next) => {
  try {
    const u = await queryOne<any>(
      `SELECT u.id, u.username, u.email, u.authorized, u.is_admin, u.created_at,
              p.theme, p.volume, p.crossfade_duration, p.gapless_playback, p.language,
              p.neon_intensity, p.low_perf_mode
         FROM users u LEFT JOIN user_preferences p ON p.user_id = u.id
        WHERE u.id = ?`,
      [req.user!.sub],
    );
    if (!u) return res.status(404).json({ error: "Profil introuvable" });
    res.json(u);
  } catch (e) { next(e); }
});

const prefSchema = z.object({
  theme: z.enum(["cyberpunk", "midnight", "monochrome"]).optional(),
  volume: z.number().int().min(0).max(100).optional(),
  crossfade_duration: z.number().min(0).max(10).optional(),
  gapless_playback: z.boolean().optional(),
  language: z.string().min(2).max(10).optional(),
  neon_intensity: z.number().min(0).max(1).optional(),
  low_perf_mode: z.boolean().optional(),
});

userRouter.get("/preferences", requireAuth, async (req, res, next) => {
  try {
    await exec(`INSERT IGNORE INTO user_preferences (user_id) VALUES (?)`, [req.user!.sub]);
    const prefs = await queryOne(`SELECT * FROM user_preferences WHERE user_id = ?`, [req.user!.sub]);
    res.json(prefs);
  } catch (e) { next(e); }
});

userRouter.put("/preferences", requireAuth, async (req, res, next) => {
  try {
    const data = prefSchema.parse(req.body);
    const fields = Object.keys(data);
    if (fields.length === 0) return res.json({ success: true });
    // upsert
    await exec(`INSERT IGNORE INTO user_preferences (user_id) VALUES (?)`, [req.user!.sub]);
    const set = fields.map((f) => `${f} = ?`).join(", ");
    const values = fields.map((f) => (data as any)[f]);
    await exec(`UPDATE user_preferences SET ${set} WHERE user_id = ?`, [...values, req.user!.sub]);
    const prefs = await queryOne(`SELECT * FROM user_preferences WHERE user_id = ?`, [req.user!.sub]);
    res.json({ success: true, preferences: prefs });
  } catch (e) { next(e); }
});

userRouter.get("/stats", requireAuth, async (req, res, next) => {
  try { res.json(await computeStats(req.user!.sub)); } catch (e) { next(e); }
});
