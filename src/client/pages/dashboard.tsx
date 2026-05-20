import { useState, useEffect } from "preact/hooks";
import { useApp } from "../context";
import { api } from "../api";
import type { Board } from "../types";

export function DashboardPage() {
  const { user, workspaces, currentWorkspace, setCurrentWorkspace, logout } = useApp();
  const [boards, setBoards] = useState<Board[]>([]);
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentWorkspace) loadBoards();
  }, [currentWorkspace]);

  async function loadBoards() {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      const data = await api.getBoards(currentWorkspace.id);
      setBoards(data.boards as Board[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function createBoard(e: Event) {
    e.preventDefault();
    if (!newBoardName.trim() || !currentWorkspace) return;
    try {
      await api.createBoard(currentWorkspace.id, newBoardName.trim());
      setNewBoardName("");
      setShowNewBoard(false);
      loadBoards();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header class="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <h1 class="text-xl font-bold text-gray-900">New Trello</h1>
          {workspaces.length > 1 && (
            <select
              value={currentWorkspace?.id || ""}
              onChange={(e) => {
                const ws = workspaces.find(w => w.id === (e.target as HTMLSelectElement).value);
                if (ws) setCurrentWorkspace(ws);
              }}
              class="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
            >
              {workspaces.map(ws => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
          )}
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-600">{user?.name || user?.email}</span>
          <button onClick={logout} class="text-sm text-red-600 hover:text-red-700 font-medium">
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <main class="max-w-6xl mx-auto p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-semibold text-gray-800">
            {currentWorkspace?.name || "Boards"}
          </h2>
          <button
            onClick={() => setShowNewBoard(true)}
            class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + New Board
          </button>
        </div>

        {showNewBoard && (
          <form onSubmit={createBoard} class="mb-6 bg-white p-4 rounded-lg shadow-sm border flex gap-3">
            <input
              type="text"
              value={newBoardName}
              onInput={(e) => setNewBoardName((e.target as HTMLInputElement).value)}
              placeholder="Board name..."
              class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Create
            </button>
            <button type="button" onClick={() => setShowNewBoard(false)} class="text-gray-500 px-3">
              Cancel
            </button>
          </form>
        )}

        {loading ? (
          <div class="text-gray-500">Loading boards...</div>
        ) : boards.length === 0 ? (
          <div class="text-center py-16">
            <div class="text-gray-400 text-5xl mb-4">📋</div>
            <p class="text-gray-500 text-lg">No boards yet</p>
            <p class="text-gray-400 text-sm mt-1">Create your first board to get started</p>
          </div>
        ) : (
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {boards.map(board => (
              <a
                key={board.id}
                href={`#/boards/${board.id}`}
                class="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all group"
              >
                <h3 class="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                  {board.name}
                </h3>
                {board.description && (
                  <p class="text-sm text-gray-500 mt-1 line-clamp-2">{board.description}</p>
                )}
                <div class="mt-3 flex items-center gap-2">
                  <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {board.visibility}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
