import "dotenv/config";
import { closePool } from "../config/database.js";
import { runMigrations } from "./migrate.js";

async function main() {
  await runMigrations();
  console.log("PostgreSQL schema applied successfully");
  await closePool();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
