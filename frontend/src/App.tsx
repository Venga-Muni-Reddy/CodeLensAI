import React, { useEffect, useState } from "react";
import { useAuthStore } from "./stores/authStore";
import { Homepage } from "./features/home/Homepage";
import { DashboardLayout } from "./features/dashboard/DashboardLayout";
import { LoginForm } from "./features/auth/LoginForm";
import { RegisterForm } from "./features/auth/RegisterForm";
import { Cpu, ArrowLeft } from "lucide-react";

export const App: React.FC = () => {
  const { isAuthenticated, fetchMe } = useAuthStore();
  const [authView, setAuthView] = useState<"login" | "register" | null>(null);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // If user is authenticated, ALWAYS display the Stitch Developer Dashboard
  if (isAuthenticated) {
    return <DashboardLayout onNavigateHome={() => {}} />;
  }

  // If user is not authenticated and is viewing Login or Register
  if (authView === "login" || authView === "register") {
    return (
      <div className="min-h-screen bg-[#0c0e16] text-[#e2e8f0] flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200">
        <header className="px-6 py-4 border-b border-[#1d1f28] flex items-center justify-between">
          <button
            onClick={() => setAuthView(null)}
            className="flex items-center space-x-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>

          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-sm">CodeLens AI</span>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          {authView === "login" ? (
            <LoginForm onSwitchToRegister={() => setAuthView("register")} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setAuthView("login")} />
          )}
        </main>

        <footer className="py-4 text-center text-xs text-slate-500 border-t border-[#1d1f28]">
          © {new Date().getFullYear()} CodeLens AI • Tenant Isolation Active
        </footer>
      </div>
    );
  }

  // If user is not authenticated, show the Stitch Homepage
  return (
    <Homepage
      onNavigateAuth={(view) => setAuthView(view)}
      onNavigateDashboard={() => setAuthView("login")}
      isAuthenticated={isAuthenticated}
    />
  );
};

export default App;
