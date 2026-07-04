#!/usr/bin/env node
/**
 * Validates Firebase Web API key against Identity Toolkit.
 * Usage: node scripts/check-firebase-key.mjs
 * Reads VITE_FIREBASE_API_KEY from alpha-trade-demo/.env or FIREBASE_WEB_API_KEY from exness-india-server/.env
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadKey() {
  const frontendEnv = join(root, "..", "alpha-trade-demo", ".env");
  const serverEnv = join(root, ".env");

  for (const file of [frontendEnv, serverEnv]) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, "utf-8");
    const match = content.match(/(?:VITE_FIREBASE_API_KEY|FIREBASE_WEB_API_KEY)=(.+)/);
    if (match?.[1]) return match[1].trim();
  }

  return process.env.VITE_FIREBASE_API_KEY ?? process.env.FIREBASE_WEB_API_KEY ?? "";
}

const apiKey = loadKey();

if (!apiKey || apiKey.includes("YOUR_") || apiKey.includes("your-")) {
  console.error("❌ No Firebase API key found in .env");
  console.error("   Set VITE_FIREBASE_API_KEY in alpha-trade-demo/.env");
  process.exit(1);
}

console.log("Checking Firebase API key:", apiKey.slice(0, 8) + "…");

const res = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnSecureToken: true }),
  },
);

const data = await res.json();

if (data.error?.message === "CONFIGURATION_NOT_FOUND") {
  console.error("\n❌ Firebase Authentication is NOT configured for this project");
  console.error("\nFix:");
  console.error("  1. Open https://console.firebase.google.com/project/exness-india/authentication");
  console.error("  2. Click 'Get started' (if shown)");
  console.error("  3. Go to 'Sign-in method' tab");
  console.error("  4. Click 'Email/Password' → Enable → Save");
  console.error("  5. Restart frontend: cd alpha-trade-demo && npm run dev");
  process.exit(1);
}

if (data.error?.message?.includes("API key not valid")) {
  console.error("\n❌ API key is INVALID");
  console.error("\nFix:");
  console.error("  1. Open https://console.firebase.google.com");
  console.error("  2. Select project: exness-india");
  console.error("  3. Project settings (gear) → General → Your apps → Web app");
  console.error("  4. Copy apiKey from firebaseConfig");
  console.error("  5. Paste into alpha-trade-demo/.env → VITE_FIREBASE_API_KEY=...");
  console.error("  6. Enable Authentication → Sign-in method → Email/Password");
  console.error("  7. Restart: npm run dev");
  process.exit(1);
}

if (data.error?.message === "MISSING_EMAIL" || data.error?.message === "MISSING_PASSWORD") {
  console.log("\n✅ API key is VALID (Firebase responded correctly)");
  process.exit(0);
}

if (data.error) {
  console.log("\n✅ API key appears valid. Firebase returned:", data.error.message);
  process.exit(0);
}

console.log("\n✅ API key is valid");
process.exit(0);
