import { getPool } from "../config/database.js";
import type { AdminProfile } from "../types/auth.js";

interface AdminRow {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

function rowToProfile(row: AdminRow): AdminProfile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    permissions: row.permissions ?? [],
  };
}

export async function getAdminProfile(uid: string): Promise<AdminProfile | null> {
  const result = await getPool().query<AdminRow>("SELECT * FROM admins WHERE id = $1", [uid]);
  if (result.rowCount === 0) return null;
  return rowToProfile(result.rows[0]!);
}

export async function isAdmin(uid: string): Promise<boolean> {
  const result = await getPool().query("SELECT 1 FROM admins WHERE id = $1", [uid]);
  return (result.rowCount ?? 0) > 0;
}

export async function resolveAdminProfile(uid: string, email: string): Promise<AdminProfile> {
  const fromDb = await getAdminProfile(uid);
  if (fromDb) return fromDb;

  throw new Error("NOT_ADMIN");
}
