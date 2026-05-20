import { Hono } from "hono";
import { get, query } from "./db.js";
import { authMiddleware, checkBoardAccess } from "./middleware.js";

type Env = { Bindings: { DB: D1Database } };

export const activityRoutes = new Hono<Env>();

activityRoutes.use("*", authMiddleware);

// GET /api/boards/:boardId/activity
activityRoutes.get("/boards/:boardId/activity", async (c) => {
  const user = c.get("user") as { id: string };
  const { boardId } = c.req.param();

  const access = await checkBoardAccess(user.id, boardId);
  if (!access) return c.json({ error: "Access denied" }, 403);

  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
  const offset = parseInt(c.req.query("offset") || "0");

  const activities = await query(
    `SELECT a.id, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at,
            u.id as user_id, u.name as user_name, u.avatar_url
     FROM activity_logs a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.board_id = ?
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`,
    [boardId, limit, offset]
  );

  return c.json({ activities });
});

// GET /api/cards/:cardId/activity
activityRoutes.get("/cards/:cardId/activity", async (c) => {
  const user = c.get("user") as { id: string };
  const { cardId } = c.req.param();

  const card = await get<{ board_id: string }>(
    "SELECT board_id FROM cards WHERE id = ?", [cardId]
  );
  if (!card) return c.json({ error: "Card not found" }, 404);

  const access = await checkBoardAccess(user.id, card.board_id);
  if (!access) return c.json({ error: "Access denied" }, 403);

  const activities = await query(
    `SELECT a.id, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at,
            u.id as user_id, u.name as user_name
     FROM activity_logs a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.card_id = ?
     ORDER BY a.created_at DESC
     LIMIT 50`,
    [cardId]
  );

  return c.json({ activities });
});
