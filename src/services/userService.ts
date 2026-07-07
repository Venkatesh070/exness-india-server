import { AppUser } from "../models/index.js";
import type { UserProfile } from "../types/auth.js";
import { generateUniqueAccountId } from "../utils/accountId.js";

function rowToProfile(row: {
  _id: string;
  accountId?: string;
  email: string;
  name: string;
  verified: boolean;
  createdAt: number;
  country: string;
  twoFA: boolean;
}): UserProfile {
  return {
    id: row._id,
    accountId: row.accountId ?? "",
    email: row.email,
    name: row.name,
    verified: row.verified,
    createdAt: row.createdAt,
    country: row.country,
    twoFA: row.twoFA,
  };
}

async function ensureAccountId(uid: string): Promise<string> {
  const doc = await AppUser.findById(uid).lean();
  if (!doc) throw new Error("User profile not found.");

  if (doc.accountId) return doc.accountId;

  const accountId = await generateUniqueAccountId();
  await AppUser.findByIdAndUpdate(uid, { accountId });
  return accountId;
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  const doc = await AppUser.findOne({ email: email.toLowerCase() }).lean();
  if (!doc) return null;

  const profile = rowToProfile(doc as Parameters<typeof rowToProfile>[0]);
  if (!profile.accountId) {
    profile.accountId = await ensureAccountId(doc._id);
  }
  return profile;
}

export async function createUserProfile(
  uid: string,
  data: { email: string; name: string; country?: string },
): Promise<UserProfile> {
  const accountId = await generateUniqueAccountId();
  const profile: UserProfile = {
    id: uid,
    accountId,
    email: data.email.toLowerCase(),
    name: data.name,
    verified: false,
    createdAt: Date.now(),
    country: data.country ?? "India",
    twoFA: false,
  };

  await AppUser.findOneAndUpdate(
    { _id: uid },
    {
      _id: uid,
      accountId: profile.accountId,
      email: profile.email,
      name: profile.name,
      verified: profile.verified,
      createdAt: profile.createdAt,
      country: profile.country,
      twoFA: profile.twoFA,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const saved = await getUserProfile(uid);
  return saved ?? profile;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const doc = await AppUser.findById(uid).lean();
  if (!doc) return null;

  const profile = rowToProfile(doc as Parameters<typeof rowToProfile>[0]);
  if (!profile.accountId) {
    profile.accountId = await ensureAccountId(uid);
  }
  return profile;
}

async function relinkUserProfile(
  oldUid: string,
  newUid: string,
  data: { name: string; country?: string },
): Promise<UserProfile> {
  const existing = await AppUser.findById(oldUid).lean();
  if (!existing) throw new Error("User profile not found for relink.");

  const accountId = existing.accountId ?? (await generateUniqueAccountId());

  await AppUser.deleteOne({ _id: oldUid });
  await AppUser.create({
    _id: newUid,
    accountId,
    email: existing.email,
    name: data.name,
    verified: existing.verified,
    createdAt: existing.createdAt,
    country: data.country ?? existing.country,
    twoFA: existing.twoFA,
  });

  const saved = await getUserProfile(newUid);
  if (!saved) throw new Error("Failed to relink user profile.");
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
  await AppUser.findByIdAndUpdate(uid, { verified });
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
