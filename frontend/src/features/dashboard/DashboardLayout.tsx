import React, { useEffect, useState } from "react";
import {
  Cpu,
  FolderGit2,
  GitBranch,
  Activity,
  Zap,
  Search,
  Bell,
  LogOut,
  Shield,
  Network,
  Sparkles,
  Plus,
  Terminal,
  UploadCloud,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquareCode,
  ShieldAlert,
  ArrowRight,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useProjectStore } from "../../stores/projectStore";
import { ProjectManager } from "../projects/ProjectManager";
import { RepositoryIngestionView } from "../repositories/RepositoryIngestionView";
import { DependencyGraphView } from "../intelligence/DependencyGraphView";
import { FeatureDiscoveryView } from "../intelligence/FeatureDiscoveryView";
import { AIAssistantView } from "../intelligence/AIAssistantView";

interface DashboardLayoutProps {
  onNavigateHome?: () => void;
}

const FUTURE_FEATURES: Record<
  string,
  { title: string; featureId: string; phase: string; description: string; icon: React.ElementType }
> = {
  impact: {
    title: "Impact Analysis & Blast Radius Engine",
    featureId: "F-012",
    phase: "Phase 9",
    description:
      "Predict exactly what will break before you merge. Compute ripple effects and downstream breakages for any changed function or symbol.",
    icon: Zap,
  },
  review: {
    title: "Automated Code Review Engine",
    featureId: "F-013 & F-014",
    phase: "Phase 10",
    description:
      "Static heuristics combined with AI reviewers to find security vulnerabilities, code smells, performance bottlenecks, and generate non-destructive patches.",
    icon: ShieldAlert,
  },
  reports: {
    title: "Repository Intelligence Reports Export",
    featureId: "F-015",
    phase: "Phase 11",
    description:
      "Export high-resolution architecture diagrams, audit reports, tech debt indexes, and compliance documentation to PDF, Markdown, and DOCX.",
    icon: FileText,
  },
};

export const DashboardLayout: React.FC<DashboardLayoutProps> = () => {
  const { user, logout } = useAuthStore();
  const { projects, activeProject, fetchProjects } = useProjectStore();
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "projects" | "repositories" | "architecture" | "graph" | "features" | "ai" | "impact" | "review" | "reports"
  >("dashboard");
  const [repoInputUrl, setRepoInputUrl] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"active" | "all" | "empty">("active");
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | undefined>(undefined);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "MR";

  return (
    <div className="flex h-screen bg-[#0c0e16] text-[#e2e8f0] overflow-hidden font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* 1. Left Sidebar Navigation (Collapsible) */}
      <aside
        className={`${
          isSidebarCollapsed ? "w-16" : "w-64"
        } flex-shrink-0 bg-[#0c0e16] border-r border-[#1d1f28] flex flex-col justify-between select-none transition-all duration-300 relative z-40`}
      >
        <div>
          {/* Header Brand & Collapse Toggle */}
          <div
            className={`h-16 px-3 border-b border-[#1d1f28] flex items-center ${
              isSidebarCollapsed ? "justify-center" : "justify-between"
            }`}
          >
            {!isSidebarCollapsed && (
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/30 flex-shrink-0">
                  <Cpu className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white text-sm tracking-tight truncate">CodeLens AI</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#181a24] text-slate-400 border border-[#262835]">
                  v2.4
                </span>
              </div>
            )}

            {isSidebarCollapsed && (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/30 flex-shrink-0">
                <Cpu className="w-4 h-4 text-white" />
              </div>
            )}

            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 rounded-lg hover:bg-[#191c28] text-slate-400 hover:text-white transition-colors flex-shrink-0"
              title={isSidebarCollapsed ? "Expand Sidebar (more space)" : "Collapse Sidebar (more space)"}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-indigo-400" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation Items */}
          <div className="p-2 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)]">
            {/* WORKSPACE SECTION */}
            <div>
              {!isSidebarCollapsed ? (
                <div className="px-3 mb-2 text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500">
                  Workspace
                </div>
              ) : (
                <div className="h-px bg-[#1d1f28] my-2" />
              )}
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  title={isSidebarCollapsed ? "Dashboard" : undefined}
                  className={`w-full flex items-center ${
                    isSidebarCollapsed ? "justify-center p-2.5" : "space-x-2.5 px-3 py-2"
                  } rounded-xl text-xs font-medium transition-all ${
                    activeTab === "dashboard"
                      ? "bg-[#191c28] text-indigo-300 border border-indigo-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#12141e]"
                  }`}
                >
                  <Activity className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  {!isSidebarCollapsed && <span>Dashboard</span>}
                </button>

                <button
                  onClick={() => setActiveTab("projects")}
                  title={isSidebarCollapsed ? `Projects (${projects.length})` : undefined}
                  className={`w-full flex items-center ${
                    isSidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2"
                  } rounded-xl text-xs font-medium transition-all ${
                    activeTab === "projects"
                      ? "bg-[#191c28] text-indigo-300 border border-indigo-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#12141e]"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <FolderGit2 className="w-4 h-4 flex-shrink-0" />
                    {!isSidebarCollapsed && <span>Projects</span>}
                  </div>
                  {!isSidebarCollapsed && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#171a26] text-slate-400">
                      {projects.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("repositories")}
                  title={isSidebarCollapsed ? "Repositories" : undefined}
                  className={`w-full flex items-center ${
                    isSidebarCollapsed ? "justify-center p-2.5" : "space-x-2.5 px-3 py-2"
                  } rounded-xl text-xs font-medium transition-all ${
                    activeTab === "repositories"
                      ? "bg-[#191c28] text-indigo-300 border border-indigo-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#12141e]"
                  }`}
                >
                  <GitBranch className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  {!isSidebarCollapsed && <span>Repositories</span>}
                </button>
              </div>
            </div>

            {/* INTELLIGENCE SECTION */}
            <div>
              {!isSidebarCollapsed ? (
                <div className="px-3 mb-2 text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500">
                  Intelligence
                </div>
              ) : (
                <div className="h-px bg-[#1d1f28] my-2" />
              )}
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab("architecture")}
                  title={isSidebarCollapsed ? "Architecture (Live)" : undefined}
                  className={`w-full flex items-center ${
                    isSidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2"
                  } rounded-xl text-xs font-medium transition-all ${
                    activeTab === "architecture"
                      ? "bg-[#191c28] text-cyan-300 border border-cyan-500/40"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#12141e]"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Shield className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    {!isSidebarCollapsed && <span>Architecture</span>}
                  </div>
                  {!isSidebarCollapsed && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold">
                      Live
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("graph")}
                  title={isSidebarCollapsed ? "Dependency Graph (Live)" : undefined}
                  className={`w-full flex items-center ${
                    isSidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2"
                  } rounded-xl text-xs font-medium transition-all ${
                    activeTab === "graph"
                      ? "bg-[#191c28] text-indigo-300 border border-indigo-500/40"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#12141e]"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Network className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    {!isSidebarCollapsed && <span>Dependency Graph</span>}
                  </div>
                  {!isSidebarCollapsed && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold">
                      Live
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("features")}
                  title={isSidebarCollapsed ? "Feature Discovery (Live)" : undefined}
                  className={`w-full flex items-center ${
                    isSidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2"
                  } rounded-xl text-xs font-medium transition-all ${
                    activeTab === "features"
                      ? "bg-[#191c28] text-amber-300 border border-amber-500/40"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#12141e]"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    {!isSidebarCollapsed && <span>Feature Discovery</span>}
                  </div>
                  {!isSidebarCollapsed && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold">
                      Live
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("ai")}
                  title={isSidebarCollapsed ? "AI Assistant (Live)" : undefined}
                  className={`w-full flex items-center ${
                    isSidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2"
                  } rounded-xl text-xs font-medium transition-all ${
                    activeTab === "ai"
                      ? "bg-[#191c28] text-indigo-300 border border-indigo-500/40"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#12141e]"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <MessageSquareCode className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    {!isSidebarCollapsed && <span>AI Assistant</span>}
                  </div>
                  {!isSidebarCollapsed && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold">
                      Live
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("impact")}
                  title={isSidebarCollapsed ? "Impact Analysis (Next)" : undefined}
                  className={`w-full flex items-center ${
                    isSidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2"
                  } rounded-xl text-xs font-medium transition-all ${
                    activeTab === "impact"
                      ? "bg-[#191c28] text-indigo-300 border border-indigo-500/40"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#12141e]"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Zap className="w-4 h-4 flex-shrink-0" />
                    {!isSidebarCollapsed && <span>Impact Analysis</span>}
                  </div>
                  {!isSidebarCollapsed && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                      Next
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* QUALITY SECTION */}
            <div>
              {!isSidebarCollapsed ? (
                <div className="px-3 mb-2 text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500">
                  Quality
                </div>
              ) : (
                <div className="h-px bg-[#1d1f28] my-2" />
              )}
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab("review")}
                  title={isSidebarCollapsed ? "Code Review (Soon)" : undefined}
                  className={`w-full flex items-center ${
                    isSidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2"
                  } rounded-xl text-xs font-medium transition-all ${
                    activeTab === "review"
                      ? "bg-[#191c28] text-indigo-300 border border-indigo-500/40"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#12141e]"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    {!isSidebarCollapsed && <span>Code Review</span>}
                  </div>
                  {!isSidebarCollapsed && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      Soon
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("reports")}
                  title={isSidebarCollapsed ? "Reports (Soon)" : undefined}
                  className={`w-full flex items-center ${
                    isSidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2"
                  } rounded-xl text-xs font-medium transition-all ${
                    activeTab === "reports"
                      ? "bg-[#191c28] text-indigo-300 border border-indigo-500/40"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#12141e]"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    {!isSidebarCollapsed && <span>Reports</span>}
                  </div>
                  {!isSidebarCollapsed && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      Soon
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* User Footer Profile */}
        <div className="p-2 border-t border-[#1d1f28] bg-[#0c0e16]">
          {!isSidebarCollapsed ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#12141e] border border-[#1e2230]">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#202538] border border-[#30364e] flex items-center justify-center font-semibold text-slate-200 text-xs">
                  {userInitials}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{user?.name || "Developer"}</div>
                  <div className="text-[10px] text-slate-500 truncate">Free Plan</div>
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1">
              <div
                className="w-8 h-8 rounded-full bg-[#202538] border border-[#30364e] flex items-center justify-center font-semibold text-slate-200 text-xs"
                title={`${user?.name || "Developer"} (Free Plan)`}
              >
                {userInitials}
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* 2. Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0c0e16] overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-[#1d1f28] bg-[#0c0e16]/90 backdrop-blur-md px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            {isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="p-1.5 rounded-lg bg-[#12141e] border border-[#1f2334] text-slate-400 hover:text-white hover:bg-[#191c28] transition-colors"
                title="Expand navigation sidebar"
              >
                <PanelLeftOpen className="w-4 h-4 text-indigo-400" />
              </button>
            )}
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-xs text-white">CodeLens AI</span>
            </div>
            <span className="text-slate-600">/</span>
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#131622] border border-[#1f2334] text-[11px] font-mono text-sky-400">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>{activeProject ? activeProject.name : "production-workspace"}</span>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-96 hidden md:block">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search repositories, files, features..."
              className="w-full pl-9 pr-10 py-1.5 rounded-xl bg-[#11131b] border border-[#1d202d] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 px-1.5 py-0.2 rounded border border-[#232738] bg-[#0c0e16]">
              ⌘K
            </span>
          </div>

          {/* Right actions */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs font-mono text-sky-400">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <span className="hidden sm:inline">Connected / AST Engine</span>
            </div>

            <button title="Documentation" className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#141724]">
              <BookOpen className="w-4 h-4" />
            </button>

            <button title="Notifications" className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#141724] relative">
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-indigo-500 absolute top-1 right-1" />
            </button>

            <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-[11px] text-indigo-300">
              {userInitials}
            </div>

            <button
              onClick={() => setActiveTab("repositories")}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Analyze Repository</span>
            </button>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto ${activeTab === "graph" || activeTab === "architecture" || activeTab === "features" || activeTab === "ai" ? "p-0 overflow-hidden" : "p-6 space-y-6"}`}>
          {activeTab === "projects" ? (
            <ProjectManager />
          ) : activeTab === "repositories" ? (
            <RepositoryIngestionView />
          ) : activeTab === "graph" || activeTab === "architecture" ? (
            <DependencyGraphView onBack={() => setActiveTab("dashboard")} />
          ) : activeTab === "features" ? (
            <FeatureDiscoveryView
              onBack={() => setActiveTab("dashboard")}
              onNavigateToGraph={() => setActiveTab("graph")}
              onNavigateToAI={(context) => {
                setAiInitialPrompt(context);
                setActiveTab("ai");
              }}
              onNavigateToImpact={() => setActiveTab("impact")}
            />
          ) : activeTab === "ai" ? (
            <AIAssistantView
              initialPrompt={aiInitialPrompt}
              onBack={() => setActiveTab("dashboard")}
              onNavigateToGraph={() => setActiveTab("graph")}
              onNavigateToImpact={() => setActiveTab("impact")}
            />
          ) : activeTab in FUTURE_FEATURES ? (
            (() => {
              const feat = FUTURE_FEATURES[activeTab];
              const IconComp = feat.icon;
              return (
                <div className="py-20 px-6 max-w-2xl mx-auto text-center space-y-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-sky-500/10 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-xl shadow-indigo-950/50">
                    <IconComp className="w-8 h-8 text-indigo-400" />
                  </div>

                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                    <span>{feat.featureId} • {feat.phase} • COMING SOON</span>
                  </div>

                  <h2 className="text-2xl font-bold text-white tracking-tight">{feat.title}</h2>

                  <p className="text-sm text-slate-400 leading-relaxed max-w-lg mx-auto">
                    {feat.description}
                  </p>

                  <div className="p-4 rounded-xl bg-[#11131b] border border-[#1d202d] text-xs font-mono text-slate-400 max-w-md mx-auto flex items-center justify-between">
                    <span>Roadmap Status</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      Coming Soon (Next Feature)
                    </span>
                  </div>

                  <div className="flex items-center justify-center space-x-3 pt-2">
                    <button
                      onClick={() => setActiveTab("dashboard")}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2"
                    >
                      <span>Return to Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveTab("projects")}
                      className="px-5 py-2.5 rounded-xl bg-[#141724] hover:bg-[#1a1f30] text-slate-300 hover:text-white border border-[#232738] text-xs font-medium transition-all"
                    >
                      <span>Manage Projects (F-002)</span>
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            <>
              {/* Greeting Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
                    <span>Good evening, {user?.name?.split(" ")[0] || "Developer"}</span>
                    <span className="text-sky-400 text-sm">✦</span>
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Understand your codebases faster. AST engine synchronized with {projects.length || 8} active
                    repositories.
                  </p>
                </div>

                <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-[#11131b] border border-[#1d202d] text-xs font-medium text-slate-400">
                  <button
                    onClick={() => setSelectedFilter("active")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      selectedFilter === "active" ? "bg-[#1c2030] text-white" : "hover:text-white"
                    }`}
                  >
                    Active Live
                  </button>
                  <button
                    onClick={() => setSelectedFilter("all")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      selectedFilter === "all" ? "bg-[#1c2030] text-white" : "hover:text-white"
                    }`}
                  >
                    All Analyzed
                  </button>
                  <button
                    onClick={() => setSelectedFilter("empty")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      selectedFilter === "empty" ? "bg-[#1c2030] text-white" : "hover:text-white"
                    }`}
                  >
                    Empty View
                  </button>
                </div>
              </div>

              {/* Quick Analyze a Repository Card */}
              <div className="p-5 rounded-2xl bg-[#11131b] border border-[#1d202d] relative overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Terminal className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Analyze a Repository</h3>
                      <p className="text-xs text-slate-400">
                        Connect a GitHub repository or upload an archive ZIP to parse AST and microservice
                        dependencies.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] font-mono">
                    <span className="px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      Tree-sitter Parser v0.21
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-[#181a25] text-slate-400 border border-[#272a3b]">
                      AST Telemetry Ready
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <GitBranch className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="https://github.com/acme-corp/ecommerce-platform"
                      value={repoInputUrl}
                      onChange={(e) => setRepoInputUrl(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0c0e16] border border-[#202434] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    onClick={() => setActiveTab("repositories")}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 whitespace-nowrap transition-all"
                  >
                    Analyze AST
                  </button>
                  <span className="text-xs font-mono text-slate-500 uppercase px-1">OR</span>
                  <button
                    onClick={() => setActiveTab("repositories")}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#181b28] hover:bg-[#1f2334] text-slate-300 hover:text-white border border-[#272b3e] text-xs font-medium whitespace-nowrap flex items-center justify-center space-x-2 transition-all"
                  >
                    <UploadCloud className="w-4 h-4 text-indigo-400" />
                    <span>Upload .zip / .tar.gz</span>
                  </button>
                </div>
              </div>

              {/* Key Metrics Row (4 Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-[#11131b] border border-[#1d202d] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase">
                    <span>Projects</span>
                    <FolderGit2 className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="my-2 flex items-baseline space-x-2">
                    <span className="text-3xl font-bold text-white">{projects.length || 6}</span>
                    <span className="text-[11px] font-mono text-emerald-400">↗ +1 wk</span>
                  </div>
                  <div className="text-[11px] text-slate-500">3 production workspaces</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#11131b] border border-[#1d202d] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase">
                    <span>Repositories</span>
                    <GitBranch className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="my-2 flex items-baseline space-x-2">
                    <span className="text-3xl font-bold text-white">8</span>
                    <span className="text-[11px] font-mono text-sky-400">Tracked</span>
                  </div>
                  <div className="text-[11px] text-slate-500">Across GitHub & self-hosted</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#11131b] border border-[#1d202d] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase">
                    <span>AST Analyses</span>
                    <Zap className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="my-2 flex items-baseline space-x-2">
                    <span className="text-3xl font-bold text-white">24</span>
                    <span className="text-[11px] font-mono text-sky-400">99.2% ok</span>
                  </div>
                  <div className="text-[11px] text-slate-500">18.4k nodes compiled</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#11131b] border border-[#1d202d] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase">
                    <span>Code Reviews</span>
                    <Shield className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="my-2 flex items-baseline space-x-2">
                    <span className="text-3xl font-bold text-white">11</span>
                    <span className="text-[11px] font-mono text-rose-400">3 flagged</span>
                  </div>
                  <div className="text-[11px] text-slate-500">0-critical CVEs pending</div>
                </div>
              </div>

              {/* Live AST Analysis Banner */}
              <div className="p-4 rounded-2xl bg-[#11131b] border border-[#1d202d] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-2 font-mono">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                    <span className="font-bold text-sky-400">ANALYZING AST</span>
                    <span className="text-white font-semibold">acme-corp / ecommerce-platform</span>
                    <span className="text-slate-500">branch: main (3f2a1b)</span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-400 font-mono text-[11px]">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Elapsed: 00:24s</span>
                    </span>
                    <button className="text-slate-400 hover:text-white">Cancel</button>
                  </div>
                </div>

                {/* Pipeline Progress Stages */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
                  <span className="flex items-center space-x-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Upload verified</span>
                  </span>
                  <span className="flex items-center space-x-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Discovery (1,042)</span>
                  </span>
                  <span className="flex items-center space-x-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Language (8 stacks)</span>
                  </span>
                  <span className="flex items-center space-x-1 text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <span>Dep Graph (72%)</span>
                  </span>
                  <span className="text-slate-500 px-2 py-0.5">Vector Embeddings</span>
                  <span className="text-slate-500 px-2 py-0.5">Synthesis</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-[#181b26]">
                  <span className="truncate">
                    Parsing cross-module calls in <code className="text-slate-300">backend/services/payment.service.ts</code>...
                  </span>
                  <span className="font-mono text-slate-500 flex-shrink-0">
                    Files: 1,042 • Deps: 312 • Symbols: 1,204
                  </span>
                </div>
              </div>

              {/* Two-Column Lower View */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 8 cols: Recent Repositories + Compilation Workload */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Recent Repositories */}
                  <div className="p-5 rounded-2xl bg-[#11131b] border border-[#1d202d] space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-white">Recent Repositories</h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1c2030] text-slate-400">
                          6 total
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveTab("projects")}
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                      >
                        <span>View all repositories</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Repo Card 1 */}
                    <div className="p-4 rounded-xl bg-[#0c0e16] border border-[#1d202d] hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                            <Cpu className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white text-xs">ecommerce-platform</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                              <span className="text-[11px] font-mono text-sky-400">72%</span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              github.com/acme-corp/ecommerce-platform
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 text-xs">
                          <span className="text-[11px] font-mono text-sky-400">Analyzing now</span>
                          <button
                            onClick={() => setActiveTab("projects")}
                            className="px-3 py-1 rounded-lg bg-[#181b28] hover:bg-[#202538] text-slate-200 text-xs font-medium border border-[#262a3e] flex items-center space-x-1"
                          >
                            <span>Cockpit</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#181b26] text-xs">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-[#141722] text-slate-300 text-[10px] font-mono border border-[#212536]">
                            Python (FastAPI)
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#141722] text-slate-300 text-[10px] font-mono border border-[#212536]">
                            PostgreSQL
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#141722] text-slate-300 text-[10px] font-mono border border-[#212536]">
                            Redis
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#141722] text-slate-300 text-[10px] font-mono border border-[#212536]">
                            Docker
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          1,042 files • 312 deps • 14 microservices
                        </div>
                      </div>
                    </div>

                    {/* Repo Card 2 */}
                    <div className="p-4 rounded-xl bg-[#0c0e16] border border-[#1d202d] hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                            <FolderGit2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white text-xs">CodeDNA</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              github.com/muni-reddy/codedna
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 text-xs">
                          <span className="text-[11px] font-mono text-slate-500">Analyzed Yesterday, 18:42</span>
                          <button
                            onClick={() => setActiveTab("projects")}
                            className="px-3 py-1 rounded-lg bg-[#181b28] hover:bg-[#202538] text-slate-200 text-xs font-medium border border-[#262a3e] flex items-center space-x-1"
                          >
                            <span>Open</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#181b26] text-xs">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-[#141722] text-slate-300 text-[10px] font-mono border border-[#212536]">
                            TypeScript (Next.js 14)
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#141722] text-slate-300 text-[10px] font-mono border border-[#212536]">
                            Tailwind
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#141722] text-slate-300 text-[10px] font-mono border border-[#212536]">
                            Prisma
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          824 files • 98 deps • 308 symbols
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weekly Compilation Workload Chart Mock */}
                  <div className="p-5 rounded-2xl bg-[#11131b] border border-[#1d202d] space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Weekly Compilation Workload
                      </h4>
                      <span className="text-[11px] font-mono text-sky-400">Peak: 3,428 AST nodes/sec</span>
                    </div>

                    <div className="h-28 flex items-end justify-between px-2 pt-4">
                      {/* SVG Wave Line */}
                      <svg className="w-full h-24 overflow-visible" viewBox="0 0 500 80">
                        <defs>
                          <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 0 65 Q 80 50, 160 60 T 320 20 T 420 50 T 500 25 L 500 80 L 0 80 Z"
                          fill="url(#grad)"
                        />
                        <path
                          d="M 0 65 Q 80 50, 160 60 T 320 20 T 420 50 T 500 25"
                          fill="none"
                          stroke="#818cf8"
                          strokeWidth="2.5"
                        />
                        <circle cx="320" cy="20" r="4" fill="#a5b4fc" />
                        <circle cx="500" cy="25" r="4" fill="#a5b4fc" />
                      </svg>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-1 border-t border-[#181b26] pt-2">
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                      <span className="text-indigo-400 font-semibold">Today (Sun)</span>
                    </div>
                  </div>
                </div>

                {/* Right 4 cols: Intelligence Shortcuts + Activity Feed + Quota */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Intelligence Shortcuts */}
                  <div className="p-5 rounded-2xl bg-[#11131b] border border-[#1d202d] space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Intelligence Shortcuts
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        onClick={() => setActiveTab("architecture")}
                        className="p-3 rounded-xl bg-[#0c0e16] border border-[#1d202d] hover:border-indigo-500/40 cursor-pointer transition-all"
                      >
                        <Shield className="w-5 h-5 text-indigo-400 mb-2" />
                        <div className="text-xs font-bold text-white">Architecture</div>
                        <div className="text-[10px] text-slate-500">Layer isolation</div>
                      </div>

                      <div
                        onClick={() => setActiveTab("graph")}
                        className="p-3 rounded-xl bg-[#0c0e16] border border-[#1d202d] hover:border-indigo-500/40 cursor-pointer transition-all"
                      >
                        <Network className="w-5 h-5 text-sky-400 mb-2" />
                        <div className="text-xs font-bold text-white">Graph View</div>
                        <div className="text-[10px] text-slate-500">Dependency cycles</div>
                      </div>

                      <div
                        onClick={() => setActiveTab("ai")}
                        className="p-3 rounded-xl bg-[#0c0e16] border border-[#1d202d] hover:border-indigo-500/40 cursor-pointer transition-all"
                      >
                        <Sparkles className="w-5 h-5 text-purple-400 mb-2" />
                        <div className="text-xs font-bold text-white">Code Assistant</div>
                        <div className="text-[10px] text-slate-500">Natural queries</div>
                      </div>

                      <div
                        onClick={() => setActiveTab("review")}
                        className="p-3 rounded-xl bg-[#0c0e16] border border-[#1d202d] hover:border-indigo-500/40 cursor-pointer transition-all"
                      >
                        <ShieldAlert className="w-5 h-5 text-rose-400 mb-2" />
                        <div className="text-xs font-bold text-white">Security Audit</div>
                        <div className="text-[10px] text-slate-500">Smells & risks</div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity Audit Trail */}
                  <div className="p-5 rounded-2xl bg-[#11131b] border border-[#1d202d] space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Recent Activity</h4>
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                    </div>

                    <div className="space-y-3.5 text-xs">
                      <div className="flex items-start space-x-2.5">
                        <span className="w-2 h-2 rounded-full bg-sky-400 mt-1 flex-shrink-0" />
                        <div>
                          <div className="text-slate-200 font-medium">Repository analysis in-progress</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            ecommerce-platform (72%) • Just now
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start space-x-2.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 mt-1 flex-shrink-0" />
                        <div>
                          <div className="text-slate-200 font-medium">Code review: 3 vulnerabilities</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            CodeDNA / auth-provider • Yesterday 18:42
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start space-x-2.5">
                        <span className="w-2 h-2 rounded-full bg-purple-400 mt-1 flex-shrink-0" />
                        <div>
                          <div className="text-slate-200 font-medium">Dependency cycle detected</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            auth_middleware.ts → session.go • 2 days ago
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab("reports")}
                      className="w-full text-center text-xs text-indigo-400 hover:text-indigo-300 font-medium pt-2 border-t border-[#181b26] flex items-center justify-center space-x-1"
                    >
                      <span>View complete audit trail</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* AST Engine Quota Box */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-[#12141f] to-[#151928] border border-[#21263c] space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400 uppercase font-bold">AST Engine Quota</span>
                      <span className="text-sky-400">18,450 / 50,000</span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-[#0c0e16] overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full w-[37%]" />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500">Free Tier Workspace</span>
                      <button className="text-indigo-400 hover:text-indigo-300 font-semibold">
                        Upgrade Plan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};
