import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { exec, query, queryOne } from "../database/connection.js";
import { logAdmin } from "../services/adminLog.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/users", async (req, res, next) => {
  try {
    const status = (req.query.status as string) || "all";
    const where = status === "pending" ? "WHERE authorized = FALSE"
                : status === "authorized" ? "WHERE authorized = TRUE" : "";
    const rows = await query(
      `SELECT id, username, email, authorized, is_admin, created_at AS createdAt, last_login AS lastLogin
         FROM users ${where} ORDER BY created_at DESC`,
    );
    res.json(rows);
  } catch (e) { next(e); }
});

adminRouter.put("/users/:userId/authorize", async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const { approved, reason } = z.object({
      approved: z.boolean(),
      reason: z.string().max(500).optional(),
    }).parse(req.body);
    const u = await queryOne<any>(`SELECT id, username FROM users WHERE id = ?`, [userId]);
    if (!u) return res.status(404).json({ error: "Utilisateur introuvable" });
    await exec(`UPDATE users SET authorized = ? WHERE id = ?`, [approved, userId]);
    await logAdmin({
      adminUserId: req.user!.sub,
      action: approved ? "authorize" : "reject",
      targetUserId: userId,
      targetUsername: u.username,
      details: reason,
      ipAddress: req.ip,
    });
    res.json({ success: true, user: { id: userId, authorized: approved } });
  } catch (e) { next(e); }
});

adminRouter.delete("/users/:userId", async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const { reason } = z.object({ reason: z.string().max(500).optional() }).parse(req.body || {});
    const u = await queryOne<any>(`SELECT id, username FROM users WHERE id = ?`, [userId]);
    if (!u) return res.status(404).json({ error: "Introuvable" });
    if (userId === req.user!.sub) return res.status(400).json({ error: "Auto-suppression interdite" });
    await exec(`DELETE FROM users WHERE id = ?`, [userId]);
    await logAdmin({
      adminUserId: req.user!.sub, action: "delete_user",
      targetUserId: userId, targetUsername: u.username, details: reason, ipAddress: req.ip,
    });
    res.json({ success: true });
  } catch (e) { next(e); }
});

adminRouter.get("/stats", async (_req, res, next) => {
  try {
    const totalUsers = (await queryOne<any>(`SELECT COUNT(*) AS n FROM users`))?.n ?? 0;
    const pendingApprovals = (await queryOne<any>(`SELECT COUNT(*) AS n FROM users WHERE authorized = FALSE`))?.n ?? 0;
    const activeUsers = (await queryOne<any>(
      `SELECT COUNT(DISTINCT user_id) AS n FROM listening_history WHERE played_at >= NOW() - INTERVAL 30 DAY`,
    ))?.n ?? 0;
    const newUsersThisWeek = (await queryOne<any>(
      `SELECT COUNT(*) AS n FROM users WHERE created_at >= NOW() - INTERVAL 7 DAY`,
    ))?.n ?? 0;
    const topArtistsGlobal = await query(
      `SELECT artist_name AS name, COUNT(*) AS count FROM listening_history
        WHERE artist_name IS NOT NULL GROUP BY artist_name ORDER BY count DESC LIMIT 10`,
    );
    const topGenresGlobal = await query(
      `SELECT genre AS name, COUNT(*) AS count FROM listening_history
        WHERE genre IS NOT NULL GROUP BY genre ORDER BY count DESC LIMIT 10`,
    );
    const topCountriesGlobal = await query(
      `SELECT artist_country AS name, COUNT(*) AS count FROM listening_history
        WHERE artist_country IS NOT NULL GROUP BY artist_country ORDER BY count DESC LIMIT 10`,
    );
    const dailyActiveUsers = await query(
      `SELECT DATE(played_at) AS date, COUNT(DISTINCT user_id) AS count
         FROM listening_history WHERE played_at >= NOW() - INTERVAL 30 DAY
        GROUP BY DATE(played_at) ORDER BY date ASC`,
    );
    res.json({
      totalUsers, activeUsers, pendingApprovals, newUsersThisWeek,
      topArtistsGlobal, topGenresGlobal, topCountriesGlobal, dailyActiveUsers,
    });
  } catch (e) { next(e); }
});

adminRouter.get("/logs", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const action = req.query.action as string | undefined;
    const where = action ? "WHERE l.action = ?" : "";
    const params: any[] = action ? [action, limit, offset] : [limit, offset];
    const rows = await query(
      `SELECT l.id, u.username AS adminUsername, l.action, l.target_username AS targetUsername,
              l.details, l.ip_address AS ipAddress, l.created_at AS createdAt
         FROM admin_logs l LEFT JOIN users u ON u.id = l.admin_user_id
         ${where} ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
      params,
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// ---------- ARTISTS METADATA (admin-only editing, persisted in DB) ----------
adminRouter.get("/artists", async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT artist_slug AS slug, biography, years_active AS yearsActive,
              main_genre AS mainGenre, description, image_url AS imageUrl,
              country, social_links AS socialLinks, updated_at AS updatedAt
         FROM artists_metadata ORDER BY updated_at DESC`,
    );
    res.json(rows);
  } catch (e) { next(e); }
});

adminRouter.get("/artists/:slug", async (req, res, next) => {
  try {
    const row = await queryOne<any>(
      `SELECT artist_slug AS slug, biography, years_active AS yearsActive,
              main_genre AS mainGenre, description, image_url AS imageUrl,
              country, social_links AS socialLinks, admin_notes AS adminNotes,
              updated_at AS updatedAt
         FROM artists_metadata WHERE artist_slug = ?`,
      [req.params.slug],
    );
    res.json(row || null);
  } catch (e) { next(e); }
});

const artistMetaSchema = z.object({
  biography: z.string().max(5000).optional().nullable(),
  yearsActive: z.string().max(50).optional().nullable(),
  mainGenre: z.string().max(100).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  imageUrl: z.string().max(500).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  socialLinks: z.record(z.string(), z.string()).optional().nullable(),
  adminNotes: z.string().max(2000).optional().nullable(),
});

adminRouter.put("/artists/:slug", async (req, res, next) => {
  try {
    const slug = req.params.slug;
    if (!slug || slug.length > 255) return res.status(400).json({ error: "Invalid slug" });
    const d = artistMetaSchema.parse(req.body);
    const social = d.socialLinks ? JSON.stringify(d.socialLinks) : null;
    await exec(
      `INSERT INTO artists_metadata
        (artist_slug, biography, years_active, main_genre, description,
         image_url, country, social_links, admin_notes, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         biography = VALUES(biography),
         years_active = VALUES(years_active),
         main_genre = VALUES(main_genre),
         description = VALUES(description),
         image_url = VALUES(image_url),
         country = VALUES(country),
         social_links = VALUES(social_links),
         admin_notes = VALUES(admin_notes),
         updated_by = VALUES(updated_by)`,
      [
        slug, d.biography ?? null, d.yearsActive ?? null, d.mainGenre ?? null,
        d.description ?? null, d.imageUrl ?? null, d.country ?? null,
        social, d.adminNotes ?? null, req.user!.sub,
      ],
    );
    await logAdmin({
      adminUserId: req.user!.sub, action: "edit_artist",
      targetUsername: slug, details: "metadata updated", ipAddress: req.ip,
    });
    const row = await queryOne(
      `SELECT artist_slug AS slug, biography, years_active AS yearsActive,
              main_genre AS mainGenre, description, image_url AS imageUrl,
              country, social_links AS socialLinks, updated_at AS updatedAt
         FROM artists_metadata WHERE artist_slug = ?`,
      [slug],
    );
    res.json({ success: true, artist: row });
  } catch (e) { next(e); }
});
