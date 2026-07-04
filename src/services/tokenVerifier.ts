import { getFirebaseWebApiKey } from "../config/firebase.js";

export interface VerifiedToken {
  uid: string;
  email?: string;
  name?: string;
  role?: string;
  emailVerified?: boolean;
}

interface LookupUser {
  localId: string;
  email?: string;
  displayName?: string;
  emailVerified?: boolean;
}

interface LookupResponse {
  users?: LookupUser[];
  error?: { message?: string };
}

/**
 * Verify a Firebase ID token via Identity Toolkit (works without Admin SDK).
 * OAuth2Client.verifyIdToken uses Google OAuth certs — Firebase tokens need
 * securetoken@system.gserviceaccount.com certs, so we use accounts:lookup instead.
 */
export async function verifyFirebaseToken(idToken: string): Promise<VerifiedToken> {
  const apiKey = getFirebaseWebApiKey();

  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  const data = (await res.json()) as LookupResponse;

  if (!res.ok) {
    const message = data.error?.message ?? "Token verification failed.";
    throw new Error(message);
  }

  const user = data.users?.[0];
  if (!user?.localId) {
    throw new Error("Invalid token payload.");
  }

  return {
    uid: user.localId,
    email: user.email,
    name: user.displayName,
    role: undefined,
    emailVerified: user.emailVerified,
  };
}
