import "dotenv/config";
import cors from "cors";
import express from "express";
import { checkDatabaseConnection } from "./config/database.js";
import { runMigrations } from "./db/migrate.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    const dbOk = await checkDatabaseConnection();
    res.json({ status: "ok", service: "exness-india-server", database: dbOk ? "connected" : "disconnected" });
  } catch {
    res.status(503).json({ status: "error", service: "exness-india-server", database: "disconnected" });
  }
});

app.get("/api", (_req, res) => {
  res.json({ message: "Exness India API" });
});

app.use("/api/auth", authRoutes);

async function start() {
  try {
    await runMigrations();
    console.log("PostgreSQL migrations applied");
  } catch (err) {
    console.error("Failed to run migrations:", err);
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

start();
