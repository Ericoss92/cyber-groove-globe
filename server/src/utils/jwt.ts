import jwt, { type SignOptions } from "jsonwebtoken";
import crypto from "crypto";

const SECRET = process.env.JWT_SECRET || "dev_secret";
const REFRESH = process.env.JWT_REFRESH_SECRET || "dev_refresh";
const ACCESS_TTL = (process.env.JWT_ACCESS_TTL || "15m") as SignOptions["expiresIn"];
const REFRESH_TTL = (process.env.JWT_REFRESH_TTL || "7d") as SignOptions["expiresIn"];

export type JwtPayload = { sub: number; username: string; admin: boolean };

export const signAccess = (p: JwtPayload) => jwt.sign(p, SECRET, { expiresIn: ACCESS_TTL });
export const signRefresh = (p: JwtPayload) => jwt.sign(p, REFRESH, { expiresIn: REFRESH_TTL });
export const verifyAccess = (t: string) =>
  jwt.verify(t, SECRET) as unknown as JwtPayload & { iat: number; exp: number };

export const verifyRefresh = (t: string) =>
  jwt.verify(t, REFRESH) as unknown as JwtPayload & { iat: number; exp: number };
export const tokenHash = (t: string) => crypto.createHash("sha256").update(t).digest("hex");
