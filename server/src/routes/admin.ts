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
