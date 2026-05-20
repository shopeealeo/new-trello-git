import { createContext } from "preact";
import { useContext, useState, useEffect } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { api, isLoggedIn, setToken, clearToken } from "./api";
import type { User, Workspace } from "./types";

interface AppState {
  user: User | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  setCurrentWorkspace: (ws: Workspace) => void;
  refreshWorkspaces: () => Promise<void>;
}

const AppContext = createContext<AppState>({} as AppState);

export function AppProvider({ children }: { children: ComponentChildren }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoggedIn()) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  async function loadUser() {
    try {
      const data = await api.me();
      setUser(data.user as User);
      setWorkspaces(data.workspaces as Workspace[]);
      if (data.workspaces.length > 0) {
        const saved = localStorage.getItem("current_workspace");
        const found = (data.workspaces as Workspace[]).find(w => w.id === saved);
        setCurrentWorkspace(found || (data.workspaces[0] as Workspace));
      }
    } catch {
      clearToken();
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const data = await api.login(email, password);
    setToken(data.session_id);
    await loadUser();
  }

  async function register(email: string, password: string, name: string) {
    const data = await api.register(email, password, name);
    setToken(data.session_id);
    await loadUser();
  }

  function logout() {
    api.logout().catch(() => {});
    clearToken();
    setUser(null);
    setWorkspaces([]);
    setCurrentWorkspace(null);
  }

  function handleSetCurrentWorkspace(ws: Workspace) {
    setCurrentWorkspace(ws);
    localStorage.setItem("current_workspace", ws.id);
  }

  async function refreshWorkspaces() {
    const data = await api.getWorkspaces();
    setWorkspaces(data.workspaces as Workspace[]);
  }

  return (
    <AppContext.Provider value={{
      user, workspaces, currentWorkspace, loading,
      login, register, logout,
      setCurrentWorkspace: handleSetCurrentWorkspace,
      refreshWorkspaces,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
