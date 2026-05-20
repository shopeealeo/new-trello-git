import { Hono } from "hono";
import { cors } from "hono/cors";
import { initDB } from "./db.js";
import { authRoutes } from "./auth.js";
import { workspaceRoutes } from "./workspaces.js";
import { boardRoutes } from "./boards.js";
import { listRoutes } from "./lists.js";
import { cardRoutes } from "./cards.js";
import { labelRoutes } from "./labels.js";
import { commentRoutes } from "./comments.js";
import { activityRoutes } from "./activity.js";

type Env = { Bindings: { DB: D1Database } };

const app = new Hono<Env>();

// CORS
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// Init DB on every request
app.use("/api/*", async (c, next) => {
  initDB(c.env.DB);
  await next();
});

// Health check
app.get("/api/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// Mount routes
app.route("/api/auth", authRoutes);
app.route("/api", workspaceRoutes);
app.route("/api", boardRoutes);
app.route("/api", listRoutes);
app.route("/api", cardRoutes);
app.route("/api", labelRoutes);
app.route("/api", commentRoutes);
app.route("/api", activityRoutes);

export default app;
