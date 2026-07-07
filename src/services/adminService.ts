import { Admin } from "../models/index.js";
import type { AdminProfile } from "../types/auth.js";

function rowToProfile(row: {
  _id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}): AdminProfile {
  return {
    id: row._id,
    email: row.email,
    name: row.name,
    role: row.role,
    permissions: row.permissions ?? [],
  };
}

export async function getAdminProfile(uid: string): Promise<AdminProfile | null> {
  const doc = await Admin.findById(uid).lean();
  if (!doc) return null;
  return rowToProfile(doc as Parameters<typeof rowToProfile>[0]);
}

export async function isAdmin(uid: string): Promise<boolean> {
  const doc = await Admin.exists({ _id: uid });
  return doc !== null;
}

export async function resolveAdminProfile(uid: string, email: string): Promise<AdminProfile> {
  const fromDb = await getAdminProfile(uid);
  if (fromDb) return fromDb;
  throw new Error("NOT_ADMIN");
}

export async function upsertAdminProfile(data: {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}): Promise<AdminProfile> {
  const doc = await Admin.findOneAndUpdate(
    { _id: data.id },
    {
      _id: data.id,
      email: data.email.toLowerCase(),
      name: data.name,
      role: data.role,
      permissions: data.permissions,
    },
    { upsert: true, new: true, lean: true, setDefaultsOnInsert: true },
  );
  return rowToProfile(doc as Parameters<typeof rowToProfile>[0]);
}
