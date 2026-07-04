import { getPool } from "../config/database.js";
import type { UserProfile } from "../types/auth.js";

interface UserRow {
  id: string;
  email: string;
  name: string;
  verified: boolean;
  created_at: string;
  country: string;
  two_fa: boolean;
}

function rowToProfile(row: UserRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    verified: row.verified,
    createdAt: Number(row.created_at),
    country: row.country,
    twoFA: row.two_fa,
  };
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  const result = await getPool().query<UserRow>("SELECT * FROM users WHERE email = $1", [
    email.toLowerCase(),
  ]);
  if (result.rowCount === 0) return null;
  return rowToProfile(result.rows[0]!);
}

export async function createUserProfile(
  uid: string,
  data: { email: string; name: string; country?: string },
): Promise<UserProfile> {
  const profile: UserProfile = {
    id: uid,
    email: data.email.toLowerCase(),
    name: data.name,
    verified: false,
    createdAt: Date.now(),
    country: data.country ?? "India",
    twoFA: false,
  };

  await getPool().query(
    `INSERT INTO users (id, email, name, verified, created_at, country, two_fa)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO NOTHING`,
    [profile.id, profile.email, profile.name, profile.verified, profile.createdAt, profile.country, profile.twoFA],
  );

  const saved = await getUserProfile(uid);
  return saved ?? profile;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const result = await getPool().query<UserRow>("SELECT * FROM users WHERE id = $1", [uid]);
  if (result.rowCount === 0) return null;
  return rowToProfile(result.rows[0]!);
}

async function relinkUserProfile(
  oldUid: string,
  newUid: string,
  data: { name: string; country?: string },
): Promise<UserProfile> {
  await getPool().query(
    `UPDATE users
     SET id = $1, name = $2, country = COALESCE($3, country)
     WHERE id = $4`,
    [newUid, data.name, data.country ?? null, oldUid],
  );

  const saved = await getUserProfile(newUid);
  if (!saved) {
    throw new Error("Failed to relink user profile.");
  }
  return saved;
}

export async function syncUserProfile(
  uid: string,
  data: { email: string; name: string; country?: string },
): Promise<UserProfile> {
  const existingById = await getUserProfile(uid);
  if (existingById) return existingById;

  const existingByEmail = await getUserByEmail(data.email);
  if (existingByEmail) {
    if (existingByEmail.id !== uid) {
      return relinkUserProfile(existingByEmail.id, uid, data);
    }
    return existingByEmail;
  }

  return createUserProfile(uid, data);
}

export async function setUserVerified(uid: string, verified: boolean): Promise<UserProfile | null> {
  await getPool().query("UPDATE users SET verified = $1 WHERE id = $2", [verified, uid]);
  return getUserProfile(uid);
}

export async function getOrCreateUserProfile(
  uid: string,
  data: { email: string; name?: string; country?: string },
): Promise<UserProfile> {
  const existing = await getUserProfile(uid);
  if (existing) return existing;

  const email = data.email.toLowerCase();
  const name = data.name ?? email.split("@")[0] ?? "User";
  return createUserProfile(uid, { email, name, country: data.country });
}
