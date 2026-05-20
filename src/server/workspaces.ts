import { Hono } from "hono";
import { get, run, generateId, query } from "./db.js";
import { authMiddleware, checkWorkspaceMember } from "./middleware.js";

type Env = { Bindings: { DB: D1Database } };

export const workspaceRoutes = new Hono<Env>();

workspaceRoutes.use("*", authMiddleware);

// GET /api/workspaces
workspaceRoutes.get("/", async (c) => {
  const user = c.get("user") as { id: string };
  const workspaces = await query(
    `SELECT w.id, w.name, w.slug, w.owner_id, w.created_at, wm.role
     FROM workspaces w
     JOIN workspace_members wm ON wm.workspace_id = w.id
     WHERE wm.user_id = ?
     ORDER BY w.created_at DESC`,
    [user.id]
  );
  return c.json({ workspaces });
});

// POST /api/workspaces
workspaceRoutes.post("/", async (c) => {
  const user = c.get("user") as { id: string };
  const body = await c.req.json<{ name?: string }>();
  const name = body.name?.trim();
  if (!name) return c.json({ error: "Name is required" }, 400);

  const id = generateId();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50) + "-" + id.slice(0, 6);

  await run(
    "INSERT INTO workspaces (id, name, slug, owner_id) VALUES (?, ?, ?, ?)",
    [id, name, slug, user.id]
  );
  await run(
    "INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, ?)",
    [generateId(), id, user.id, "owner"]
  );

  return c.json({ id, name, slug, owner_id: user.id }, 201);
});

// GET /api/workspaces/:workspaceId
workspaceRoutes.get("/:workspaceId", async (c) => {
  const user = c.get("user") as { id: string };
  const { workspaceId } = c.req.param();

  const role = await checkWorkspaceMember(user.id, workspaceId);
  if (!role) return c.json({ error: "Not a member of this workspace" }, 403);

  const workspace = await get(
    "SELECT id, name, slug, owner_id, created_at, updated_at FROM workspaces WHERE id = ?",
    [workspaceId]
  );
  if (!workspace) return c.json({ error: "Workspace not found" }, 404);

  return c.json({ workspace, role });
});

// PUT /api/workspaces/:workspaceId
workspaceRoutes.put("/:workspaceId", async (c) => {
  const user = c.get("user") as { id: string };
  const { workspaceId } = c.req.param();

  const role = await checkWorkspaceMember(user.id, workspaceId);
  if (!role || !["owner", "admin"].includes(role)) {
    return c.json({ error: "Permission denied" }, 403);
  }

  const body = await c.req.json<{ name?: string }>();
  const name = body.name?.trim();
  if (!name) return c.json({ error: "Name is required" }, 400);

  await run(
    "UPDATE workspaces SET name = ?, updated_at = datetime('now') WHERE id = ?",
    [name, workspaceId]
  );

  return c.json({ ok: true });
});

// DELETE /api/workspaces/:workspaceId
workspaceRoutes.delete("/:workspaceId", async (c) => {
  const user = c.get("user") as { id: string };
  const { workspaceId } = c.req.param();

  const role = await checkWorkspaceMember(user.id, workspaceId);
  if (role !== "owner") {
    return c.json({ error: "Only workspace owner can delete" }, 403);
  }

  await run("DELETE FROM workspaces WHERE id = ?", [workspaceId]);
  return c.json({ ok: true });
});

// GET /api/workspaces/:workspaceId/members
workspaceRoutes.get("/:workspaceId/members", async (c) => {
  const user = c.get("user") as { id: string };
  const { workspaceId } = c.req.param();

  const role = await checkWorkspaceMember(user.id, workspaceId);
  if (!role) return c.json({ error: "Not a member" }, 403);

  const members = await query(
    `SELECT u.id, u.email, u.name, u.avatar_url, wm.role, wm.created_at
     FROM workspace_members wm
     JOIN users u ON u.id = wm.user_id
     WHERE wm.workspace_id = ?
     ORDER BY wm.created_at ASC`,
    [workspaceId]
  );

  return c.json({ members });
});

// POST /api/workspaces/:workspaceId/invites
workspaceRoutes.post("/:workspaceId/invites", async (c) => {
  const user = c.get("user") as { id: string };
  const { workspaceId } = c.req.param();

  const role = await checkWorkspaceMember(user.id, workspaceId);
  if (!role || !["owner", "admin"].includes(role)) {
    return c.json({ error: "Permission denied" }, 403);
  }

  const body = await c.req.json<{ email?: string; role?: string }>();
  const email = body.email?.trim().toLowerCase();
  const inviteRole = body.role || "member";

  if (!email) return c.json({ error: "Email is required" }, 400);
  if (!["admin", "member", "viewer"].includes(inviteRole)) {
    return c.json({ error: "Invalid role" }, 400);
  }

  const targetUser = await get<{ id: string }>("SELECT id FROM users WHERE email = ?", [email]);
  if (!targetUser) {
    return c.json({ error: "User not found. They must register first." }, 404);
  }

  const existing = await get(
    "SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?",
    [workspaceId, targetUser.id]
  );
  if (existing) {
    return c.json({ error: "User is already a member" }, 409);
  }

  await run(
    "INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, ?)",
    [generateId(), workspaceId, targetUser.id, inviteRole]
  );

  return c.json({ ok: true, user_id: targetUser.id }, 201);
});

// PUT /api/workspaces/:workspaceId/members/:userId
workspaceRoutes.put("/:workspaceId/members/:userId", async (c) => {
  const user = c.get("user") as { id: string };
  const { workspaceId, userId } = c.req.param();

  const role = await checkWorkspaceMember(user.id, workspaceId);
  if (!role || !["owner", "admin"].includes(role)) {
    return c.json({ error: "Permission denied" }, 403);
  }

  const body = await c.req.json<{ role?: string }>();
  if (!body.role || !["admin", "member", "viewer"].includes(body.role)) {
    return c.json({ error: "Invalid role" }, 400);
  }

  await run(
    "UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?",
    [body.role, workspaceId, userId]
  );

  return c.json({ ok: true });
});

// DELETE /api/workspaces/:workspaceId/members/:userId
workspaceRoutes.delete("/:workspaceId/members/:userId", async (c) => {
  const user = c.get("user") as { id: string };
  const { workspaceId, userId } = c.req.param();

  const role = await checkWorkspaceMember(user.id, workspaceId);
  if (!role || !["owner", "admin"].includes(role)) {
    return c.json({ error: "Permission denied" }, 403);
  }

  // Can't remove owner
  const targetRole = await checkWorkspaceMember(userId, workspaceId);
  if (targetRole === "owner") {
    return c.json({ error: "Cannot remove workspace owner" }, 403);
  }

  await run(
    "DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?",
    [workspaceId, userId]
  );

  return c.json({ ok: true });
});
