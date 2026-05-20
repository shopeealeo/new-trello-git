import { AppProvider, useApp } from "./context";
import { LoginPage } from "./pages/login";
import { DashboardPage } from "./pages/dashboard";
import { BoardPage } from "./pages/board";
import { useState, useEffect } from "preact/hooks";

function Router() {
  const { user, loading } = useApp();
  const [route, setRoute] = useState(window.location.hash || "#/");

  useEffect(() => {
    const handler = () => setRoute(window.location.hash || "#/");
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  if (loading) {
    return (
      <div class="flex items-center justify-center h-screen bg-gray-50">
        <div class="text-gray-500 text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Route: #/boards/:boardId
  const boardMatch = route.match(/^#\/boards\/(.+)$/);
  if (boardMatch) {
    return <BoardPage boardId={boardMatch[1]} />;
  }

  return <DashboardPage />;
}

export function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
