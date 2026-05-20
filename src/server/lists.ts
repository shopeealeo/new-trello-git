import { Hono } from "hono";
import { get, run, generateId, query } from "./db.js";
import { authMiddleware, checkBoardAccess } from "./middleware.js";

type Env = { Bindings: { DB: D1Database } };

export const listRoutes = new Hono<Env>();

listRoutes.use("*", authMiddleware);

// POST /api/boards/:boardId/lists
listRoutes.post("/boards/:boardId/lists", async (c) => {
  const user = c.get("user") as { id: string };
  const { boardId } = c.req.param();

  const access = await checkBoardAccess(user.id, boardId);
  if (!access || access === "viewer") return c.json({ error: "Permission denied" }, 403);

  const body = await c.req.json<{ title?: string }>();
  const title = body.title?.trim();
  if (!title) return c.json({ error: "Title is required" }, 400);

  const maxPos = await get<{ max_pos: number }>(
    "SELECT COALESCE(MAX(position), -1) as max_pos FROM lists WHERE board_id = ?",
    [boardId]
  );
  const nextPos = (maxPos?.max_pos ?? -1) + 1;

  const id = generateId();
  await run(
    "INSERT INTO lists (id, board_id, title, position) VALUES (?, ?, ?, ?)",
    [id, boardId, title, nextPos]
  );

  return c.json({ id, board_id: boardId, title, position: nextPos }, 201);
});

// PUT /api/lists/:listId
listRoutes.put("/lists/:listId", async (c) => {
  const user = c.get("user") as { id: string };
  const { listId } = c.req.param();

  const list = await get<{ board_id: string }>("SELECT board_id FROM lists WHERE id = ?", [listId]);
  if (!list) return c.json({ error: "List not found" }, 404);

  const access = await checkBoardAccess(user.id, list.board_id);
  if (!access || access === "viewer") return c.json({ error: "Permission denied" }, 403);

  const body = await c.req.json<{ title?: string }>();
  const title = body.title?.trim();
  if (!title) return c.json({ error: "Title is required" }, 400);

  await run("UPDATE lists SET title = ? WHERE id = ?", [title, listId]);
  return c.json({ ok: true });
});

// DELETE /api/lists/:listId
listRoutes.delete("/lists/:listId", async (c) => {
  const user = c.get("user") as { id: string };
  const { listId } = c.req.param();

  const list = await get<{ board_id: string }>("SELECT board_id FROM lists WHERE id = ?", [listId]);
  if (!list) return c.json({ error: "List not found" }, 404);

  const access = await checkBoardAccess(user.id, list.board_id);
  if (!access || !["admin", "owner", "member"].includes(access)) {
    return c.json({ error: "Permission denied" }, 403);
  }

  await run("DELETE FROM lists WHERE id = ?", [listId]);
  return c.json({ ok: true });
});

// POST /api/boards/:boardId/lists/reorder
listRoutes.post("/boards/:boardId/lists/reorder", async (c) => {
  const user = c.get("user") as { id: string };
  const { boardId } = c.req.param();

  const access = await checkBoardAccess(user.id, boardId);
  if (!access || access === "viewer") return c.json({ error: "Permission denied" }, 403);

  const body = await c.req.json<{ list_ids?: string[] }>();
  if (!body.list_ids || !Array.isArray(body.list_ids)) {
    return c.json({ error: "list_ids array is required" }, 400);
  }

  const db = c.env.DB;
  const stmts = body.list_ids.map((id, index) =>
    db.prepare("UPDATE lists SET position = ? WHERE id = ? AND board_id = ?").bind(index, id, boardId)
  );
  await db.batch(stmts);

  return c.json({ ok: true });
});
