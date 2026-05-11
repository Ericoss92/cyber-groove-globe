import { exec } from "../database/connection.js";

export async function logAdmin(opts: {
  adminUserId: number;
  action: string;
  targetUserId?: number | null;
  targetUsername?: string | null;
  details?: string;
  ipAddress?: string;
}) {
  await exec(
    `INSERT INTO admin_logs (admin_user_id, action, target_user_id, target_username, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      opts.adminUserId,
      opts.action,
      opts.targetUserId ?? null,
      opts.targetUsername ?? null,
      opts.details ?? null,
      opts.ipAddress ?? null,
    ],
  );
}
