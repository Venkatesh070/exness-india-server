export interface EnvCheck {
  ok: boolean;
  missing: string[];
}

const REQUIRED_VARS = ["DATABASE_URL", "FIREBASE_PROJECT_ID", "FIREBASE_WEB_API_KEY"] as const;

export function checkRequiredEnv(): EnvCheck {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]?.trim());
  return { ok: missing.length === 0, missing: [...missing] };
}

export function logEnvStatus(): void {
  const { ok, missing } = checkRequiredEnv();
  if (ok) {
    console.log("Environment: all required variables set");
    return;
  }
  console.error("Environment: missing required variables:", missing.join(", "));
  console.error("Set these in Render → Environment (or local .env):");
  for (const key of missing) {
    console.error(`  - ${key}`);
  }
}
