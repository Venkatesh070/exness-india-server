import { getFirebaseWebApiKey } from "../config/firebase.js";
import type { AuthTokens, FirebaseSignInResponse } from "../types/auth.js";

const IDENTITY_TOOLKIT_BASE = "https://identitytoolkit.googleapis.com/v1";

interface FirebaseAuthError {
  error?: { message?: string; code?: number };
}

function mapFirebaseError(message: string): { status: number; message: string } {
  switch (message) {
    case "EMAIL_NOT_FOUND":
    case "INVALID_LOGIN_CREDENTIALS":
      return { status: 401, message: "Invalid email or password." };
    case "INVALID_PASSWORD":
      return { status: 401, message: "Invalid email or password." };
    case "USER_DISABLED":
      return { status: 403, message: "This account has been disabled." };
    case "EMAIL_EXISTS":
      return { status: 409, message: "An account with that email already exists." };
    case "WEAK_PASSWORD":
      return { status: 400, message: "Password must be at least 6 characters." };
    case "TOO_MANY_ATTEMPTS_TRY_LATER":
      return { status: 429, message: "Too many attempts. Please try again later." };
    case "INVALID_CONTINUE_URI":
      return {
        status: 400,
        message:
          "Invalid verification redirect URL. Add localhost to Firebase Console → Authentication → Settings → Authorized domains.",
      };
    case "UNAUTHORIZED_DOMAIN":
      return {
        status: 400,
        message:
          "Domain not authorized. Add localhost to Firebase Console → Authentication → Settings → Authorized domains.",
      };
    default:
      return { status: 400, message: message.replace(/_/g, " ").toLowerCase() };
  }
}

export class FirebaseAuthServiceError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function postIdentityToolkit<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const apiKey = getFirebaseWebApiKey();
  const res = await fetch(`${IDENTITY_TOOLKIT_BASE}/${path}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as T & FirebaseAuthError;

  if (!res.ok) {
    const code = data.error?.message ?? "UNKNOWN_ERROR";
    const mapped = mapFirebaseError(code);
    throw new FirebaseAuthServiceError(mapped.status, mapped.message);
  }

  return data;
}

export async function signUpWithPassword(
  email: string,
  password: string,
): Promise<FirebaseSignInResponse> {
  return postIdentityToolkit<FirebaseSignInResponse>("accounts:signUp", {
    email,
    password,
    returnSecureToken: true,
  });
}

export async function sendVerificationEmail(idToken: string, continueUrl: string): Promise<void> {
  await postIdentityToolkit<{ email: string }>("accounts:sendOobCode", {
    requestType: "VERIFY_EMAIL",
    idToken,
    continueUrl,
  });
}

export async function signInWithPassword(email: string, password: string): Promise<FirebaseSignInResponse> {
  return postIdentityToolkit<FirebaseSignInResponse>("accounts:signInWithPassword", {
    email,
    password,
    returnSecureToken: true,
  });
}

export async function refreshIdToken(refreshToken: string): Promise<AuthTokens> {
  const apiKey = getFirebaseWebApiKey();
  const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = (await res.json()) as {
    id_token?: string;
    refresh_token?: string;
    expires_in?: string;
    error?: { message?: string };
  };

  if (!res.ok) {
    const code = data.error?.message ?? "UNKNOWN_ERROR";
    const mapped = mapFirebaseError(code);
    throw new FirebaseAuthServiceError(mapped.status, mapped.message);
  }

  return {
    idToken: data.id_token!,
    refreshToken: data.refresh_token!,
    expiresIn: data.expires_in!,
  };
}

export function toAuthTokens(data: FirebaseSignInResponse): AuthTokens {
  return {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn,
  };
}
