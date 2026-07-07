import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { buildSwaggerSpec } from "./swagger/spec.js";
import { checkDatabaseConnection } from "./config/database.js";
import { getEmailConfigStatus } from "./services/email.service.js";
import { authRoutes, profileRoutes, kycRoutes, bankRoutes } from "./routes/index.js";
import firebaseAuthRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import adminUsersRoutes from "./routes/adminUsersRoutes.js";
import adminDepositsRoutes from "./routes/adminDepositsRoutes.js";
import adminNewsRoutes from "./routes/adminNewsRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFound } from "./middlewares/validate.js";
import { runMigrations } from "./db/migrate.js";

const swaggerSpec = buildSwaggerSpec(env.PORT);

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.NODE_ENV === "development" ? true : env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));

app.get("/health", async (_req, res) => {
  const email = getEmailConfigStatus();
  const dbOk = await checkDatabaseConnection();
  if (dbOk) {
    res.json({
      status: "ok",
      service: "exness-india-server",
      database: "connected",
      email: email.configured ? "configured" : "missing",
      ...(email.missing.length > 0 ? { missingEmailEnv: email.missing } : {}),
    });
  } else {
    res.status(503).json({
      status: "degraded",
      database: "disconnected",
      email: email.configured ? "configured" : "missing",
    });
  }
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/auth", firebaseAuthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/bank", bankRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin/dashboard", adminRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin/deposits", adminDepositsRoutes);
app.use("/api/admin/news", adminNewsRoutes);
app.use("/api/wallet", walletRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  try {
    await runMigrations();
    console.log("MongoDB connected and indexes ensured");
  } catch (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }

  app.listen(env.PORT, () => {
    console.log(`Server listening on http://localhost:${env.PORT}`);
    console.log(`Swagger docs at http://localhost:${env.PORT}/api/docs`);
  });
}

start();

export default app;
