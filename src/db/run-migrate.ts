import "dotenv/config";
import { disconnectDatabase } from "../config/database.js";
import { runMigrations } from "./migrate.js";

async function main() {
  await runMigrations();
  console.log("MongoDB indexes ensured successfully");
  await disconnectDatabase();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
