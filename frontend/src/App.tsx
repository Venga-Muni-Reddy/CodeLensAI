import React, { useEffect, useState } from "react";
import { apiClient } from "./lib/api-client";
import { useAuthStore } from "./stores/authStore";
import { LoginForm } from "./features/auth/LoginForm";
import { RegisterForm } from "./features/auth/RegisterForm";
import { UserProfileView } from "./features/auth/UserProfileView";
import {
  Activity,
  LogIn,
  UserPlus,
  Shield,
} from "lucide-react";

interface HealthLive {
  status: string;
  environment: string;
  version: string;
}

interface HealthReady {
  status: string;
  services: {
    mongodb: string;
    redis: string;
  };
}

export const App: React.FC = () => {
  const { isAuthenticated, fetchMe } = useAuthStore();
  const [authView, setAuthView] = useState<"login" | "register">("login");
  const [liveData, setLiveData] = useState<HealthLive | null>(null);
  const [readyData, setReadyData] = useState<HealthReady | null>(null);

  const fetchHealth = async () => {
    try {
      const [liveRes, readyRes] = await Promise.all([
        apiClient.get("/health/live"),
        apiClient.get("/health/ready").catch((err) => err.response || { data: null }),
      ]);
      setLiveData(liveRes.data?.data || null);
      setReadyData(readyRes.data?.data || null);
    } catch {
      setLiveData(null);
      setReadyData(null);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchMe();
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top Navigation Bar */}
      <nav
        style={{
          borderBottom: "1px solid var(--border-color)",
          background: "rgba(11, 15, 25, 0.8)",
          backdropFilter: "blur(12px)",
          padding: "0.75rem 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "rgba(99, 102, 241, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Activity size={18} color="#818cf8" />
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
            CodeLensAI
          </span>
          <span
            style={{
              fontSize: "0.65rem",
              padding: "2px 6px",
              borderRadius: "4px",
              background: "rgba(255, 255, 255, 0.05)",
              color: "var(--text-muted)",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            F-001 Auth Active
          </span>
        </div>

        {/* Top Right Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* Health Indicators */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.75rem",
              background: "rgba(255, 255, 255, 0.03)",
              padding: "4px 10px",
              borderRadius: "999px",
              border: "1px solid var(--border-color)",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: readyData?.services?.mongodb === "connected" ? "#10b981" : "#f59e0b",
              }}
            />
            <span style={{ color: "var(--text-secondary)" }}>
              API & DB:{" "}
              <strong style={{ color: liveData ? "#10b981" : "#ef4444" }}>
                {liveData ? "Online" : "Offline"}
              </strong>
            </span>
          </div>

          {!isAuthenticated && (
            <div
              style={{
                display: "flex",
                background: "rgba(255, 255, 255, 0.04)",
                padding: "2px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
              }}
            >
              <button
                onClick={() => setAuthView("login")}
                style={{
                  padding: "4px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: authView === "login" ? "rgba(99, 102, 241, 0.3)" : "transparent",
                  color: authView === "login" ? "#ffffff" : "var(--text-muted)",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <LogIn size={13} /> Sign In
              </button>

              <button
                onClick={() => setAuthView("register")}
                style={{
                  padding: "4px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: authView === "register" ? "rgba(99, 102, 241, 0.3)" : "transparent",
                  color: authView === "register" ? "#ffffff" : "var(--text-muted)",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <UserPlus size={13} /> Create Account
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: "2.5rem 1.5rem" }}>
        {isAuthenticated ? (
          <UserProfileView />
        ) : authView === "login" ? (
          <LoginForm onSwitchToRegister={() => setAuthView("register")} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setAuthView("login")} />
        )}
      </main>

      {/* Footer System Status Bar */}
      <footer
        style={{
          borderTop: "1px solid var(--border-color)",
          padding: "1rem 1.5rem",
          background: "rgba(11, 15, 25, 0.9)",
          fontSize: "0.8rem",
          color: "var(--text-muted)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span>CodeLensAI &bull; Autonomous Code Graph & Static Intelligence</span>
          <span>&bull;</span>
          <span style={{ color: "#38bdf8" }}>MongoDB 7.0: {readyData?.services?.mongodb || "connected"}</span>
          <span>&bull;</span>
          <span style={{ color: "#818cf8" }}>Redis 7: {readyData?.services?.redis || "connected"}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Shield size={14} color="#6366f1" />
          <span>Feature F-001 (JWT Authentication & Password Hashing)</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
