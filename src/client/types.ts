export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  role: string;
  created_at: string;
}

export interface Board {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  visibility: string;
  archived_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface List {
  id: string;
  board_id: string;
  title: string;
  position: number;
  cards: Card[];
}

export interface Card {
  id: string;
  list_id: string;
  board_id: string;
  title: string;
  description: string;
  position: number;
  due_date: string | null;
  priority: string;
  assigned_to: string | null;
  created_by: string | null;
  labels: string[];
  created_at: string;
  updated_at: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Comment {
  id: string;
  content: string;
  user_id: string;
  user_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: string;
  user_id: string;
  user_name: string;
  created_at: string;
}
