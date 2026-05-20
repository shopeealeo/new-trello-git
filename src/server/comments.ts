import { Hono } from "hono";
import { get, run, generateId, query } from "./db.js";
import { authMiddleware, checkBoardAccess } from "./middleware.js";

type Env = { Bindings: { DB: D1Database } };

export const commentRoutes = new Hono<Env>();

commentRoutes.use("*", authMiddleware);

// GET /api/cards/:cardId/comments
commentRoutes.get("/cards/:cardId/comments", async (c) => {
  const user = c.get("user") as { id: string };
  const { cardId } = c.req.param();

  const card = await get<{ board_id: string }>("SELECT board_id FROM cards WHERE id = ?", [cardId]);
  if (!card) return c.json({ error: "Card not found" }, 404);

  const access = await checkBoardAccess(user.id, card.board_id);
  if (!access) return c.json({ error: "Access denied" }, 403);

  const comments = await query(
    `SELECT c.id, c.content, c.created_at, c.updated_at, u.id as user_id, u.name as user_name, u.avatar_url
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.card_id = ? ORDER BY c.created_at ASC`,
    [cardId]
  );

  return c.json({ comments });
});

// POST /api/cards/:cardId/comments
commentRoutes.post("/cards/:cardId/comments", async (c) => {
  const user = c.get("user") as { id: string; name: string };
  const { cardId } = c.req.param();

  const card = await get<{ board_id: string }>("SELECT board_id FROM cards WHERE id = ?", [cardId]);
  if (!card) return c.json({ error: "Card not found" }, 404);

  const access = await checkBoardAccess(user.id, card.board_id);
  if (!access || access === "viewer") return c.json({ error: "Permission denied" }, 403);

  const body = await c.req.json<{ content?: string }>();
  const content = body.content?.trim();
  if (!content) return c.json({ error: "Content is required" }, 400);

  const id = generateId();
  await run(
    "INSERT INTO comments (id, card_id, user_id, content) VALUES (?, ?, ?, ?)",
    [id, cardId, user.id, content]
  );

  // Activity log
  await run(
    "INSERT INTO activity_logs (id, board_id, card_id, user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [generateId(), card.board_id, cardId, user.id, "commented", "comment", id,
     JSON.stringify({ excerpt: content.slice(0, 100) })]
  );

  return c.json({ id, content, user_id: user.id, user_name: user.name }, 201);
});

// PUT /api/comments/:commentId
commentRoutes.put("/comments/:commentId", async (c) => {
  const user = c.get("user") as { id: string };
  const { commentId } = c.req.param();

  const comment = await get<{ user_id: string; card_id: string }>(
    "SELECT user_id, card_id FROM comments WHERE id = ?", [commentId]
  );
  if (!comment) return c.json({ error: "Comment not found" }, 404);
  if (comment.user_id !== user.id) return c.json({ error: "Can only edit own comments" }, 403);

  const body = await c.req.json<{ content?: string }>();
  const content = body.content?.trim();
  if (!content) return c.json({ error: "Content is required" }, 400);

  await run(
    "UPDATE comments SET content = ?, updated_at = datetime('now') WHERE id = ?",
    [content, commentId]
  );

  return c.json({ ok: true });
});

// DELETE /api/comments/:commentId
commentRoutes.delete("/comments/:commentId", async (c) => {
  const user = c.get("user") as { id: string };
  const { commentId } = c.req.param();

  const comment = await get<{ user_id: string; card_id: string }>(
    "SELECT user_id, card_id FROM comments WHERE id = ?", [commentId]
  );
  if (!comment) return c.json({ error: "Comment not found" }, 404);

  // Owner of comment or board admin can delete
  const card = await get<{ board_id: string }>("SELECT board_id FROM cards WHERE id = ?", [comment.card_id]);
  if (!card) return c.json({ error: "Card not found" }, 404);

  if (comment.user_id !== user.id) {
    const access = await checkBoardAccess(user.id, card.board_id);
    if (!access || !["admin", "owner"].includes(access)) {
      return c.json({ error: "Permission denied" }, 403);
    }
  }

  await run("DELETE FROM comments WHERE id = ?", [commentId]);
  return c.json({ ok: true });
});
