import { Router } from "express";
import { z } from "zod";
import { exec, query, queryOne } from "../database/connection.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { signAccess, signRefresh, tokenHash, verifyRefresh } from "../utils/jwt.js";
import { loginLimiter, registerLimiter } from "../middleware/rateLimiter.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

const credentials = z.object({
  username: z.string().trim().min(3).max(64).regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().min(6).max(200),
});

authRouter.post("/register", registerLimiter, async (req, res, next) => {
  try {
    const { username, password } = credentials.parse(req.body);
    const exists = await queryOne(`SELECT id FROM users WHERE username = ?`, [username]);
    if (exists) return res.status(409).json({ error: "Identifiant déjà pris" });
    const hash = await hashPassword(password);
    const r = await exec(
      `INSERT INTO users (username, password_hash, authorized) VALUES (?, ?, FALSE)`,
      [username, hash],
    );
    await exec(`INSERT INTO user_preferences (user_id) VALUES (?)`, [r.insertId]);
    res.status(201).json({ id: r.insertId, username, authorized: false });
  } catch (e) { next(e); }
});

authRouter.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = credentials.parse(req.body);
    const u = await queryOne<any>(
      `SELECT id, username, password_hash, authorized, is_admin FROM users WHERE username = ?`,
      [username],
    );
    if (!u) return res.status(401).json({ error: "Identifiants invalides" });
    const ok = await verifyPassword(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: "Identifiants invalides" });
    if (!u.authorized) return res.status(403).json({ error: "Compte en attente d'approbation administrateur" });

    const payload = { sub: u.id, username: u.username, admin: !!u.is_admin };
    const token = signAccess(payload);
    const refreshToken = signRefresh(payload);
    await exec(
      `INSERT INTO sessions (user_id, token_hash, refresh_token_hash, ip_address, user_agent, expires_at)
       VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
      [u.id, tokenHash(token), tokenHash(refreshToken), req.ip || null, req.headers["user-agent"] || null],
    );
    await exec(`UPDATE users SET last_login = NOW() WHERE id = ?`, [u.id]);
    res.json({
      token,
      refreshToken,
      user: { id: u.id, username: u.username, authorized: !!u.authorized, admin: !!u.is_admin },
    });
  } catch (e) { next(e); }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    const payload = verifyRefresh(refreshToken);
    const newAccess = signAccess({ sub: payload.sub, username: payload.username, admin: payload.admin });
    const newRefresh = signRefresh({ sub: payload.sub, username: payload.username, admin: payload.admin });
    res.json({ token: newAccess, refreshToken: newRefresh });
  } catch {
    res.status(401).json({ error: "Refresh token invalide" });
  }
});

authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const h = req.headers.authorization!.slice(7);
    await exec(`DELETE FROM sessions WHERE token_hash = ?`, [tokenHash(h)]);
    res.json({ success: true });
  } catch (e) { next(e); }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const u = await queryOne<any>(
      `SELECT id, username, email, authorized, is_admin, created_at, last_login FROM users WHERE id = ?`,
      [req.user!.sub],
    );
    if (!u) return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json({
      id: u.id, username: u.username, email: u.email,
      authorized: !!u.authorized, admin: !!u.is_admin,
      createdAt: u.created_at, lastLogin: u.last_login,
    });
  } catch (e) { next(e); }
});
