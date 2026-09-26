import React, { useEffect, useState, useMemo } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  Zap,
  Flame,
  Bug,
  Sparkles,
  MessageSquareCode,
  Download,
  Copy,
  Check,
  RefreshCw,
  FolderGit2,
  GitBranch,
  Search,
  ChevronDown,
  Code2,
  FileCode,
  CheckCircle2,
  Layers,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { useReviewStore } from "../../stores/reviewStore";
import { useProjectStore } from "../../stores/projectStore";
import { useRepositoryStore } from "../../stores/repositoryStore";
import type { ReviewFinding } from "../../types/review";

interface CodeReviewViewProps {
  onBack?: () => void;
  onNavigateToAI?: (initialPrompt?: string) => void;
}

export const CodeReviewView: React.FC<CodeReviewViewProps> = ({
  onBack,
  onNavigateToAI,
}) => {
  const { projects, activeProject, setActiveProject, fetchProjects } = useProjectStore();
  const { repositories, activeRepository, setActiveRepository, fetchRepositories } = useRepositoryStore();

  const {
    reviewData,
    selectedFindingId,
    severityFilter,
    categoryFilter,
    searchQuery,
    diffViewMode,
    checklistStates,
    isScanning,
    isApplyingPatch,
    appliedPatchIds,
    error,
    setSelectedFindingId,
    setSeverityFilter,
    setCategoryFilter,
    setSearchQuery,
    setDiffViewMode,
    toggleChecklistItem,
    fetchReview,
    triggerScan,
    applyPatch,
    downloadPatch,
    downloadAllPatches,
  } = useReviewStore();

  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false);
  const [copiedPatchId, setCopiedPatchId] = useState<string | null>(null);
  const [copiedFilePath, setCopiedFilePath] = useState(false);

  // Initialize projects and repos on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (activeProject) {
      fetchRepositories(activeProject.id);
    }
  }, [activeProject, fetchRepositories]);

  // Fetch review data when active repo or project changes
  useEffect(() => {
    const pId = activeProject?.id || "default-project";
    const rId = activeRepository?.id || "default-repo";
    fetchReview(pId, rId);
  }, [activeProject, activeRepository, fetchReview]);

  // Active finding object
  const activeFinding = useMemo(() => {
    if (!reviewData || !reviewData.findings) return null;
    return reviewData.findings.find((f) => f.id === selectedFindingId) || reviewData.findings[0] || null;
  }, [reviewData, selectedFindingId]);

  // Filtered findings based on severity, category, and search query
  const filteredFindings = useMemo(() => {
    if (!reviewData || !reviewData.findings) return [];
    return reviewData.findings.filter((f) => {
      // Severity filter
      if (severityFilter !== "all" && f.severity !== severityFilter) {
        return false;
      }
      // Category filter
      if (categoryFilter !== "all" && f.category !== categoryFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = f.title.toLowerCase().includes(q);
        const matchRule = f.rule_id.toLowerCase().includes(q);
        const matchFile = f.file_path.toLowerCase().includes(q);
        const matchDesc = f.description.toLowerCase().includes(q);
        const matchCwe = f.cwe_id?.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchRule && !matchFile && !matchDesc && !matchCwe) {
          return false;
        }
      }
      return true;
    });
  }, [reviewData, severityFilter, categoryFilter, searchQuery]);

  const metrics = reviewData?.metrics;

  const handleCopyPatch = (finding: ReviewFinding) => {
    if (finding.diff_block?.patch_content) {
      navigator.clipboard.writeText(finding.diff_block.patch_content);
      setCopiedPatchId(finding.id);
      setTimeout(() => setCopiedPatchId(null), 2000);
    }
  };

  const handleCopyFilePath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedFilePath(true);
    setTimeout(() => setCopiedFilePath(false), 2000);
  };

  const handleAttachToAI = (finding: ReviewFinding) => {
    if (!onNavigateToAI) return;
    const prompt = `I am reviewing finding [${finding.rule_id}] "${finding.title}" in file \`${finding.file_path}:${finding.line_number}\`.
Description: ${finding.description}
AI Root Cause: ${finding.ai_explanation}
Could you provide a detailed step-by-step refactoring walkthrough and explain any potential architectural side effects on its callers?`;
    onNavigateToAI(prompt);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0c14] text-[#e2e8f0] overflow-hidden select-none">
      {/* 1. TOP SCOPE BAR & BREADCRUMBS */}
      <header className="flex-shrink-0 bg-[#0e111a] border-b border-[#1b1f2e] px-5 py-3 flex flex-wrap items-center justify-between gap-4 z-20">
        <div className="flex items-center space-x-3 text-xs">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 rounded-lg bg-[#141824] hover:bg-[#1c2234] border border-[#22283a] text-slate-400 hover:text-white transition-colors"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="flex items-center space-x-1.5 text-slate-400">
            <span className="font-semibold text-slate-300">CodeLens AI</span>
            <span>/</span>
            <button onClick={onBack} className="hover:text-slate-200 transition-colors">
              Repositories
            </button>
            <span>/</span>
          </div>

          {/* Interactive Project Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsProjectDropdownOpen(!isProjectDropdownOpen);
                setIsRepoDropdownOpen(false);
              }}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1a2030] border border-[#22283a] text-slate-200 text-xs font-medium transition-all"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="max-w-[130px] truncate">{activeProject?.name || "All Projects"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isProjectDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-56 rounded-xl bg-[#121520] border border-[#262c3e] shadow-2xl py-1.5 z-50">
                <div className="px-3 py-1.5 text-[10px] uppercase font-mono font-bold text-slate-500 border-b border-[#1f2433]">
                  Select Project Scope
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setActiveProject(p);
                        setIsProjectDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#191d2c] transition-colors ${
                        activeProject?.id === p.id ? "text-indigo-400 font-semibold bg-[#161a28]" : "text-slate-300"
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      {activeProject?.id === p.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <span>/</span>

          {/* Interactive Repository Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsRepoDropdownOpen(!isRepoDropdownOpen);
                setIsProjectDropdownOpen(false);
              }}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1a2030] border border-[#22283a] text-slate-200 text-xs font-medium transition-all"
            >
              <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
              <span className="max-w-[130px] truncate">{activeRepository?.name || "ecommerce-core"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isRepoDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-60 rounded-xl bg-[#121520] border border-[#262c3e] shadow-2xl py-1.5 z-50">
                <div className="px-3 py-1.5 text-[10px] uppercase font-mono font-bold text-slate-500 border-b border-[#1f2433]">
                  Select Repository
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {repositories.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-500 italic">No repositories found</div>
                  ) : (
                    repositories.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setActiveRepository(r);
                          setIsRepoDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#191d2c] transition-colors ${
                          activeRepository?.id === r.id ? "text-indigo-400 font-semibold bg-[#161a28]" : "text-slate-300"
                        }`}
                      >
                        <span className="truncate">{r.name}</span>
                        {activeRepository?.id === r.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <span className="text-slate-500">/</span>
          <span className="text-indigo-300 font-semibold">Code Review Workbench</span>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => {
              const pId = activeProject?.id || "default-project";
              const rId = activeRepository?.id || "default-repo";
              downloadAllPatches(pId, rId);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#151824] hover:bg-[#1d2133] border border-[#262b3d] text-slate-300 hover:text-white text-xs font-medium transition-all"
            title="Download unified diff archive containing all auto-generated patches"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export Audit Report .patch</span>
          </button>

          <button
            onClick={() => {
              const pId = activeProject?.id || "default-project";
              const rId = activeRepository?.id || "default-repo";
              triggerScan(pId, rId);
            }}
            disabled={isScanning}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
            <span>{isScanning ? "Auditing AST..." : "Run Full Code Audit"}</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] font-mono bg-indigo-700/60 rounded border border-indigo-500/40">
              ⌘R
            </kbd>
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-5 py-2 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 2. FILTER & KPI STRIP */}
      <section className="flex-shrink-0 bg-[#0c0e17] border-b border-[#181c2b] px-5 py-3 space-y-3">
        {/* Severity Tabs & Category Pills & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Severity Tabs */}
          <div className="flex items-center space-x-1 p-1 rounded-xl bg-[#111420] border border-[#1e2335]">
            <button
              onClick={() => setSeverityFilter("all")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                severityFilter === "all" ? "bg-[#1d2235] text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>All</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#161a2a] text-slate-400">
                {metrics?.total_issues ?? 18}
              </span>
            </button>

            <button
              onClick={() => setSeverityFilter("critical")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                severityFilter === "critical"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Critical</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500/15 text-rose-300">
                {metrics?.critical_count ?? 3}
              </span>
            </button>

            <button
              onClick={() => setSeverityFilter("warning")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                severityFilter === "warning"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Warnings</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/15 text-amber-300">
                {metrics?.warning_count ?? 9}
              </span>
            </button>

            <button
              onClick={() => setSeverityFilter("info")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                severityFilter === "info"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span>Info</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-sky-500/15 text-sky-300">
                {metrics?.info_count ?? 6}
              </span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                categoryFilter === "all"
                  ? "bg-[#1c2135] text-white border-indigo-500/40"
                  : "bg-[#111420] text-slate-400 border-[#1f2438] hover:text-slate-200"
              }`}
            >
              All Categories
            </button>

            <button
              onClick={() => setCategoryFilter("security")}
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center space-x-1.5 ${
                categoryFilter === "security"
                  ? "bg-rose-500/15 text-rose-300 border-rose-500/40"
                  : "bg-[#111420] text-slate-400 border-[#1f2438] hover:text-slate-200"
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-rose-400" />
              <span>Security</span>
            </button>

            <button
              onClick={() => setCategoryFilter("performance")}
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center space-x-1.5 ${
                categoryFilter === "performance"
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                  : "bg-[#111420] text-slate-400 border-[#1f2438] hover:text-slate-200"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Performance</span>
            </button>

            <button
              onClick={() => setCategoryFilter("smell")}
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center space-x-1.5 ${
                categoryFilter === "smell"
                  ? "bg-purple-500/15 text-purple-300 border-purple-500/40"
                  : "bg-[#111420] text-slate-400 border-[#1f2438] hover:text-slate-200"
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-purple-400" />
              <span>Code Smells</span>
            </button>

            <button
              onClick={() => setCategoryFilter("bug")}
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center space-x-1.5 ${
                categoryFilter === "bug"
                  ? "bg-blue-500/15 text-blue-300 border-blue-500/40"
                  : "bg-[#111420] text-slate-400 border-[#1f2438] hover:text-slate-200"
              }`}
            >
              <Bug className="w-3.5 h-3.5 text-blue-400" />
              <span>Bug Hazards</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-64 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search issues, rules, or file paths..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-12 py-1.5 rounded-xl bg-[#111420] border border-[#1e2335] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#181c2b] text-slate-400 border border-[#23283c]">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* KPI 4-Card Deck */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Health Score Radial Gauge */}
          <div className="p-3.5 rounded-2xl bg-[#111420] border border-[#1d2235] flex items-center space-x-3.5">
            <div className="relative w-14 h-14 flex-shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[#1a1f30]"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-indigo-400"
                  strokeDasharray={`${metrics?.health_score ?? 78}, 100`}
                  strokeLinecap="round"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-sm font-bold text-white leading-none">
                  {metrics?.health_score ?? 78}
                </span>
                <span className="text-[8px] text-slate-400">/100</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Repo Health Score
              </div>
              <div className="text-xs font-semibold text-slate-200 mt-0.5">
                {metrics?.health_label ?? "Moderate Health"}
              </div>
              <div className="text-[10px] text-emerald-400 flex items-center space-x-1 mt-0.5">
                <span>↗ 4 regressions resolved</span>
              </div>
            </div>
          </div>

          {/* Card 2: Security Risks */}
          <div className="p-3.5 rounded-2xl bg-[#111420] border border-[#1d2235] flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Security Risks</span>
                <span className="text-[9px] text-rose-400 font-bold px-1 rounded bg-rose-500/10">Active</span>
              </div>
              <div className="text-sm font-bold text-white mt-0.5">
                {metrics?.critical_count ?? 3} Critical Flaws
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">
                CWE-798 Secret, SQL Injection
              </div>
            </div>
          </div>

          {/* Card 3: Latency Hazards */}
          <div className="p-3.5 rounded-2xl bg-[#111420] border border-[#1d2235] flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Latency Hazards</span>
                <span className="text-[9px] text-amber-400 font-bold px-1 rounded bg-amber-500/10">+180ms spike</span>
              </div>
              <div className="text-sm font-bold text-white mt-0.5">
                {metrics?.performance_count ?? 5} Anti-Patterns
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">
                N+1 Query loop, Sync locks
              </div>
            </div>
          </div>

          {/* Card 4: AI Patch Readiness */}
          <div className="p-3.5 rounded-2xl bg-[#111420] border border-[#1d2235] flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>AI Patch Ready</span>
                <span className="text-[9px] text-emerald-400 font-bold">1-Click AST</span>
              </div>
              <div className="text-sm font-bold text-white mt-0.5">
                {metrics?.patches_ready_count ?? 14} / {metrics?.total_issues ?? 18} Verified
              </div>
              <div className="w-full bg-[#181d2c] h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.round(((metrics?.patches_ready_count ?? 14) / (metrics?.total_issues ?? 18)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SPLIT WORKBENCH COCKPIT (40% Left / 60% Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: FINDINGS FEED */}
        <aside className="w-full lg:w-[42%] border-r border-[#191d2c] bg-[#0c0e17] flex flex-col overflow-hidden">
          {/* Feed Header */}
          <div className="px-4 py-2.5 border-b border-[#181c2b] flex items-center justify-between text-xs bg-[#0f121d]">
            <span className="font-semibold text-slate-300">
              Detected Findings ({filteredFindings.length})
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Ordered by CVSS Severity
            </span>
          </div>

          {/* Scrollable Findings List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredFindings.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto opacity-70" />
                <div className="text-sm font-semibold text-white">No Issues Found</div>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  No findings matched the selected severity or category filter in this repository.
                </p>
              </div>
            ) : (
              filteredFindings.map((finding) => {
                const isSelected = activeFinding?.id === finding.id;
                const isApplied = appliedPatchIds.includes(finding.id);

                return (
                  <div
                    key={finding.id}
                    onClick={() => setSelectedFindingId(finding.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                      isSelected
                        ? "bg-[#151928] border-indigo-500/60 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/30"
                        : "bg-[#11131f] border-[#1c2134] hover:bg-[#141724] hover:border-[#272f48]"
                    }`}
                  >
                    {/* Active Accent Pill */}
                    {isSelected && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 bg-gradient-to-b from-indigo-400 to-cyan-400 rounded-r" />
                    )}

                    {/* Top Row: Badges */}
                    <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                      <div className="flex items-center space-x-1.5">
                        {finding.severity === "critical" && (
                          <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold uppercase">
                            Critical • {finding.category}
                          </span>
                        )}
                        {finding.severity === "warning" && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold uppercase">
                            Warning • {finding.category}
                          </span>
                        )}
                        {finding.severity === "info" && (
                          <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold uppercase">
                            Info • {finding.category}
                          </span>
                        )}

                        {finding.cwe_id && (
                          <span className="px-1.5 py-0.5 rounded bg-[#171b2a] text-slate-400 border border-[#242b40]">
                            {finding.cwe_id}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 text-slate-400">
                        {isApplied ? (
                          <span className="text-emerald-400 flex items-center space-x-1 font-bold">
                            <Check className="w-3 h-3" />
                            <span>Applied</span>
                          </span>
                        ) : finding.ai_diff_ready ? (
                          <span className="text-emerald-400 flex items-center space-x-1">
                            <Sparkles className="w-3 h-3" />
                            <span>Auto-Patch</span>
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Finding Title */}
                    <h3 className="text-xs font-bold text-white group-hover:text-indigo-200 transition-colors line-clamp-1">
                      {finding.title}
                    </h3>

                    {/* File Citation */}
                    <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center space-x-1.5">
                      <FileCode className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{finding.file_path}:{finding.line_number}</span>
                    </div>

                    {/* Description Snippet */}
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {finding.description}
                    </p>

                    {/* Footer Metrics */}
                    <div className="mt-2.5 pt-2 border-t border-[#181c2b] flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center space-x-1">
                        <Layers className="w-3 h-3" />
                        <span>{finding.affected_callers_count} Callers Impacted</span>
                      </span>

                      <span className="font-mono text-slate-400">
                        {finding.remediation_estimate}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT PANEL: DEEP INSPECTOR & PATCH COCKPIT */}
        <main className="hidden lg:flex flex-1 flex-col bg-[#090b12] overflow-y-auto">
          {activeFinding ? (
            <div className="p-6 space-y-6 max-w-5xl mx-auto w-full">
              {/* Finding Title Bar */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
                      {activeFinding.rule_id}
                    </span>

                    {activeFinding.cvss_score && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold">
                        CVSS {activeFinding.cvss_score} High
                      </span>
                    )}

                    <span className="text-xs font-mono text-slate-400">
                      Confidence: {activeFinding.confidence_pct}%
                    </span>
                  </div>

                  {/* Diff Mode Toggle */}
                  <div className="flex items-center space-x-1 p-1 rounded-xl bg-[#111420] border border-[#1e2335] text-xs">
                    <button
                      onClick={() => setDiffViewMode("side-by-side")}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        diffViewMode === "side-by-side"
                          ? "bg-[#1c2135] text-white shadow-sm font-semibold"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Side-by-Side Diff
                    </button>
                    <button
                      onClick={() => setDiffViewMode("unified")}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        diffViewMode === "unified"
                          ? "bg-[#1c2135] text-white shadow-sm font-semibold"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Unified Diff
                    </button>
                  </div>
                </div>

                <h1 className="text-xl font-bold text-white tracking-tight">
                  {activeFinding.title}
                </h1>

                {/* File Citation Banner */}
                <div className="p-3 rounded-xl bg-[#111420] border border-[#1d2235] flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center space-x-2 text-indigo-300">
                    <FileCode className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <span>{activeFinding.file_path}</span>
                    <span className="text-slate-500">:</span>
                    <span className="text-emerald-400">Line {activeFinding.line_number}</span>
                  </div>

                  <button
                    onClick={() => handleCopyFilePath(activeFinding.file_path)}
                    className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedFilePath ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedFilePath ? "Copied" : "Copy Path"}</span>
                  </button>
                </div>
              </div>

              {/* AI Architectural Insight Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#121626] to-[#151a30] border border-[#232a42] space-y-2.5 relative overflow-hidden">
                <div className="flex items-center space-x-2 text-xs font-bold text-indigo-300">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>AI Architectural Analysis & Root Cause</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeFinding.ai_explanation}
                </p>
                <div className="flex items-center space-x-4 pt-1 text-[11px] text-slate-400 font-mono">
                  <span>Impact Horizon: <strong className="text-slate-200">{activeFinding.impact_horizon}</strong></span>
                  <span>•</span>
                  <span>Estimated Remediation: <strong className="text-slate-200">{activeFinding.remediation_estimate}</strong></span>
                </div>
              </div>

              {/* Code Diff Block Viewer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 font-mono text-slate-400">
                    <Code2 className="w-4 h-4 text-indigo-400" />
                    <span>Remediation Diff (AST Patch Ready)</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopyPatch(activeFinding)}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#141824] hover:bg-[#1a2030] border border-[#22283a] text-slate-300 hover:text-white text-xs font-mono transition-all"
                    >
                      {copiedPatchId === activeFinding.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedPatchId === activeFinding.id ? "Patch Copied" : "Copy Diff"}</span>
                    </button>

                    <button
                      onClick={() => {
                        const pId = activeProject?.id || "default-project";
                        const rId = activeRepository?.id || "default-repo";
                        downloadPatch(pId, rId, activeFinding.id);
                      }}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#141824] hover:bg-[#1a2030] border border-[#22283a] text-slate-300 hover:text-white text-xs font-mono transition-all"
                    >
                      <Download className="w-3 h-3 text-indigo-400" />
                      <span>.patch</span>
                    </button>
                  </div>
                </div>

                {/* Diff Container */}
                <div className="rounded-2xl border border-[#1e2335] bg-[#0c0e16] overflow-hidden text-xs font-mono">
                  {diffViewMode === "side-by-side" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#1e2335]">
                      {/* Old Code */}
                      <div className="flex flex-col">
                        <div className="px-4 py-2 bg-[#12141f] border-b border-[#1e2335] text-[11px] font-bold text-rose-300 flex items-center justify-between">
                          <span>Original Vulnerable Implementation</span>
                          <span className="text-[10px] font-mono px-1.5 rounded bg-rose-500/10 text-rose-400">
                            - Removed
                          </span>
                        </div>
                        <pre className="p-4 text-slate-300 overflow-x-auto leading-relaxed bg-[#0e1019] selection:bg-rose-500/20">
                          <code>{activeFinding.diff_block?.old_code}</code>
                        </pre>
                      </div>

                      {/* New Code */}
                      <div className="flex flex-col">
                        <div className="px-4 py-2 bg-[#121820] border-b border-[#1e2335] text-[11px] font-bold text-emerald-300 flex items-center justify-between">
                          <span>AI Synthesized Patch Implementation</span>
                          <span className="text-[10px] font-mono px-1.5 rounded bg-emerald-500/10 text-emerald-400">
                            + Proposed
                          </span>
                        </div>
                        <pre className="p-4 text-emerald-100 overflow-x-auto leading-relaxed bg-[#0c1416] selection:bg-emerald-500/20">
                          <code>{activeFinding.diff_block?.new_code}</code>
                        </pre>
                      </div>
                    </div>
                  ) : (
                    /* Unified Diff Mode */
                    <div className="p-4 overflow-x-auto leading-relaxed text-slate-200">
                      <div className="text-slate-500 text-[11px] mb-2">
                        --- a/{activeFinding.file_path}
                        <br />
                        +++ b/{activeFinding.file_path}
                      </div>
                      <pre className="selection:bg-indigo-500/30">
                        {activeFinding.diff_block?.patch_content || (
                          `${activeFinding.diff_block?.old_code}\n${activeFinding.diff_block?.new_code}`
                        )}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Automated Verification Guardrails Checklist */}
              <div className="p-5 rounded-2xl bg-[#10121d] border border-[#1b2032] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-bold text-white uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Automated Verification Guardrails</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    AST Pre-flight Checks
                  </span>
                </div>

                <div className="space-y-2.5">
                  {(reviewData?.checklist || []).map((item) => {
                    const isChecked = checklistStates[item.id] ?? item.checked;
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleChecklistItem(item.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start space-x-3 ${
                          isChecked
                            ? "bg-[#141828] border-indigo-500/40 text-slate-200"
                            : "bg-[#0d0f18] border-[#1a1e30] text-slate-400 hover:border-[#262c44]"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border transition-colors flex-shrink-0 ${
                            isChecked
                              ? "bg-indigo-600 border-indigo-500 text-white"
                              : "border-slate-600 bg-[#161a28]"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold text-slate-200">
                              {item.text}
                            </span>
                            {item.required_human && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                                Required Human Action
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                            {item.subtext}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Target Branch & Action Execution Strip */}
              <div className="p-4 rounded-2xl bg-[#111420] border border-[#1f253a] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
                  <GitBranch className="w-4 h-4 text-indigo-400" />
                  <span>Target Branch:</span>
                  <span className="px-2 py-0.5 rounded bg-[#171c2c] text-indigo-300 border border-[#272e45] font-semibold">
                    {reviewData?.target_branch || "castor-oil/patch-rev-9041"}
                  </span>
                </div>

                <div className="flex items-center space-x-2.5">
                  <button
                    onClick={() => handleAttachToAI(activeFinding)}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#151928] hover:bg-[#1d2238] border border-[#252b42] text-slate-200 hover:text-white text-xs font-medium transition-all"
                  >
                    <MessageSquareCode className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Attach to AI Chat →</span>
                  </button>

                  <button
                    onClick={() => applyPatch(activeFinding.id)}
                    disabled={isApplyingPatch || appliedPatchIds.includes(activeFinding.id)}
                    className={`flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all ${
                      appliedPatchIds.includes(activeFinding.id)
                        ? "bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 cursor-default"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30"
                    }`}
                  >
                    {isApplyingPatch ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Applying Patch to Branch...</span>
                      </>
                    ) : appliedPatchIds.includes(activeFinding.id) ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Patch Applied to Branch</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Apply Patch to Branch</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <Shield className="w-12 h-12 text-slate-600" />
              <div className="text-sm font-semibold text-slate-400">
                Select a finding from the left feed to inspect details and view diff patch
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 4. BOTTOM TELEMETRY STRIP */}
      <footer className="flex-shrink-0 bg-[#0a0c13] border-t border-[#161a27] px-5 py-2 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-400">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">Run ID:</span>
            <span className="text-indigo-400 font-semibold">{reviewData?.run_id || "REV-2026-9041"}</span>
          </div>

          <div className="hidden sm:flex items-center space-x-1.5 text-slate-500">
            <span>Engine:</span>
            <span className="text-slate-300">{metrics?.scanner_engine || "SemGrep AST v1.8 + Neural Heuristics"}</span>
          </div>

          <div className="hidden md:flex items-center space-x-1.5 text-slate-500">
            <span>Audited Files:</span>
            <span className="text-slate-300">{metrics?.audited_files_count || 142} Source Files</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-slate-500">OWASP Top 10:</span>
          <span className="text-rose-400 font-bold">{reviewData?.compliance_summary?.owasp_top_10 || "3 Violations"}</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-500">Clean Code Index:</span>
          <span className="text-emerald-400 font-bold">{reviewData?.compliance_summary?.clean_code_index || "78%"}</span>
        </div>
      </footer>
    </div>
  );
};
