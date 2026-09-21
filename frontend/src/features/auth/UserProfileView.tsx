import React, { useEffect, useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import { apiClient } from "../../lib/api-client";
import {
  User,
  ShieldCheck,
  Mail,
  Calendar,
  LogOut,
  RefreshCw,
  Key,
  CheckCircle2,
} from "lucide-react";

export const UserProfileView: React.FC = () => {
  const { user, logout, token } = useAuthStore();
  const [meData, setMeData] = useState<any>(user);
  const [loadingMe, setLoadingMe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const testAuthMe = async () => {
    setLoadingMe(true);
    setMessage(null);
    try {
      const res = await apiClient.get("/auth/me");
      setMeData(res.data?.data);
      setMessage("GET /api/v1/auth/me succeeded with valid JWT Bearer token!");
    } catch (err: any) {
      setMessage(`Failed to call /auth/me: ${err.message}`);
    } finally {
      setLoadingMe(false);
    }
  };

  useEffect(() => {
    if (!user) {
      testAuthMe();
    }
  }, [user]);

  const activeUser = meData || user;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "600px",
        margin: "0 auto",
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderRadius: "16px",
        padding: "2rem",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "rgba(99, 102, 241, 0.15)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <User size={24} color="#818cf8" />
          </div>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
              {activeUser?.name || "Authenticated User"}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "2px" }}>
              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <CheckCircle2 size={12} /> Active Seat
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            color: "#f87171",
            borderRadius: "8px",
            padding: "0.45rem 0.8rem",
            fontSize: "0.85rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>

      {/* User Details Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid var(--border-color)",
          borderRadius: "12px",
          padding: "1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
            <Mail size={14} /> Email
          </div>
          <div style={{ fontSize: "0.9rem", fontWeight: 500 }}>{activeUser?.email}</div>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
            <ShieldCheck size={14} /> User ID
          </div>
          <div style={{ fontSize: "0.8rem", fontFamily: "JetBrains Mono, monospace", color: "var(--text-secondary)" }}>
            {activeUser?.id}
          </div>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
            <Calendar size={14} /> Account Created
          </div>
          <div style={{ fontSize: "0.85rem" }}>
            {activeUser?.created_at ? new Date(activeUser.created_at).toLocaleDateString() : "Today"}
          </div>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
            <Key size={14} /> JWT Access Token
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              fontFamily: "JetBrains Mono, monospace",
              color: "#38bdf8",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {token ? `${token.substring(0, 24)}...` : "Present"}
          </div>
        </div>
      </div>

      {/* Test /auth/me button */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <button
          onClick={testAuthMe}
          disabled={loadingMe}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "rgba(99, 102, 241, 0.15)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            color: "#818cf8",
            borderRadius: "8px",
            padding: "0.55rem 1rem",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: loadingMe ? "not-allowed" : "pointer",
          }}
        >
          <RefreshCw size={14} className={loadingMe ? "spin" : ""} />
          <span>Verify Token via GET /api/v1/auth/me</span>
        </button>

        {message && (
          <span style={{ fontSize: "0.8rem", color: "#10b981" }}>{message}</span>
        )}
      </div>
    </div>
  );
};
