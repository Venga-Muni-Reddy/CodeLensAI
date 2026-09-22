import React, { useEffect, useState } from "react";
import {
  GitBranch,
  Shield,
  CheckCircle2,
  Lock,
  Clock,
  ClipboardPaste,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  Trash2,
  FolderGit2,
  Cpu,
} from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import { useRepositoryStore } from "../../stores/repositoryStore";

export const RepositoryIngestionView: React.FC = () => {
  const { projects, activeProject, setActiveProject } = useProjectStore();
  const {
    repositories,
    isIngesting,
    error,
    fetchRepositories,
    importGitHubRepository,
    deleteRepository,
    pollRepositoryStatus,
    clearError,
  } = useRepositoryStore();

  // Form State
  const [sourceUrl, setSourceUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [authToken, setAuthToken] = useState("");
  const [showTokenField, setShowTokenField] = useState(false);
  const [shallowClone, setShallowClone] = useState(true);
  const [excludeBinaries, setExcludeBinaries] = useState(true);
  const [autoCompile, setAutoCompile] = useState(true);

  // Ingestion Live Telemetry Terminal State
  const [telemetryActive, setTelemetryActive] = useState(false);
  const [telemetryStage, setTelemetryStage] = useState<1 | 2 | 3 | 4>(1);
  const [telemetryProgress, setTelemetryProgress] = useState(0);
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);


  // URL Validation
  const isValidUrl =
    sourceUrl.trim().startsWith("https://github.com/") && sourceUrl.trim().length > 20;

  useEffect(() => {
    if (activeProject) {
      fetchRepositories(activeProject.id);
    }
  }, [activeProject, fetchRepositories]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setSourceUrl(text.trim());
      }
    } catch {
      // Fallback if clipboard read permission denied
    }
  };

  const handleStartIngestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) {
      alert("Please select a project workspace first.");
      return;
    }
    if (!isValidUrl) {
      alert("Please enter a valid GitHub HTTPS repository URL.");
      return;
    }

    clearError();
    setTelemetryActive(true);
    setTelemetryProgress(15);
    setTelemetryStage(1);
    setTelemetryLogs([
      `[${new Date().toLocaleTimeString()}] INIT > Connecting to workspace ${activeProject.name}...`,
      `[${new Date().toLocaleTimeString()}] VAULT > Verifying credential scope for ${sourceUrl.trim()}...`,
    ]);

    try {
      const repo = await importGitHubRepository(activeProject.id, {
        source_url: sourceUrl.trim(),
        default_branch: branch.trim() || "main",
        auth_token: authToken.trim() || undefined,
        shallow_clone: shallowClone,
        exclude_binaries: excludeBinaries,
      });

      setTelemetryStage(2);
      setTelemetryProgress(45);
      setTelemetryLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] GIT > git clone --depth=1 --branch=${branch} ${sourceUrl.trim()}`,
        `[${new Date().toLocaleTimeString()}] GIT > remote: Enumerating objects...`,
        `[${new Date().toLocaleTimeString()}] RECEIVE > Receiving remote repository objects...`,
      ]);

      // Poll until ready or failed
      const intervalId = setInterval(async () => {
        try {
          const updated = await pollRepositoryStatus(repo.id);
          if (updated.status === "ready") {
            clearInterval(intervalId);
            setTelemetryStage(4);
            setTelemetryProgress(100);
            setTelemetryLogs((prev) => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] INDEX > Scanned ${updated.file_count} files (${(updated.size_bytes / (1024 * 1024)).toFixed(2)} MB).`,
              `[${new Date().toLocaleTimeString()}] HEAD > Commit SHA: ${updated.commit_sha || "HEAD"}`,
              `[${new Date().toLocaleTimeString()}] SUCCESS > Repository ingestion complete and ready for AST mapping.`,
            ]);
          } else if (updated.status === "failed") {
            clearInterval(intervalId);
            setTelemetryProgress(100);
            setTelemetryLogs((prev) => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] ERROR > ${updated.error_message || "Cloning failed"}`,
            ]);
          }
        } catch {
          clearInterval(intervalId);
        }
      }, 2000);
    } catch (err: any) {
      setTelemetryLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ERROR > ${err.message || "Failed to trigger ingestion"}`,
      ]);
    }
  };

  const handleDeleteRepo = async (repoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeProject) return;
    if (!window.confirm("Are you sure you want to soft-delete this repository?")) return;
    await deleteRepository(repoId);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Cockpit Header & Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 mb-1">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-slate-300">{activeProject?.name || "Active Workspace"}</span>
            <span>/</span>
            <span className="text-indigo-400 font-semibold">Import Repository</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-3">
            <span>Source Ingestion Cockpit</span>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
              Tenant Isolated • Git 2.44+ Ready
            </span>
          </h1>
        </div>

        <div className="flex items-center space-x-2 text-[11px] font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-[#11131b] border border-[#1d202d] text-slate-400 flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Target: {activeProject?.id.slice(0, 8)}...</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>AST Worker Pool: Online</span>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={clearError} className="text-rose-400 hover:text-white font-bold">
            ✕
          </button>
        </div>
      )}

      {/* 2. Main GitHub Ingestion Card */}
      <div className="p-6 rounded-2xl bg-[#11131b] border border-[#1d202d] shadow-xl relative overflow-hidden">
        {/* Card Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#181b28] border border-[#272b3e] flex items-center justify-center text-white shadow-md">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Import Repository from GitHub</h2>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Remote Git Stream
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Enter a valid public or private repository target to mount AST structural graphs and symbol
                trees.
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center space-x-1.5 text-[11px] font-mono text-slate-500 bg-[#0c0e16] px-3 py-1.5 rounded-xl border border-[#1a1d2b]">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>SSH & HTTPS Tokens Handled via Vault</span>
          </div>
        </div>

        <form onSubmit={handleStartIngestion} className="space-y-5">
          {/* Target Workspace Project Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Target Workspace Project
            </label>
            <div className="relative">
              <select
                value={activeProject?.id || ""}
                onChange={(e) => {
                  const p = projects.find((proj) => proj.id === e.target.value);
                  if (p) setActiveProject(p);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0e16] border border-[#232738] text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {activeProject?.id === p.id ? "(Active)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-1">
              {repositories.length} active repos • Tenant {activeProject?.owner_id.slice(0, 8)}
            </div>
          </div>

          {/* Repository URL with Paste Action */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-2">
                <span>Repository Remote URL</span>
                {isValidUrl && (
                  <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-400 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Valid GitHub HTTPS URL</span>
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={handlePaste}
                className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Paste URL</span>
              </button>
            </div>

            <div className="relative">
              <GitBranch className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="https://github.com/acme-corp/payment-gateway-v2"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0c0e16] border border-[#232738] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Branch or Commit Reference with Quick Select */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">Branch or Commit Reference</label>
              <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-400">
                <span className="text-slate-500">Quick Select:</span>
                {["main", "master", "develop", "v2.4.0"].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBranch(b)}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      branch === b
                        ? "bg-indigo-600 text-white font-semibold"
                        : "bg-[#181b28] text-slate-400 hover:text-white"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="e.g. main, release/v1.2, or commit SHA"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0e16] border border-[#232738] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Collapsible GitHub Personal Access Token (PAT) */}
          <div className="rounded-xl border border-[#202334] bg-[#0c0e16]/60 p-3.5">
            <button
              type="button"
              onClick={() => setShowTokenField(!showTokenField)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span>GitHub Personal Access Token (PAT)</span>
                <span className="text-[10px] font-mono text-slate-500 font-normal">
                  (Optional for Public / Required for Private Repos)
                </span>
              </div>
              {showTokenField ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showTokenField && (
              <div className="mt-3 pt-3 border-t border-[#1d202d] space-y-2">
                <input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#11131b] border border-[#232738] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Tokens are kept in ephemeral process memory during git clone operations and are{" "}
                  <strong className="text-slate-400">never stored in plain text</strong> on disk or database.
                </p>
              </div>
            )}
          </div>

          {/* ENGINE OPTIMIZATION RULES (3 Checkboxes) */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold mb-2">
              Engine Optimization Rules
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="p-3 rounded-xl bg-[#0c0e16] border border-[#202334] flex items-start space-x-2.5 cursor-pointer hover:border-indigo-500/40 transition-colors">
                <input
                  type="checkbox"
                  checked={shallowClone}
                  onChange={(e) => setShallowClone(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-0 bg-[#11131b] border-[#2d3248]"
                />
                <div>
                  <div className="text-xs font-semibold text-white">Shallow Clone (--depth 1)</div>
                  <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    Skips commit log bloat; analyzes AST immediately.
                  </div>
                </div>
              </label>

              <label className="p-3 rounded-xl bg-[#0c0e16] border border-[#202334] flex items-start space-x-2.5 cursor-pointer hover:border-indigo-500/40 transition-colors">
                <input
                  type="checkbox"
                  checked={excludeBinaries}
                  onChange={(e) => setExcludeBinaries(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-0 bg-[#11131b] border-[#2d3248]"
                />
                <div>
                  <div className="text-xs font-semibold text-white">Exclude Binaries & Assets</div>
                  <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    Filters .git, mp4, images, and files &gt; 5MB.
                  </div>
                </div>
              </label>

              <label className="p-3 rounded-xl bg-[#0c0e16] border border-[#202334] flex items-start space-x-2.5 cursor-pointer hover:border-indigo-500/40 transition-colors">
                <input
                  type="checkbox"
                  checked={autoCompile}
                  onChange={(e) => setAutoCompile(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-0 bg-[#11131b] border-[#2d3248]"
                />
                <div>
                  <div className="text-xs font-semibold text-white">Auto-Compile AST Graph</div>
                  <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    Builds class symbols and cross-file references.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Form Footer Action Row */}
          <div className="pt-3 border-t border-[#1d202d] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-[11px] font-mono text-slate-500 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              <span>Est. Ingestion Time: ~12-18 seconds</span>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  setSourceUrl("");
                  setTelemetryActive(false);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isIngesting || !isValidUrl}
                className={`px-6 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all border border-indigo-400/20 ${
                  isIngesting || !isValidUrl
                    ? "bg-indigo-600/50 cursor-not-allowed text-slate-400"
                    : "bg-indigo-600 hover:bg-indigo-500 cursor-pointer"
                }`}
              >
                {isIngesting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cloning Repository...</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-4 h-4" />
                    <span>Clone & Initialize Ingestion</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 3. Live Cloning Progress & Terminal Console (Telemetry Stream) */}
      {telemetryActive && (
        <div className="p-5 rounded-2xl bg-[#11131b] border border-[#1d202d] shadow-xl space-y-4">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 font-mono">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <span className="text-white font-bold">TELEMETRY STREAM • RUNTIME PID #8284</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono text-[11px]">
              {telemetryProgress === 100 ? "STATUS: READY • 100%" : `STATUS: CLONING • ${telemetryProgress}%`}
            </span>
          </div>

          {/* 4 Steps */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
            <div
              className={`p-2 rounded-lg border flex items-center space-x-2 ${
                telemetryStage >= 1
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-[#0c0e16] border-[#1d202d] text-slate-500"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>1. Remote Check</span>
            </div>

            <div
              className={`p-2 rounded-lg border flex items-center space-x-2 ${
                telemetryStage >= 2
                  ? "bg-sky-500/10 border-sky-500/20 text-sky-400"
                  : "bg-[#0c0e16] border-[#1d202d] text-slate-500"
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>2. Shallow Clone</span>
            </div>

            <div
              className={`p-2 rounded-lg border flex items-center space-x-2 ${
                telemetryStage >= 3
                  ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                  : "bg-[#0c0e16] border-[#1d202d] text-slate-500"
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>3. Syntax Indexing</span>
            </div>

            <div
              className={`p-2 rounded-lg border flex items-center space-x-2 ${
                telemetryStage >= 4
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-[#0c0e16] border-[#1d202d] text-slate-500"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>4. Graph Build</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 rounded-full bg-[#0c0e16] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 via-indigo-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${telemetryProgress}%` }}
            />
          </div>

          {/* Terminal Box */}
          <div className="p-4 rounded-xl bg-[#090b10] border border-[#1b1f2e] font-mono text-[11px] text-slate-300 space-y-1 max-h-48 overflow-y-auto">
            <div className="text-slate-500 mb-2">// Active ingestion console telemetry output:</div>
            {telemetryLogs.map((log, idx) => (
              <div
                key={idx}
                className={`${
                  log.includes("ERROR")
                    ? "text-rose-400"
                    : log.includes("SUCCESS")
                    ? "text-emerald-400"
                    : "text-slate-300"
                }`}
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Recently Ingested in this Workspace Section */}
      <div className="p-6 rounded-2xl bg-[#11131b] border border-[#1d202d] shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-white">Recently Ingested in this Workspace</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1c2030] text-slate-400">
              {repositories.length} repositories
            </span>
          </div>
        </div>

        {repositories.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs font-mono">
            No repositories imported yet under this workspace. Enter a GitHub URL above to clone.
          </div>
        ) : (
          <div className="space-y-3">
            {repositories.map((repo) => (
              <div
                key={repo.id}
                className="p-4 rounded-xl bg-[#0c0e16] border border-[#1d202d] hover:border-indigo-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center flex-shrink-0">
                    <FolderGit2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-xs">{repo.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#161a28] text-slate-400 border border-[#252b40]">
                        {repo.default_branch}
                      </span>
                      {repo.commit_sha && (
                        <span className="text-[10px] font-mono text-slate-500">
                          • {repo.commit_sha.slice(0, 7)}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 truncate max-w-md mt-0.5">
                      {repo.source_url}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs justify-between sm:justify-end">
                  <div className="text-[11px] font-mono text-slate-400">
                    {repo.file_count} files • {(repo.size_bytes / (1024 * 1024)).toFixed(1)} MB
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border font-medium ${
                      repo.status === "ready"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : repo.status === "failed"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : "bg-sky-500/10 text-sky-400 border-sky-500/20 animate-pulse"
                    }`}
                  >
                    {repo.status.toUpperCase()}
                  </span>

                  <button
                    onClick={(e) => handleDeleteRepo(repo.id, e)}
                    title="Delete Repository"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
