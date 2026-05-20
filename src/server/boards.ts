import { Hono } from "hono";
import { get, run, generateId, query } from "./db.js";
import { authMiddleware, checkWorkspaceMember, checkBoardAccess } from "./middleware.js";

type Env = { Bindings: { DB: D1Database } };

export const boardRoutes = new Hono<Env>();

boardRoutes.use("*", authMiddleware);

// GET /api/workspaces/:workspaceId/boards
boardRoutes.get("/workspaces/:workspaceId/boards", async (c) => {
  const user = c.get("user") as { id: string };
  const { workspaceId } = c.req.param();

  const role = await checkWorkspaceMember(user.id, workspaceId);
  if (!role) return c.json({ error: "Not a member" }, 403);

  const boards = await query(
    `SELECT id, name, description, visibility, archived_at, created_by, created_at, updated_at
     FROM boards WHERE workspace_id = ? AND archived_at IS NULL
     ORDER BY created_at DESC`,
    [workspaceId]
  );

  return c.json({ boards });
});

// POST /api/workspaces/:workspaceId/boards
boardRoutes.post("/workspaces/:workspaceId/boards", async (c) => {
  const user = c.get("user") as { id: string };
  const { workspaceId } = c.req.param();

  const role = await checkWorkspaceMember(user.id, workspaceId);
  if (!role || role === "viewer") {
    return c.json({ error: "Permission denied" }, 403);
  }

  const body = await c.req.json<{ name?: string; description?: string; visibility?: string }>();
  const name = body.name?.trim();
  if (!name) return c.json({ error: "Name is required" }, 400);

  const visibility = body.visibility || "workspace";
  if (!["private", "workspace", "public"].includes(visibility)) {
    return c.json({ error: "Invalid visibility" }, 400);
  }

  const id = generateId();
  await run(
    "INSERT INTO boards (id, workspace_id, name, description, visibility, created_by) VALUES (?, ?, ?, ?, ?, ?)",
    [id, workspaceId, name, body.description?.trim() || "", visibility, user.id]
  );

  // Add creator as board admin
  await run(
    "INSERT INTO board_members (id, board_id, user_id, role) VALUES (?, ?, ?, ?)",
    [generateId(), id, user.id, "admin"]
  );

  return c.json({ id, name, visibility }, 201);
});

// GET /api/boards/:boardId
boardRoutes.get("/boards/:boardId", async (c) => {
  const user = c.get("user") as { id: string };
  const { boardId } = c.req.param();

  const access = await checkBoardAccess(user.id, boardId);
  if (!access) return c.json({ error: "Access denied" }, 403);

  const board = await get(
    `SELECT id, workspace_id, name, description, visibility, archived_at, created_by, created_at, updated_at
     FROM boards WHERE id = ?`,
    [boardId]
  );
  if (!board) return c.json({ error: "Board not found" }, 404);

  // Get lists with cards
  const lists = await query(
    "SELECT id, title, position, created_at FROM lists WHERE board_id = ? ORDER BY position ASC",
    [boardId]
  );

  const cards = await query(
    `SELECT id, list_id, title, description, position, due_date, priority, assigned_to, created_by, created_at, updated_at
     FROM cards WHERE board_id = ? AND archived_at IS NULL ORDER BY position ASC`,
    [boardId]
  );

  const labels = await query(
    "SELECT id, name, color FROM labels WHERE board_id = ?",
    [boardId]
  );

  // Get card labels
  const cardLabels = await query<{ card_id: string; label_id: string }>(
    `SELECT cl.card_id, cl.label_id FROM card_labels cl
     JOIN cards c ON c.id = cl.card_id WHERE c.board_id = ?`,
    [boardId]
  );

  const cardLabelMap = new Map<string, string[]>();
  for (const cl of cardLabels) {
    if (!cardLabelMap.has(cl.card_id)) cardLabelMap.set(cl.card_id, []);
    cardLabelMap.get(cl.card_id)!.push(cl.label_id);
  }

  const cardsByList = new Map<string, unknown[]>();
  for (const card of cards) {
    const c = card as { id: string; list_id: string };
    if (!cardsByList.has(c.list_id)) cardsByList.set(c.list_id, []);
    cardsByList.get(c.list_id)!.push({
      ...card,
      labels: cardLabelMap.get(c.id) || [],
    });
  }

  const listsWithCards = (lists as { id: string }[]).map((list) => ({
    ...list,
    cards: cardsByList.get(list.id) || [],
  }));

  return c.json({ board, lists: listsWithCards, labels, role: access });
});

// PUT /api/boards/:boardId
boardRoutes.put("/boards/:boardId", async (c) => {
  const user = c.get("user") as { id: string };
  const { boardId } = c.req.param();

  const access = await checkBoardAccess(user.id, boardId);
  if (!access || access === "viewer") return c.json({ error: "Permission denied" }, 403);

  const body = await c.req.json<{ name?: string; description?: string; visibility?: string }>();

  const updates: string[] = [];
  const params: unknown[] = [];

  if (body.name?.trim()) {
    updates.push("name = ?");
    params.push(body.name.trim());
  }
  if (body.description !== undefined) {
    updates.push("description = ?");
    params.push(body.description.trim());
  }
  if (body.visibility && ["private", "workspace", "public"].includes(body.visibility)) {
    updates.push("visibility = ?");
    params.push(body.visibility);
  }

  if (updates.length === 0) return c.json({ error: "Nothing to update" }, 400);

  updates.push("updated_at = datetime('now')");
  params.push(boardId);

  await run(`UPDATE boards SET ${updates.join(", ")} WHERE id = ?`, params);
  return c.json({ ok: true });
});

// DELETE /api/boards/:boardId
boardRoutes.delete("/boards/:boardId", async (c) => {
  const user = c.get("user") as { id: string };
  const { boardId } = c.req.param();

  const access = await checkBoardAccess(user.id, boardId);
  if (!access || !["admin", "owner"].includes(access)) {
    return c.json({ error: "Permission denied" }, 403);
  }

  await run("DELETE FROM boards WHERE id = ?", [boardId]);
  return c.json({ ok: true });
});

// POST /api/boards/:boardId/archive
boardRoutes.post("/boards/:boardId/archive", async (c) => {
  const user = c.get("user") as { id: string };
  const { boardId } = c.req.param();

  const access = await checkBoardAccess(user.id, boardId);
  if (!access || access === "viewer") return c.json({ error: "Permission denied" }, 403);

  await run(
    "UPDATE boards SET archived_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
    [boardId]
  );
  return c.json({ ok: true });
});
