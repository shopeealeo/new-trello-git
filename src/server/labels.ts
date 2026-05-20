import { Hono } from "hono";
import { get, run, generateId, query } from "./db.js";
import { authMiddleware, checkBoardAccess } from "./middleware.js";

type Env = { Bindings: { DB: D1Database } };

export const labelRoutes = new Hono<Env>();

labelRoutes.use("*", authMiddleware);

// GET /api/boards/:boardId/labels
labelRoutes.get("/boards/:boardId/labels", async (c) => {
  const user = c.get("user") as { id: string };
  const { boardId } = c.req.param();

  const access = await checkBoardAccess(user.id, boardId);
  if (!access) return c.json({ error: "Access denied" }, 403);

  const labels = await query(
    "SELECT id, name, color, created_at FROM labels WHERE board_id = ? ORDER BY created_at ASC",
    [boardId]
  );
  return c.json({ labels });
});

// POST /api/boards/:boardId/labels
labelRoutes.post("/boards/:boardId/labels", async (c) => {
  const user = c.get("user") as { id: string };
  const { boardId } = c.req.param();

  const access = await checkBoardAccess(user.id, boardId);
  if (!access || access === "viewer") return c.json({ error: "Permission denied" }, 403);

  const body = await c.req.json<{ name?: string; color?: string }>();
  const name = body.name?.trim();
  if (!name) return c.json({ error: "Name is required" }, 400);

  const color = body.color || "#6366f1";
  const id = generateId();

  await run(
    "INSERT INTO labels (id, board_id, name, color) VALUES (?, ?, ?, ?)",
    [id, boardId, name, color]
  );

  return c.json({ id, name, color }, 201);
});

// PUT /api/labels/:labelId
labelRoutes.put("/labels/:labelId", async (c) => {
  const user = c.get("user") as { id: string };
  const { labelId } = c.req.param();

  const label = await get<{ board_id: string }>("SELECT board_id FROM labels WHERE id = ?", [labelId]);
  if (!label) return c.json({ error: "Label not found" }, 404);

  const access = await checkBoardAccess(user.id, label.board_id);
  if (!access || access === "viewer") return c.json({ error: "Permission denied" }, 403);

  const body = await c.req.json<{ name?: string; color?: string }>();
  const updates: string[] = [];
  const params: unknown[] = [];

  if (body.name?.trim()) { updates.push("name = ?"); params.push(body.name.trim()); }
  if (body.color) { updates.push("color = ?"); params.push(body.color); }

  if (updates.length === 0) return c.json({ error: "Nothing to update" }, 400);
  params.push(labelId);

  await run(`UPDATE labels SET ${updates.join(", ")} WHERE id = ?`, params);
  return c.json({ ok: true });
});

// DELETE /api/labels/:labelId
labelRoutes.delete("/labels/:labelId", async (c) => {
  const user = c.get("user") as { id: string };
  const { labelId } = c.req.param();

  const label = await get<{ board_id: string }>("SELECT board_id FROM labels WHERE id = ?", [labelId]);
  if (!label) return c.json({ error: "Label not found" }, 404);

  const access = await checkBoardAccess(user.id, label.board_id);
  if (!access || !["admin", "owner", "member"].includes(access)) {
    return c.json({ error: "Permission denied" }, 403);
  }

  await run("DELETE FROM labels WHERE id = ?", [labelId]);
  return c.json({ ok: true });
});

// POST /api/cards/:cardId/labels/:labelId - assign label to card
labelRoutes.post("/cards/:cardId/labels/:labelId", async (c) => {
  const user = c.get("user") as { id: string };
  const { cardId, labelId } = c.req.param();

  const card = await get<{ board_id: string }>("SELECT board_id FROM cards WHERE id = ?", [cardId]);
  if (!card) return c.json({ error: "Card not found" }, 404);

  const access = await checkBoardAccess(user.id, card.board_id);
  if (!access || access === "viewer") return c.json({ error: "Permission denied" }, 403);

  try {
    await run("INSERT INTO card_labels (card_id, label_id) VALUES (?, ?)", [cardId, labelId]);
  } catch {
    // Already assigned, ignore
  }

  return c.json({ ok: true });
});

// DELETE /api/cards/:cardId/labels/:labelId - remove label from card
labelRoutes.delete("/cards/:cardId/labels/:labelId", async (c) => {
  const user = c.get("user") as { id: string };
  const { cardId, labelId } = c.req.param();

  const card = await get<{ board_id: string }>("SELECT board_id FROM cards WHERE id = ?", [cardId]);
  if (!card) return c.json({ error: "Card not found" }, 404);

  const access = await checkBoardAccess(user.id, card.board_id);
  if (!access || access === "viewer") return c.json({ error: "Permission denied" }, 403);

  await run("DELETE FROM card_labels WHERE card_id = ? AND label_id = ?", [cardId, labelId]);
  return c.json({ ok: true });
});
