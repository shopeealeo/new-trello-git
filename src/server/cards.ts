import { Hono } from "hono";
import { get, run, generateId, query } from "./db.js";
import { authMiddleware, checkBoardAccess } from "./middleware.js";

type Env = { Bindings: { DB: D1Database } };

export const cardRoutes = new Hono<Env>();

cardRoutes.use("*", authMiddleware);

// POST /api/lists/:listId/cards
cardRoutes.post("/lists/:listId/cards", async (c) => {
  const user = c.get("user") as { id: string };
  const { listId } = c.req.param();

  const list = await get<{ board_id: string }>("SELECT board_id FROM lists WHERE id = ?", [listId]);
  if (!list) return c.json({ error: "List not found" }, 404);

  const access = await checkBoardAccess(user.id, list.board_id);
  if (!access || access === "viewer") return c.json({ error: "Permission denied" }, 403);

  const body = await c.req.json<{ title?: string; description?: string }>();
  const title = body.title?.trim();
  if (!title) return c.json({ error: "Title is required" }, 400);

  const maxPos = await get<{ max_pos: number }>(
    "SELECT COALESCE(MAX(position), -1) as max_pos FROM cards WHERE list_id = ?",
    [listId]
  );
  const nextPos = (maxPos?.max_pos ?? -1) + 1;

  const id = generateId();
  await run(
    "INSERT INTO cards (id, list_id, board_id, title, description, position, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, listId, list.board_id, title, body.description?.trim() || "", nextPos, user.id]
  );

  // Activity log
  await run(
    "INSERT INTO activity_logs (id, board_id, card_id, user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [generateId(), list.board_id, id, user.id, "created", "card", id, JSON.stringify({ title })]
  );

  return c.json({ id, list_id: listId, board_id: list.board_id, title, position: nextPos }, 201);
});

// GET /api/cards/:cardId
cardRoutes.get("/cards/:cardId", async (c) => {
  const user = c.get("user") as { id: string };
  const { cardId } = c.req.param();

  const card = await get<{ board_id: string }>(
    "SELECT board_id FROM cards WHERE id = ?", [cardId]
  );
  if (!card) return c.json({ error: "Card not found" }, 404);

  const access = await checkBoardAccess(user.id, card.board_id);
  if (!access) return c.json({ error: "Access denied" }, 403);

  const fullCard = await get(
    `SELECT id, list_id, board_id, title, description, position, due_date, priority, assigned_to, created_by, created_at, updated_at
     FROM cards WHERE id = ?`,
    [cardId]
  );

  const labels = await query(
    `SELECT l.id, l.name, l.color FROM labels l
     JOIN card_labels cl ON cl.label_id = l.id
     WHERE cl.card_id = ?`,
    [cardId]
  );

  const comments = await query(
    `SELECT c.id, c.content, c.created_at, c.updated_at, u.id as user_id, u.name as user_name
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.card_id = ? ORDER BY c.created_at ASC`,
    [cardId]
  );

  return c.json({ card: fullCard, labels, comments });
});

// PUT /api/cards/:cardId
cardRoutes.put("/cards/:cardId", async (c) => {
  const user = c.get("user") as { id: string };
  const { cardId } = c.req.param();

  const card = await get<{ board_id: string }>("SELECT board_id FROM cards WHERE id = ?", [cardId]);
  if (!card) return c.json({ error: "Card not found" }, 404);

  const access = await checkBoardAccess(user.id, card.board_id);
  if (!access || access === "viewer") return c.json({ error: "Permission denied" }, 403);

  const body = await c.req.json<{
    title?: string; description?: string; due_date?: string | null;
    priority?: string; assigned_to?: string | null;
  }>();

  const updates: string[] = [];
  const params: unknown[] = [];

  if (body.title !== undefined) { updates.push("title = ?"); params.push(body.title.trim()); }
  if (body.description !== undefined) { updates.push("description = ?"); params.push(body.description); }
  if (body.due_date !== undefined) { updates.push("due_date = ?"); params.push(body.due_date); }
  if (body.priority !== undefined) { updates.push("priority = ?"); params.push(body.priority); }
  if (body.assigned_to !== undefined) { updates.push("assigned_to = ?"); params.push(body.assigned_to); }

  if (updates.length === 0) return c.json({ error: "Nothing to update" }, 400);

  updates.push("updated_at = datetime('now')");
  params.push(cardId);

  await run(`UPDATE cards SET ${updates.join(", ")} WHERE id = ?`, params);

  // Activity log
  await run(
    "INSERT INTO activity_logs (id, board_id, card_id, user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [generateId(), card.board_id, cardId, user.id, "updated", "card", cardId, JSON.stringify(body)]
  );

  return c.json({ ok: true });
});

// DELETE /api/cards/:cardId
cardRoutes.delete("/cards/:cardId", async (c) => {
  const user = c.get("user") as { id: string };
  const { cardId } = c.req.param();

  const card = await get<{ board_id: string; title: string }>(
    "SELECT board_id, title FROM cards WHERE id = ?", [cardId]
  );
  if (!card) return c.json({ error: "Card not found" }, 404);

  const access = await checkBoardAccess(user.id, card.board_id);
  if (!access || access === "viewer") return c.json({ error: "Permission denied" }, 403);

  await run("DELETE FROM cards WHERE id = ?", [cardId]);

  await run(
    "INSERT INTO activity_logs (id, board_id, card_id, user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [generateId(), card.board_id, null, user.id, "deleted", "card", cardId, JSON.stringify({ title: card.title })]
  );

  return c.json({ ok: true });
});

// POST /api/cards/:cardId/move
cardRoutes.post("/cards/:cardId/move", async (c) => {
  const user = c.get("user") as { id: string };
  const { cardId } = c.req.param();

  const card = await get<{ board_id: string; list_id: string; title: string }>(
    "SELECT board_id, list_id, title FROM cards WHERE id = ?", [cardId]
  );
  if (!card) return c.json({ error: "Card not found" }, 404);

  const access = await checkBoardAccess(user.id, card.board_id);
  if (!access || access === "viewer") return c.json({ error: "Permission denied" }, 403);

  const body = await c.req.json<{ target_list_id?: string; position?: number }>();
  if (!body.target_list_id || body.position === undefined) {
    return c.json({ error: "target_list_id and position are required" }, 400);
  }

  const targetList = await get<{ id: string; board_id: string }>(
    "SELECT id, board_id FROM lists WHERE id = ?", [body.target_list_id]
  );
  if (!targetList) return c.json({ error: "Target list not found" }, 404);

  // Shift positions in target list
  const db = c.env.DB;
  await db.batch([
    db.prepare("UPDATE cards SET position = position + 1 WHERE list_id = ? AND position >= ? AND id != ?")
      .bind(body.target_list_id, body.position, cardId),
    db.prepare("UPDATE cards SET list_id = ?, position = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(body.target_list_id, body.position, cardId),
  ]);

  // Activity log
  await run(
    "INSERT INTO activity_logs (id, board_id, card_id, user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [generateId(), card.board_id, cardId, user.id, "moved", "card", cardId,
     JSON.stringify({ from_list: card.list_id, to_list: body.target_list_id, title: card.title })]
  );

  return c.json({ ok: true });
});

// POST /api/cards/:cardId/archive
cardRoutes.post("/cards/:cardId/archive", async (c) => {
  const user = c.get("user") as { id: string };
  const { cardId } = c.req.param();

  const card = await get<{ board_id: string }>("SELECT board_id FROM cards WHERE id = ?", [cardId]);
  if (!card) return c.json({ error: "Card not found" }, 404);

  const access = await checkBoardAccess(user.id, card.board_id);
  if (!access || access === "viewer") return c.json({ error: "Permission denied" }, 403);

  await run("UPDATE cards SET archived_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", [cardId]);
  return c.json({ ok: true });
});
