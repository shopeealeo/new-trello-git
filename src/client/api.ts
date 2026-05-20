const API_BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("session_id");
}

export function setToken(token: string) {
  localStorage.setItem("session_id", token);
}

export function clearToken() {
  localStorage.removeItem("session_id");
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data as T;
}

export const api = {
  // Auth
  register: (email: string, password: string, name: string) =>
    request<{ user: { id: string; email: string; name: string }; session_id: string; workspace_id: string }>(
      "POST", "/auth/register", { email, password, name }
    ),
  login: (email: string, password: string) =>
    request<{ user: { id: string; email: string; name: string }; session_id: string }>(
      "POST", "/auth/login", { email, password }
    ),
  logout: () => request("POST", "/auth/logout"),
  me: () => request<{ user: { id: string; email: string; name: string }; workspaces: unknown[] }>("GET", "/auth/me"),

  // Workspaces
  getWorkspaces: () => request<{ workspaces: unknown[] }>("GET", "/workspaces"),
  createWorkspace: (name: string) => request<{ id: string }>("POST", "/workspaces", { name }),
  getWorkspace: (id: string) => request<{ workspace: unknown; role: string }>("GET", `/workspaces/${id}`),
  getWorkspaceMembers: (id: string) => request<{ members: unknown[] }>("GET", `/workspaces/${id}/members`),
  inviteToWorkspace: (workspaceId: string, email: string, role: string) =>
    request("POST", `/workspaces/${workspaceId}/invites`, { email, role }),

  // Boards
  getBoards: (workspaceId: string) => request<{ boards: unknown[] }>("GET", `/workspaces/${workspaceId}/boards`),
  createBoard: (workspaceId: string, name: string, visibility?: string) =>
    request<{ id: string }>("POST", `/workspaces/${workspaceId}/boards`, { name, visibility }),
  getBoard: (boardId: string) => request<{ board: unknown; lists: unknown[]; labels: unknown[]; role: string }>("GET", `/boards/${boardId}`),
  updateBoard: (boardId: string, data: Record<string, unknown>) => request("PUT", `/boards/${boardId}`, data),
  deleteBoard: (boardId: string) => request("DELETE", `/boards/${boardId}`),
  archiveBoard: (boardId: string) => request("POST", `/boards/${boardId}/archive`),

  // Lists
  createList: (boardId: string, title: string) => request<{ id: string }>("POST", `/boards/${boardId}/lists`, { title }),
  updateList: (listId: string, title: string) => request("PUT", `/lists/${listId}`, { title }),
  deleteList: (listId: string) => request("DELETE", `/lists/${listId}`),
  reorderLists: (boardId: string, listIds: string[]) => request("POST", `/boards/${boardId}/lists/reorder`, { list_ids: listIds }),

  // Cards
  createCard: (listId: string, title: string, description?: string) =>
    request<{ id: string }>("POST", `/lists/${listId}/cards`, { title, description }),
  getCard: (cardId: string) => request<{ card: unknown; labels: unknown[]; comments: unknown[] }>("GET", `/cards/${cardId}`),
  updateCard: (cardId: string, data: Record<string, unknown>) => request("PUT", `/cards/${cardId}`, data),
  deleteCard: (cardId: string) => request("DELETE", `/cards/${cardId}`),
  moveCard: (cardId: string, targetListId: string, position: number) =>
    request("POST", `/cards/${cardId}/move`, { target_list_id: targetListId, position }),
  archiveCard: (cardId: string) => request("POST", `/cards/${cardId}/archive`),

  // Labels
  getLabels: (boardId: string) => request<{ labels: unknown[] }>("GET", `/boards/${boardId}/labels`),
  createLabel: (boardId: string, name: string, color: string) =>
    request<{ id: string }>("POST", `/boards/${boardId}/labels`, { name, color }),
  updateLabel: (labelId: string, data: { name?: string; color?: string }) => request("PUT", `/labels/${labelId}`, data),
  deleteLabel: (labelId: string) => request("DELETE", `/labels/${labelId}`),
  assignLabel: (cardId: string, labelId: string) => request("POST", `/cards/${cardId}/labels/${labelId}`),
  removeLabel: (cardId: string, labelId: string) => request("DELETE", `/cards/${cardId}/labels/${labelId}`),

  // Comments
  getComments: (cardId: string) => request<{ comments: unknown[] }>("GET", `/cards/${cardId}/comments`),
  createComment: (cardId: string, content: string) => request("POST", `/cards/${cardId}/comments`, { content }),
  updateComment: (commentId: string, content: string) => request("PUT", `/comments/${commentId}`, { content }),
  deleteComment: (commentId: string) => request("DELETE", `/comments/${commentId}`),

  // Activity
  getBoardActivity: (boardId: string) => request<{ activities: unknown[] }>("GET", `/boards/${boardId}/activity`),
  getCardActivity: (cardId: string) => request<{ activities: unknown[] }>("GET", `/cards/${cardId}/activity`),
};
