import { Context, Next } from "hono";
import { get } from "./db.js";

type Env = { Bindings: { DB: D1Database } };

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

// Auth middleware - sets c.set("user", ...) if authenticated
export async function authMiddleware(c: Context<Env>, next: Next) {
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

  const user = await get<AuthUser>(
    "SELECT id, email, name FROM users WHERE id = ?",
    [session.user_id]
  );
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  c.set("user", user);
  await next();
}

// Check workspace membership
export async function checkWorkspaceMember(userId: string, workspaceId: string): Promise<string | null> {
  const member = await get<{ role: string }>(
    "SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?",
    [workspaceId, userId]
  );
  return member?.role ?? null;
}

// Check board access
export async function checkBoardAccess(userId: string, boardId: string): Promise<string | null> {
  // Direct board member
  const boardMember = await get<{ role: string }>(
    "SELECT role FROM board_members WHERE board_id = ? AND user_id = ?",
    [boardId, userId]
  );
  if (boardMember) return boardMember.role;

  // Workspace member with workspace-visible board
  const board = await get<{ workspace_id: string; visibility: string }>(
    "SELECT workspace_id, visibility FROM boards WHERE id = ?",
    [boardId]
  );
  if (!board) return null;

  if (board.visibility === "public") return "viewer";

  const wsRole = await checkWorkspaceMember(userId, board.workspace_id);
  if (wsRole && board.visibility === "workspace") return wsRole;

  return null;
}
