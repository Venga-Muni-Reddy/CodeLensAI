import React, { useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import {
  Activity,
  User as UserIcon,
  AtSign,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  Check,
  CheckCircle2,
} from "lucide-react";

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  onSuccess?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSwitchToLogin,
  onSuccess,
}) => {
  const { register, isLoading, error, clearError } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Live Requirement Checks
  const isLengthValid = password.length >= 8;
  const isMatchValid = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!name.trim()) {
      setLocalError("Please enter your name.");
      return;
    }
    if (!email.trim()) {
      setLocalError("Please enter a valid email address.");
      return;
    }
    if (!isLengthValid) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }
    if (!isMatchValid) {
      setLocalError("Passwords do not match.");
      return;
    }
    if (!termsAccepted) {
      setLocalError("Please agree to the Terms of Service.");
      return;
    }

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      setIsSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      // Error handled in store
    }
  };

  const displayError = localError || error;

  if (isSuccess) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          margin: "0 auto",
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "16px",
          padding: "2.5rem 2rem",
          textAlign: "center",
          backdropFilter: "blur(16px)",
          boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "16px",
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1rem",
          }}
        >
          <CheckCircle2 size={36} color="#10b981" />
        </div>

        <div
          style={{
            display: "inline-block",
            fontSize: "0.75rem",
            fontWeight: 600,
            padding: "2px 10px",
            borderRadius: "999px",
            background: "rgba(56, 189, 248, 0.15)",
            color: "#38bdf8",
            marginBottom: "0.75rem",
          }}
        >
          AST engine initialized
        </div>

        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Account Created
        </h2>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "1.75rem" }}>
          Your workspace is provisioned. Code graph indices and repository intelligence are ready.
        </p>

        <button
          onClick={onSuccess}
          style={{
            width: "100%",
            height: "46px",
            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: "10px",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          <span>Continue to Workspace</span>
          <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "440px",
        margin: "0 auto",
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderRadius: "16px",
        padding: "2rem",
        backdropFilter: "blur(16px)",
        boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.5)",
      }}
    >
      {/* Brand Header */}
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "rgba(99, 102, 241, 0.12)",
            border: "1px solid rgba(99, 102, 241, 0.25)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "0.75rem",
          }}
        >
          <Activity size={24} color="#818cf8" />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            CodeLens AI
          </h1>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "999px",
              background: "rgba(56, 189, 248, 0.15)",
              color: "#38bdf8",
            }}
          >
            v2.4
          </span>
        </div>
      </div>

      {/* Greeting */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 600, letterSpacing: "-0.02em" }}>
          Create your account
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
          Start understanding your codebases faster.
        </p>
      </div>

      {/* Error Banner */}
      {displayError && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            padding: "0.85rem 1rem",
            marginBottom: "1.25rem",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "10px",
            color: "#fca5a5",
            fontSize: "0.85rem",
          }}
        >
          <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <div style={{ fontWeight: 600, color: "#f87171" }}>Registration Error</div>
            <div style={{ fontSize: "0.8rem", color: "#fca5a5", marginTop: "2px" }}>
              {displayError}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Name */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-secondary)",
              marginBottom: "0.35rem",
            }}
          >
            Name
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
              style={{
                width: "100%",
                height: "42px",
                padding: "0 2.5rem 0 0.9rem",
                background: "rgba(17, 24, 39, 0.6)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
                outline: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: "0.8rem",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "var(--text-muted)",
              }}
            >
              <UserIcon size={16} />
            </div>
          </div>
        </div>

        {/* Email */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-secondary)",
              marginBottom: "0.35rem",
            }}
          >
            Email
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                width: "100%",
                height: "42px",
                padding: "0 2.5rem 0 0.9rem",
                background: "rgba(17, 24, 39, 0.6)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
                outline: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: "0.8rem",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "var(--text-muted)",
              }}
            >
              <AtSign size={16} />
            </div>
          </div>
        </div>

        {/* Password */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
            <label
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--text-secondary)",
              }}
            >
              Password
            </label>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>min. 8 chars</span>
          </div>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
              style={{
                width: "100%",
                height: "42px",
                padding: "0 2.5rem 0 0.9rem",
                background: "rgba(17, 24, 39, 0.6)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
                outline: "none",
                fontFamily: "JetBrains Mono, monospace",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "0.6rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-secondary)",
              marginBottom: "0.35rem",
            }}
          >
            Confirm Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              style={{
                width: "100%",
                height: "42px",
                padding: "0 2.5rem 0 0.9rem",
                background: "rgba(17, 24, 39, 0.6)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
                outline: "none",
                fontFamily: "JetBrains Mono, monospace",
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              style={{
                position: "absolute",
                right: "0.6rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
              }}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Live Requirement Indicator Badges (Stitch design) */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", paddingTop: "0.25rem" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.75rem",
              fontWeight: 500,
              padding: "3px 8px",
              borderRadius: "6px",
              background: isLengthValid ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
              color: isLengthValid ? "#10b981" : "var(--text-muted)",
              border: isLengthValid ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid var(--border-color)",
              transition: "all 0.15s",
            }}
          >
            {isLengthValid && <Check size={12} />}
            <span>8+ characters</span>
          </span>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.75rem",
              fontWeight: 500,
              padding: "3px 8px",
              borderRadius: "6px",
              background: isMatchValid ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
              color: isMatchValid ? "#10b981" : "var(--text-muted)",
              border: isMatchValid ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid var(--border-color)",
              transition: "all 0.15s",
            }}
          >
            {isMatchValid && <Check size={12} />}
            <span>Passwords match</span>
          </span>
        </div>

        {/* Terms Checkbox */}
        <div style={{ paddingTop: "0.25rem" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              style={{ accentColor: "#6366f1", marginTop: "2px", cursor: "pointer" }}
            />
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
              I agree to the <span style={{ color: "#818cf8" }}>Terms of Service</span> and{" "}
              <span style={{ color: "#818cf8" }}>Privacy Policy</span>
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: "100%",
            height: "46px",
            marginTop: "0.5rem",
            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            color: "#ffffff",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "10px",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: isLoading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            boxShadow: "0 4px 14px rgba(99, 102, 241, 0.3)",
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="spin" />
              <span>Creating Account...</span>
            </>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          margin: "1.25rem 0",
          color: "var(--text-muted)",
          fontSize: "0.75rem",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        <div style={{ flex: 1, height: "1px", background: "var(--border-color)" }} />
        <span style={{ padding: "0 0.75rem" }}>or</span>
        <div style={{ flex: 1, height: "1px", background: "var(--border-color)" }} />
      </div>

      {/* GitHub SSO */}
      <button
        type="button"
        style={{
          width: "100%",
          height: "42px",
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid var(--border-color)",
          borderRadius: "10px",
          color: "var(--text-primary)",
          fontSize: "0.9rem",
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.6rem",
          cursor: "pointer",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
        </svg>
        <span>Continue with GitHub</span>
        <span
          style={{
            fontSize: "0.65rem",
            fontWeight: 600,
            padding: "2px 6px",
            borderRadius: "4px",
            background: "rgba(255, 255, 255, 0.06)",
            color: "var(--text-muted)",
          }}
        >
          SSO
        </span>
      </button>

      {/* Switch to Login */}
      <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Already have an account?{" "}
        </span>
        <button
          type="button"
          onClick={onSwitchToLogin}
          style={{
            background: "transparent",
            border: "none",
            color: "#818cf8",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Sign in
        </button>
      </div>
    </div>
  );
};
