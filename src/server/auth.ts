import { Hono } from "hono";
import { get, run, generateId, query } from "./db.js";

type Env = { Bindings: { DB: D1Database } };

export const authRoutes = new Hono<Env>();

// Simple password hashing using Web Crypto (no external deps)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "new-trello-salt-2024");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function createSession(userId: string): Promise<string> {
  const sessionId = generateId();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  await run(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
    [sessionId, userId, expires]
  );
  return sessionId;
}

// POST /api/auth/register
authRoutes.post("/register", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string; name?: string }>();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const name = body.name?.trim() || "";

  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }
  if (password.length < 6) {
    return c.json({ error: "Password must be at least 6 characters" }, 400);
  }

  const existing = await get("SELECT id FROM users WHERE email = ?", [email]);
  if (existing) {
    return c.json({ error: "Email already registered" }, 409);
  }

  const userId = generateId();
  const passwordHash = await hashPassword(password);

  await run(
    "INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)",
    [userId, email, name || email.split("@")[0], passwordHash]
  );

  // Create default workspace
  const workspaceId = generateId();
  const slug = `ws-${userId.slice(0, 8)}`;
  await run(
    "INSERT INTO workspaces (id, name, slug, owner_id) VALUES (?, ?, ?, ?)",
    [workspaceId, "My Workspace", slug, userId]
  );
  await run(
    "INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, ?)",
    [generateId(), workspaceId, userId, "owner"]
  );

  const sessionId = await createSession(userId);

  return c.json({
    user: { id: userId, email, name: name || email.split("@")[0] },
    session_id: sessionId,
    workspace_id: workspaceId,
  }, 201);
});

// POST /api/auth/login
authRoutes.post("/login", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  const user = await get<{ id: string; email: string; name: string; password_hash: string }>(
    "SELECT id, email, name, password_hash FROM users WHERE email = ?",
    [email]
  );
  if (!user) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const passwordHash = await hashPassword(password);
  if (passwordHash !== user.password_hash) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const sessionId = await createSession(user.id);

  return c.json({
    user: { id: user.id, email: user.email, name: user.name },
    session_id: sessionId,
  });
});

// POST /api/auth/logout
authRoutes.post("/logout", async (c) => {
  const sessionId = c.req.header("Authorization")?.replace("Bearer ", "");
  if (sessionId) {
    await run("DELETE FROM sessions WHERE id = ?", [sessionId]);
  }
  return c.json({ ok: true });
});

// GET /api/me
authRoutes.get("/me", async (c) => {
  const sessionId = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!sessionId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const session = await get<{ user_id: string; expires_at: string }>(
    "SELECT user_id, expires_at FROM sessions WHERE id = ?",
    [sessionId]
  );
  if (!session || new Date(session.expires_at) < new Date()) {
    return c.json({ error: "Session expired" }, 401);
  }

  const user = await get<{ id: string; email: string; name: string; avatar_url: string }>(
    "SELECT id, email, name, avatar_url FROM users WHERE id = ?",
    [session.user_id]
  );
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  // Get workspaces
  const workspaces = await query(
    `SELECT w.id, w.name, w.slug, wm.role 
     FROM workspaces w 
     JOIN workspace_members wm ON wm.workspace_id = w.id 
     WHERE wm.user_id = ?`,
    [user.id]
  );

  return c.json({ user, workspaces });
});
