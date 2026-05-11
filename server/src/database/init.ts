/**
 * One-shot initializer: applies schema.sql and creates the first admin from .env.
 * Run with: npx tsx src/database/init.ts
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { hashPassword } from "../utils/password.js";

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });
  const sql = fs.readFileSync(path.join(process.cwd(), "src/database/schema.sql"), "utf8");
  console.log("Applying schema…");
  await conn.query(sql);
  console.log("Schema applied.");

  await conn.changeUser({ database: process.env.DB_NAME });

  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "changeme_strong";
  const [rows] = await conn.execute(`SELECT id FROM users WHERE username = ?`, [adminUsername]);
  if ((rows as any[]).length === 0) {
    const hash = await hashPassword(adminPassword);
    const [r] = await conn.execute(
      `INSERT INTO users (username, password_hash, authorized, is_admin) VALUES (?, ?, TRUE, TRUE)`,
      [adminUsername, hash],
    );
    await conn.execute(`INSERT INTO user_preferences (user_id) VALUES (?)`, [(r as any).insertId]);
    console.log(`Admin '${adminUsername}' created.`);
  } else {
    console.log(`Admin '${adminUsername}' already exists.`);
  }
  await conn.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
