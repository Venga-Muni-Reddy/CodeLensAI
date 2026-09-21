import React, { useEffect, useState } from "react";
import { apiClient } from "./lib/api-client";
import { Activity, Server, Database, Layers, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

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
  const [liveData, setLiveData] = useState<HealthLive | null>(null);
  const [readyData, setReadyData] = useState<HealthReady | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const [liveRes, readyRes] = await Promise.all([
        apiClient.get("/health/live"),
        apiClient.get("/health/ready").catch((err) => err.response || { data: null }),
      ]);
      setLiveData(liveRes.data?.data || null);
      setReadyData(readyRes.data?.data || null);
    } catch (err: any) {
      setError(err.message || "Could not reach FastAPI backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <main style={{ maxWidth: "800px", margin: "3.5rem auto", padding: "0 1.5rem" }}>
      {/* Header */}
      <header style={{ marginBottom: "2rem", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <Activity size={36} color="#6366f1" />
          <h1 style={{ fontSize: "2.25rem", fontWeight: 700, letterSpacing: "-0.03em" }}>
            CodeLensAI
          </h1>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
          Repository Intelligence Platform &bull; Foundation & Scaffolding Health Check
        </p>
      </header>

      {/* Action Bar */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <button
          onClick={fetchStatus}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "rgba(99, 102, 241, 0.15)",
            color: "#818cf8",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            borderRadius: "6px",
            padding: "0.5rem 0.9rem",
            fontSize: "0.85rem",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 500,
          }}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          {loading ? "Checking..." : "Refresh Status"}
        </button>
      </div>

      {/* Main Status Cards */}
      {error ? (
        <section
          style={{
            padding: "1.5rem",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "12px",
            color: "#fca5a5",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, fontSize: "1rem", marginBottom: "0.5rem" }}>
            <AlertCircle size={20} color="#ef4444" />
            Backend Disconnected
          </div>
          <p style={{ fontSize: "0.9rem", color: "#f87171", marginBottom: "0.75rem" }}>
            {error}
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Make sure your backend server is running in another terminal:
            <br />
            <code>cd backend ; .\.venv\Scripts\Activate.ps1 ; uvicorn app.main:app --reload</code>
          </p>
        </section>
      ) : (
        <section
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            padding: "1.75rem",
            backdropFilter: "blur(12px)",
            marginBottom: "1.5rem",
          }}
        >
          <h2 style={{ fontSize: "1.1rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Server size={20} color="#6366f1" />
            Live System Probes
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            {/* FastAPI Box */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>FastAPI Server</span>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Status: <strong style={{ color: "#10b981" }}>{liveData?.status || "healthy"}</strong>
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                v{liveData?.version} ({liveData?.environment})
              </p>
            </div>

            {/* MongoDB Box */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <CheckCircle2
                  size={16}
                  color={readyData?.services?.mongodb === "connected" ? "#10b981" : "#f59e0b"}
                />
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>MongoDB 7.0</span>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Status:{" "}
                <strong
                  style={{
                    color: readyData?.services?.mongodb === "connected" ? "#10b981" : "#f59e0b",
                  }}
                >
                  {readyData?.services?.mongodb || "checking..."}
                </strong>
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                Port: 27017 (Docker)
              </p>
            </div>

            {/* Redis Box */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <CheckCircle2
                  size={16}
                  color={readyData?.services?.redis === "connected" ? "#10b981" : "#f59e0b"}
                />
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Redis 7</span>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Status:{" "}
                <strong
                  style={{
                    color: readyData?.services?.redis === "connected" ? "#10b981" : "#f59e0b",
                  }}
                >
                  {readyData?.services?.redis || "checking..."}
                </strong>
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                Port: 6379 (Docker)
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Info Grid */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            padding: "1.25rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Database size={18} color="#6366f1" />
            <h3 style={{ fontSize: "0.95rem" }}>Architecture Baseline</h3>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.5 }}>
            Modular Monolith backend (Python + FastAPI) with React + TypeScript frontend, fully isolated data stores.
          </p>
        </div>

        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            padding: "1.25rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Layers size={18} color="#6366f1" />
            <h3 style={{ fontSize: "0.95rem" }}>Next Milestone</h3>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.5 }}>
            Ready to implement <strong>Feature F-001: User Authentication & Account Management</strong>.
          </p>
        </div>
      </section>
    </main>
  );
};

export default App;
