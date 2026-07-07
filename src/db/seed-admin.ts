import "dotenv/config";
import { disconnectDatabase, connectDatabase } from "../config/database.js";
import { getFirebaseAuth } from "../config/firebase.js";

interface FirebaseAuthResponse {
  localId?: string;
  email?: string;
  idToken?: string;
  error?: { message?: string };
}

async function getOrCreateFirebaseUser(email: string, password: string): Promise<string> {
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) throw new Error("FIREBASE_WEB_API_KEY is not set in .env");

  const signUp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const signUpData = (await signUp.json()) as FirebaseAuthResponse;

  if (signUp.ok && signUpData.localId) {
    return signUpData.localId;
  }

  if (signUpData.error?.message === "EMAIL_EXISTS") {
    const signIn = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );
    const signInData = (await signIn.json()) as FirebaseAuthResponse;
    if (!signIn.ok || !signInData.localId) {
      throw new Error(signInData.error?.message ?? "Failed to sign in existing user.");
    }
    return signInData.localId;
  }

  throw new Error(signUpData.error?.message ?? "Failed to create Firebase user.");
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL ?? "admin@gmail.com";
  const password = process.env.ADMIN_PASSWORD ?? "admin@123";
  const name = process.env.ADMIN_NAME ?? "Super Admin";

  console.log(`Creating admin: ${email}`);

  await connectDatabase();

  const uid = await getOrCreateFirebaseUser(email, password);
  console.log(`Firebase UID: ${uid}`);

  try {
    await getFirebaseAuth().updateUser(uid, { emailVerified: true });
    console.log("Admin email marked as verified in Firebase.");
  } catch (err) {
    console.warn("Could not mark admin email verified (check Firebase Admin credentials):", err);
  }

  const { upsertAdminProfile } = await import("../services/adminService.js");
  await upsertAdminProfile({
    id: uid,
    email: email.toLowerCase(),
    name,
    role: "super_admin",
    permissions: ["*"],
  });

  console.log("Admin record saved to MongoDB.");
  console.log("\nLogin at: http://localhost:8080/admin/login");
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
}

seedAdmin()
  .catch((err) => {
    console.error("Failed to seed admin:", err);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectDatabase();
  });
