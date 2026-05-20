import { useState, useEffect, useRef } from "preact/hooks";
import { api } from "../api";
import type { List, Card, Label } from "../types";

interface BoardPageProps {
  boardId: string;
}

export function BoardPage({ boardId }: BoardPageProps) {
  const [boardName, setBoardName] = useState("");
  const [lists, setLists] = useState<List[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [newListTitle, setNewListTitle] = useState("");
  const [showAddList, setShowAddList] = useState(false);
  const [dragCard, setDragCard] = useState<{ cardId: string; fromListId: string } | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  useEffect(() => {
    loadBoard();
  }, [boardId]);

  async function loadBoard() {
    setLoading(true);
    try {
      const data = await api.getBoard(boardId);
      const board = data.board as { name: string };
      setBoardName(board.name);
      setLists(data.lists as List[]);
      setLabels(data.labels as Label[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function addList(e: Event) {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    try {
      await api.createList(boardId, newListTitle.trim());
      setNewListTitle("");
      setShowAddList(false);
      loadBoard();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function addCard(listId: string, title: string) {
    try {
      await api.createCard(listId, title);
      loadBoard();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function deleteList(listId: string) {
    if (!confirm("Delete this list and all its cards?")) return;
    await api.deleteList(listId);
    loadBoard();
  }

  async function deleteCard(cardId: string) {
    if (!confirm("Delete this card?")) return;
    await api.deleteCard(cardId);
    setEditingCard(null);
    loadBoard();
  }

  function handleDragStart(cardId: string, fromListId: string) {
    setDragCard({ cardId, fromListId });
  }

  async function handleDrop(targetListId: string, position: number) {
    if (!dragCard) return;
    if (dragCard.fromListId === targetListId) {
      setDragCard(null);
      return;
    }
    try {
      await api.moveCard(dragCard.cardId, targetListId, position);
      loadBoard();
    } catch (err) {
      console.error(err);
    }
    setDragCard(null);
  }

  if (loading) {
    return (
      <div class="flex items-center justify-center h-screen bg-gray-100">
        <div class="text-gray-500">Loading board...</div>
      </div>
    );
  }

  return (
    <div class="h-screen flex flex-col bg-gray-100">
      {/* Board header */}
      <header class="bg-white border-b px-6 py-3 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-4">
          <a href="#/" class="text-gray-400 hover:text-gray-600 text-sm">← Back</a>
          <h1 class="text-lg font-bold text-gray-900">{boardName}</h1>
        </div>
      </header>

      {/* Board content - horizontal scroll */}
      <div class="flex-1 overflow-x-auto p-4">
        <div class="flex gap-4 h-full items-start">
          {lists.map(list => (
            <ListColumn
              key={list.id}
              list={list}
              labels={labels}
              onAddCard={addCard}
              onDeleteList={deleteList}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onCardClick={setEditingCard}
              isDragTarget={dragCard !== null && dragCard.fromListId !== list.id}
            />
          ))}

          {/* Add list */}
          <div class="w-72 shrink-0">
            {showAddList ? (
              <form onSubmit={addList} class="bg-white rounded-lg shadow-sm p-3">
                <input
                  type="text"
                  value={newListTitle}
                  onInput={(e) => setNewListTitle((e.target as HTMLInputElement).value)}
                  placeholder="List title..."
                  class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <div class="flex gap-2 mt-2">
                  <button type="submit" class="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium">
                    Add List
                  </button>
                  <button type="button" onClick={() => setShowAddList(false)} class="text-gray-500 text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowAddList(true)}
                class="w-full bg-white/60 hover:bg-white rounded-lg p-3 text-left text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
              >
                + Add another list
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Card detail modal */}
      {editingCard && (
        <CardModal
          card={editingCard}
          labels={labels}
          boardId={boardId}
          onClose={() => setEditingCard(null)}
          onUpdate={loadBoard}
          onDelete={deleteCard}
        />
      )}
    </div>
  );
}

// List Column Component
function ListColumn({ list, labels, onAddCard, onDeleteList, onDragStart, onDrop, onCardClick, isDragTarget }: {
  list: List;
  labels: Label[];
  onAddCard: (listId: string, title: string) => void;
  onDeleteList: (listId: string) => void;
  onDragStart: (cardId: string, fromListId: string) => void;
  onDrop: (targetListId: string, position: number) => void;
  onCardClick: (card: Card) => void;
  isDragTarget: boolean;
}) {
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");

  function handleAddCard(e: Event) {
    e.preventDefault();
    if (!newCardTitle.trim()) return;
    onAddCard(list.id, newCardTitle.trim());
    setNewCardTitle("");
  }

  return (
    <div
      class={`w-72 shrink-0 bg-gray-200 rounded-lg flex flex-col max-h-[calc(100vh-140px)] ${isDragTarget ? "ring-2 ring-blue-400" : ""}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(list.id, list.cards.length)}
    >
      {/* List header */}
      <div class="px-3 py-2 flex items-center justify-between">
        <h3 class="font-semibold text-gray-800 text-sm">{list.title}</h3>
        <div class="flex items-center gap-1">
          <span class="text-xs text-gray-500">{list.cards.length}</span>
          <button
            onClick={() => onDeleteList(list.id)}
            class="text-gray-400 hover:text-red-500 text-xs p-1"
            title="Delete list"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Cards */}
      <div class="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
        {list.cards.map(card => (
          <div
            key={card.id}
            draggable
            onDragStart={() => onDragStart(card.id, list.id)}
            onClick={() => onCardClick(card)}
            class="bg-white rounded-lg shadow-sm p-3 cursor-pointer hover:shadow-md transition-shadow border border-gray-100"
          >
            {/* Card labels */}
            {card.labels && card.labels.length > 0 && (
              <div class="flex flex-wrap gap-1 mb-2">
                {card.labels.map(labelId => {
                  const label = labels.find(l => l.id === labelId);
                  return label ? (
                    <span
                      key={labelId}
                      class="h-2 w-8 rounded-full inline-block"
                      style={{ backgroundColor: label.color }}
                      title={label.name}
                    />
                  ) : null;
                })}
              </div>
            )}
            <p class="text-sm text-gray-800">{card.title}</p>
            {card.due_date && (
              <div class="mt-2 text-xs text-gray-500">📅 {new Date(card.due_date).toLocaleDateString()}</div>
            )}
            {card.priority && card.priority !== "none" && (
              <span class={`mt-1 inline-block text-xs px-1.5 py-0.5 rounded ${
                card.priority === "urgent" ? "bg-red-100 text-red-700" :
                card.priority === "high" ? "bg-orange-100 text-orange-700" :
                card.priority === "medium" ? "bg-yellow-100 text-yellow-700" :
                "bg-green-100 text-green-700"
              }`}>
                {card.priority}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Add card */}
      <div class="px-2 pb-2">
        {showAddCard ? (
          <form onSubmit={handleAddCard}>
            <textarea
              value={newCardTitle}
              onInput={(e) => setNewCardTitle((e.target as HTMLTextAreaElement).value)}
              placeholder="Enter card title..."
              class="w-full px-3 py-2 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddCard(e); }
                if (e.key === "Escape") setShowAddCard(false);
              }}
            />
            <div class="flex gap-2 mt-1">
              <button type="submit" class="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium">
                Add Card
              </button>
              <button type="button" onClick={() => setShowAddCard(false)} class="text-gray-500 text-xs">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddCard(true)}
            class="w-full text-left text-gray-500 hover:text-gray-700 text-sm py-1.5 px-2 rounded hover:bg-gray-300/50 transition-colors"
          >
            + Add a card
          </button>
        )}
      </div>
    </div>
  );
}

// Card Modal
function CardModal({ card, labels, boardId, onClose, onUpdate, onDelete }: {
  card: Card;
  labels: Label[];
  boardId: string;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: (cardId: string) => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const [priority, setPriority] = useState(card.priority || "none");
  const [dueDate, setDueDate] = useState(card.due_date || "");
  const [comments, setComments] = useState<Array<{ id: string; content: string; user_name: string; created_at: string }>>([]);
  const [newComment, setNewComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCardDetails();
  }, [card.id]);

  async function loadCardDetails() {
    try {
      const data = await api.getCard(card.id);
      const c = data.card as { description: string; priority: string; due_date: string };
      setDescription(c.description || "");
      setPriority(c.priority || "none");
      setDueDate(c.due_date || "");
      setComments(data.comments as typeof comments);
    } catch (err) {
      console.error(err);
    }
  }

  async function saveCard() {
    setSaving(true);
    try {
      await api.updateCard(card.id, { title, description, priority, due_date: dueDate || null });
      onUpdate();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function addComment(e: Event) {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await api.createComment(card.id, newComment.trim());
      setNewComment("");
      loadCardDetails();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div class="fixed inset-0 bg-black/50 flex items-start justify-center pt-16 z-50 overflow-y-auto" onClick={onClose}>
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 mb-8" onClick={(e) => e.stopPropagation()}>
        <div class="p-6">
          {/* Title */}
          <input
            type="text"
            value={title}
            onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
            class="text-xl font-bold text-gray-900 w-full border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 px-0 py-1"
          />

          {/* Meta */}
          <div class="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label class="text-xs font-medium text-gray-500 uppercase">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority((e.target as HTMLSelectElement).value)}
                class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="none">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 uppercase">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onInput={(e) => setDueDate((e.target as HTMLInputElement).value)}
                class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          {/* Description */}
          <div class="mt-4">
            <label class="text-xs font-medium text-gray-500 uppercase">Description</label>
            <textarea
              value={description}
              onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
              class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
              rows={4}
              placeholder="Add a description..."
            />
          </div>

          {/* Save button */}
          <div class="mt-4 flex gap-3">
            <button
              onClick={saveCard}
              disabled={saving}
              class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={() => onDelete(card.id)}
              class="text-red-600 hover:text-red-700 px-4 py-2 text-sm font-medium"
            >
              Delete Card
            </button>
          </div>

          {/* Comments */}
          <div class="mt-6 border-t pt-4">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">Comments</h3>
            <div class="space-y-3 mb-4">
              {comments.map(comment => (
                <div key={comment.id} class="bg-gray-50 rounded-lg p-3">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-medium text-gray-700">{comment.user_name}</span>
                    <span class="text-xs text-gray-400">{new Date(comment.created_at).toLocaleString()}</span>
                  </div>
                  <p class="text-sm text-gray-600">{comment.content}</p>
                </div>
              ))}
              {comments.length === 0 && (
                <p class="text-sm text-gray-400">No comments yet</p>
              )}
            </div>
            <form onSubmit={addComment} class="flex gap-2">
              <input
                type="text"
                value={newComment}
                onInput={(e) => setNewComment((e.target as HTMLInputElement).value)}
                placeholder="Write a comment..."
                class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <button type="submit" class="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium">
                Post
              </button>
            </form>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
        >
          ×
        </button>
      </div>
    </div>
  );
}
