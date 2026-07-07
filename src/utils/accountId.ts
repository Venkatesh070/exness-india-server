import crypto from "node:crypto";
import { AppUser } from "../models/index.js";

/** Random 9-digit trading account number (100000000–999999999). */
export function generateAccountIdCandidate(): string {
  return String(crypto.randomInt(100_000_000, 1_000_000_000));
}

export async function generateUniqueAccountId(maxAttempts = 12): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const accountId = generateAccountIdCandidate();
    const exists = await AppUser.exists({ accountId });
    if (!exists) return accountId;
  }
  throw new Error("Failed to generate a unique account ID.");
}
