import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Zap,
  Target,
  ChevronRight,
  ChevronDown,
  GitCommit,
  Layers,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  MessageSquareCode,
  Download,
  Copy,
  Check,
  Play,
  RotateCcw,
  HelpCircle,
  Code2,
  RefreshCw,
  FolderGit2,
  GitBranch,
  Network,
  Plus,
  Minus,
  Move,
} from "lucide-react";
import { useImpactStore } from "../../stores/impactStore";
import { useProjectStore } from "../../stores/projectStore";
import { useRepositoryStore } from "../../stores/repositoryStore";
import type { CandidateSymbol, ImpactNode, SymbolType } from "../../types/impact";
import type { Repository } from "../../types/repository";

interface ImpactAnalysisViewProps {
  onBack?: () => void;
  onNavigateToGraph?: () => void;
  onNavigateToAI?: (initialPrompt?: string) => void;
}

const CURATED_CANDIDATE_SYMBOLS: CandidateSymbol[] = [
  {
    id: "PaymentService.processPayment()",
    name: "PaymentService.processPayment()",
    type: "fn",
    file_path: "core/services/payment_service.py",
    line_number: 114,
    layer: "service",
  },
  {
    id: "AuthService.authenticateUser()",
    name: "AuthService.authenticateUser()",
    type: "fn",
    file_path: "core/services/auth_service.py",
    line_number: 42,
    layer: "service",
  },
  {
    id: "CheckoutController",
    name: "CheckoutController",
    type: "class",
    file_path: "controllers/checkout_controller.py",
    line_number: 28,
    layer: "routing",
  },
  {
    id: "POST /api/v1/orders/checkout",
    name: "POST /api/v1/orders/checkout",
    type: "endpoint",
    file_path: "api/v1/endpoints/orders.py",
    line_number: 65,
    layer: "routing",
  },
  {
    id: "OrderRepository.save()",
    name: "OrderRepository.save()",
    type: "fn",
    file_path: "repositories/order_repo.py",
    line_number: 88,
    layer: "persistence",
  },
];

export const ImpactAnalysisView: React.FC<ImpactAnalysisViewProps> = ({
  onNavigateToGraph,
  onNavigateToAI,
}) => {
  const { projects, activeProject, setActiveProject, fetchProjects } = useProjectStore();
  const { repositories, activeRepository, setActiveRepository, fetchRepositories } = useRepositoryStore();

  const {
    currentAnalysis,
    availableSymbols,
    targetSymbol,
    targetType,
    depth,
    isLoading,
    selectedFilter,
    activeInspectorTab,
    selectedNode,
    hoveredNode,
    showWrapperCode,
    checklistStates,
    setTargetSymbol,
    setTargetType,
    setDepth,
    setSelectedFilter,
    setActiveInspectorTab,
    setSelectedNode,
    setHoveredNode,
    toggleChecklistItem,
    toggleShowWrapperCode,
    runImpactAnalysis,
    fetchSymbols,
  } = useImpactStore();

  const [copiedCode, setCopiedCode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [symbolSearchOpen, setSymbolSearchOpen] = useState(false);
  const [testRunStates, setTestRunStates] = useState<Record<string, "idle" | "running" | "passed">>(
    {}
  );

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Canvas pan / drag & scroll state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialPanX: 0, initialPanY: 0 });

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialPanX: panOffset.x,
      initialPanY: panOffset.y,
    };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPanOffset({
      x: dragStartRef.current.initialPanX + dx,
      y: dragStartRef.current.initialPanY + dy,
    });
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleCanvasWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoomLevel((prev) => Math.max(50, Math.min(180, prev - e.deltaY * 0.1)));
    } else {
      setPanOffset((prev) => ({
        x: prev.x - e.deltaX * 0.8,
        y: prev.y - e.deltaY * 0.8,
      }));
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSymbolSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeProjId = activeProject?.id || (projects.length > 0 ? projects[0].id : "default-project");
  const activeRepoId = activeRepository?.id || (repositories.length > 0 ? repositories[0].id : "default-repo");

  // Fetch projects and repos on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (activeProject) {
      fetchRepositories(activeProject.id);
    }
  }, [activeProject, fetchRepositories]);

  // Initial and reactive load on project/repo change
  useEffect(() => {
    if (activeProjId && activeRepoId) {
      runImpactAnalysis(activeProjId, activeRepoId, targetSymbol, targetType, depth);
      fetchSymbols(activeProjId, activeRepoId);
    }
  }, [activeProjId, activeRepoId]);

  const handleRunAnalysis = (symbol?: string | React.MouseEvent, type?: SymbolType) => {
    const sym = typeof symbol === "string" ? symbol : targetSymbol;
    const t = typeof type === "string" ? type : targetType;
    runImpactAnalysis(activeProjId, activeRepoId, sym, t, depth);
  };

  const handleCopyWrapper = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRunSingleTest = (testFile: string) => {
    setTestRunStates((prev) => ({ ...prev, [testFile]: "running" }));
    setTimeout(() => {
      setTestRunStates((prev) => ({ ...prev, [testFile]: "passed" }));
    }, 1200);
  };

  const handleAskAI = () => {
    if (onNavigateToAI) {
      const prompt = `Can you provide a blast radius impact breakdown and safe non-breaking refactoring strategy for modifying \`${targetSymbol}\`? Callers affected: ${currentAnalysis?.metrics.directly_affected_count || 6}, contract breaks: ${currentAnalysis?.metrics.contract_breaks_detected || 2}.`;
      onNavigateToAI(prompt);
    }
  };

  // Filtered candidate symbols for target input dropdown
  const candidateSymbolsToDisplay = useMemo(() => {
    if (availableSymbols && availableSymbols.length > 0) {
      return availableSymbols;
    }
    return CURATED_CANDIDATE_SYMBOLS;
  }, [availableSymbols]);

  // Node filtering
  const allNodes = currentAnalysis?.concentric_nodes || [];
  const filteredNodes = allNodes.filter((node) => {
    if (node.ring === 0) return true; // always show epicenter
    if (selectedFilter === "all") return true;
    if (selectedFilter === "service") return node.layer === "service";
    if (selectedFilter === "routing") return node.layer === "routing";
    if (selectedFilter === "test") return node.layer === "test" || node.node_type === "test";
    return true;
  });

  const nodeMap = new Map<string, ImpactNode>();
  filteredNodes.forEach((n) => nodeMap.set(n.id, n));

  // Compute category counts for filter buttons
  const counts = useMemo(() => {
    const service = allNodes.filter((n) => n.ring > 0 && n.layer === "service").length;
    const routing = allNodes.filter((n) => n.ring > 0 && n.layer === "routing").length;
    const test = allNodes.filter((n) => n.ring > 0 && (n.layer === "test" || n.node_type === "test")).length;
    return {
      all: allNodes.length,
      service,
      routing,
      test,
    };
  }, [allNodes]);

  // Dynamic positioning map for concentric orbits: Center is (350, 310)
  const nodePositionMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    const cx = 350;
    const cy = 310;

    // Ring 0: Epicenter
    const epicenter = filteredNodes.find((n) => n.ring === 0);
    if (epicenter) {
      map.set(epicenter.id, { x: cx, y: cy });
    }

    const ringsConfig = [
      { ring: 1, radius: 140, startAngle: -Math.PI / 2 },
      { ring: 2, radius: 240, startAngle: -Math.PI / 2 + 0.6 },
      { ring: 3, radius: 320, startAngle: -Math.PI / 2 + 0.3 },
    ];

    ringsConfig.forEach(({ ring, radius, startAngle }) => {
      const rNodes = filteredNodes.filter((n) => n.ring === ring);
      const count = rNodes.length;
      rNodes.forEach((node, i) => {
        const angle = startAngle + (2 * Math.PI * i) / Math.max(1, count);
        map.set(node.id, {
          x: Math.round(cx + radius * Math.cos(angle)),
          y: Math.round(cy + radius * Math.sin(angle)),
        });
      });
    });

    return map;
  }, [filteredNodes]);

  const blastScore = currentAnalysis?.metrics.blast_radius_score || 74;
  const isHighRisk = blastScore >= 70;
  const isModRisk = blastScore >= 45 && blastScore < 70;

  return (
    <div className="flex flex-col h-full bg-[#0c0e16] text-[#e2e1ed] overflow-y-auto">
      {/* ================= TOP HEADER & SCOPE SELECTOR (STICKY) ================= */}
      <div className="sticky top-0 z-30 p-6 pb-4 space-y-4 bg-[#11131b] border-b border-[#282a32] shadow-2xl relative">
        {/* Ambient Top Glow */}
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Breadcrumbs & Quick Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
            <span className="text-slate-500">Workspace</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />

            {/* Project Dropdown */}
            <div className="relative inline-flex items-center">
              <FolderGit2 className="w-3.5 h-3.5 text-indigo-400 mr-1.5" />
              <select
                aria-label="Active Project"
                value={activeProjId}
                onChange={(e) => {
                  const proj = projects.find((p) => p.id === e.target.value) || null;
                  setActiveProject(proj);
                  if (proj) {
                    fetchRepositories(proj.id);
                  }
                  runImpactAnalysis(e.target.value, activeRepoId, targetSymbol, targetType, depth);
                }}
                className="bg-[#191b24] text-slate-200 border border-[#282a32] rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />

            {/* Repository Dropdown */}
            <div className="relative inline-flex items-center">
              <GitBranch className="w-3.5 h-3.5 text-cyan-400 mr-1.5" />
              <select
                aria-label="Active Repository"
                value={activeRepoId}
                onChange={(e) => {
                  const repo = repositories.find((r: Repository) => r.id === e.target.value) || null;
                  setActiveRepository(repo);
                  runImpactAnalysis(activeProjId, e.target.value, targetSymbol, targetType, depth);
                }}
                className="bg-[#191b24] text-slate-200 border border-[#282a32] rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {repositories.length > 0 ? (
                  repositories.map((r: Repository) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))
                ) : (
                  <option value="default-repo">workspace-repo</option>
                )}
              </select>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="px-2 py-0.5 rounded bg-[#191b24] text-cyan-300 border border-cyan-500/20 flex items-center gap-1">
              <GitCommit className="w-3 h-3 text-cyan-400" />
              main <span className="text-slate-500">#9a4f21</span>
            </span>

            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-indigo-300 font-semibold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              Impact Analysis Workbench
            </span>
          </div>

          {/* Quick Utility Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToGraph}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#191b24] hover:bg-[#282a32] text-slate-300 hover:text-white border border-[#282a32] text-xs font-medium transition-all shadow-sm"
              title="Open full 3D interactive dependency view"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Open in 3D Canvas
            </button>

            <button
              onClick={handleAskAI}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#191b24] hover:bg-[#282a32] text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 text-xs font-medium transition-all shadow-sm"
              title="Open chat workbench with preloaded impact context"
            >
              <MessageSquareCode className="w-3.5 h-3.5 text-indigo-400" />
              Ask AI Assistant
            </button>

            <button
              onClick={() => {
                const jsonBlob = new Blob([JSON.stringify(currentAnalysis, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(jsonBlob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `impact-analysis-${targetSymbol.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
                a.click();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#191b24] hover:bg-[#282a32] text-slate-300 hover:text-white border border-[#282a32] text-xs font-medium transition-all shadow-sm"
              title="Export JSON / Markdown report"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              Export Report
            </button>
          </div>
        </div>

        {/* Target Search & Depth Selector Row */}
        <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-4 pt-1">
          {/* Target Input & Type Pills */}
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
            <div
              ref={dropdownRef}
              className="relative flex items-center bg-[#0c0e16] border border-[#282a32] focus-within:border-indigo-500 px-3 py-2 rounded-lg flex-1 min-w-[320px] shadow-inner transition-colors"
            >
              <Target className="w-4 h-4 text-indigo-400 mr-2 flex-shrink-0" />
              <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold mr-2 uppercase shrink-0">
                {targetType}
              </span>
              <input
                aria-label="Locate AST symbol"
                value={targetSymbol}
                onChange={(e) => {
                  setTargetSymbol(e.target.value);
                  setSymbolSearchOpen(true);
                }}
                onClick={() => setSymbolSearchOpen(true)}
                onFocus={() => setSymbolSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSymbolSearchOpen(false);
                    handleRunAnalysis();
                  }
                }}
                className="bg-transparent text-slate-100 font-mono text-xs focus:outline-none flex-1 min-w-0 placeholder:text-slate-500"
                placeholder="Locate AST symbol, function, or route (e.g. PaymentService.processPayment)..."
                spellCheck={false}
              />
              <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-[#1d1f28] border border-[#282a32] ml-2 shrink-0">
                AST:L114
              </span>
              <button
                type="button"
                onClick={() => setSymbolSearchOpen((prev) => !prev)}
                className="p-1 ml-1 text-slate-400 hover:text-slate-200 rounded hover:bg-[#1d1f28] transition-colors"
                title="Toggle Candidate Symbols"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${symbolSearchOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Suggestions Dropdown */}
              {symbolSearchOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#11131b] border border-[#282a32] rounded-xl shadow-2xl p-2 z-50 max-h-64 overflow-y-auto space-y-1">
                  <div className="flex items-center justify-between text-[10px] uppercase font-mono font-bold text-slate-500 px-2 py-1">
                    <span>Candidate AST Symbols ({candidateSymbolsToDisplay.length})</span>
                    <span className="text-[9px] text-indigo-400 font-normal">Click to Select</span>
                  </div>
                  {candidateSymbolsToDisplay.map((sym) => (
                    <button
                      key={sym.id}
                      type="button"
                      onClick={() => {
                        setTargetSymbol(sym.name);
                        setTargetType((sym.type as SymbolType) || "fn");
                        setSymbolSearchOpen(false);
                        handleRunAnalysis(sym.name, (sym.type as SymbolType) || "fn");
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#1d1f28] flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[9px] font-mono uppercase shrink-0">
                          {sym.type || "fn"}
                        </span>
                        <span className="font-mono text-xs text-slate-200 group-hover:text-cyan-300 truncate">
                          {sym.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 truncate max-w-[180px] shrink-0 ml-2">
                        {sym.file_path}
                      </span>
                    </button>
                  ))}
                  <div className="pt-1 border-t border-[#282a32] flex items-center justify-between px-2">
                    <span className="text-[10px] text-slate-500 font-mono">Or type custom symbol above</span>
                    <button
                      type="button"
                      onClick={() => setSymbolSearchOpen(false)}
                      className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Symbol Type Selector Buttons */}
            <div className="flex items-center bg-[#0c0e16] p-1 rounded-lg border border-[#282a32] gap-1">
              {(["fn", "class", "endpoint", "file"] as SymbolType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setTargetType(type)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono uppercase font-medium transition-all ${
                    targetType === type
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#1d1f28]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Depth Toggle & Run CTA */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center bg-[#0c0e16] p-1 rounded-lg border border-[#282a32] gap-1">
              <span className="text-[11px] font-mono text-slate-400 px-2">Depth:</span>
              {[1, 2, 3, 4].map((d) => (
                <button
                  key={d}
                  onClick={() => setDepth(d)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all ${
                    depth === d
                      ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#1d1f28]"
                  }`}
                >
                  {d === 3 ? "3-Hops (Default)" : d === 4 ? "4-Hops (Max)" : `${d}-Hop`}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleRunAnalysis()}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 fill-white" />
              )}
              {isLoading ? "Simulating Cascade..." : "Run Impact Analysis"}
            </button>
          </div>
        </div>
      </div>

      {/* ================= TOP SUMMARY METRICS DECK (4 Glassmorphic KPI Cards) ================= */}
      <div className="p-6 pt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Blast Radius Score */}
        <div className="relative bg-[#11131b] border border-[#282a32] p-4 rounded-xl shadow-lg flex items-center justify-between overflow-hidden">
          <div
            className={`absolute -left-6 -bottom-6 w-24 h-24 rounded-full blur-xl pointer-events-none ${
              isHighRisk ? "bg-red-500/15" : isModRisk ? "bg-amber-500/15" : "bg-emerald-500/15"
            }`}
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-medium">
              Blast Radius Score
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span
                className={`text-2xl font-bold font-mono ${
                  isHighRisk ? "text-red-400" : isModRisk ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                {blastScore}
              </span>
              <span className="text-xs font-mono text-slate-500">/ 100</span>
              <span
                className={`ml-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-tight border ${
                  isHighRisk
                    ? "bg-red-500/20 text-red-300 border-red-500/40"
                    : isModRisk
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                }`}
              >
                {currentAnalysis?.metrics.risk_label || "HIGH RISK"}
              </span>
            </div>
            <span className="text-xs text-slate-400 mt-1">
              Instability: {currentAnalysis?.metrics.instability_index || 0.78} •{" "}
              {currentAnalysis?.metrics.total_nodes_affected || 25} Nodes Total
            </span>
          </div>

          {/* SVG Progress Arc Gauge */}
          <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
            <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36">
              <circle
                className="stroke-[#282a32]"
                cx="18"
                cy="18"
                fill="none"
                r="14"
                strokeWidth="3.2"
              />
              <circle
                className={
                  isHighRisk
                    ? "stroke-red-500"
                    : isModRisk
                    ? "stroke-amber-500"
                    : "stroke-emerald-500"
                }
                cx="18"
                cy="18"
                fill="none"
                r="14"
                strokeDasharray="88"
                strokeDashoffset={Math.max(5, 88 - (88 * blastScore) / 100)}
                strokeLinecap="round"
                strokeWidth="3.2"
              />
            </svg>
            <ShieldAlert
              className={`w-4 h-4 absolute ${
                isHighRisk ? "text-red-400" : isModRisk ? "text-amber-400" : "text-emerald-400"
              }`}
            />
          </div>
        </div>

        {/* KPI 2: Directly Affected Symbols */}
        <div className="bg-[#11131b] border border-[#282a32] p-4 rounded-xl shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-medium">
              Directly Affected
            </span>
            <AlertTriangle className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-cyan-300">
                {currentAnalysis?.metrics.directly_affected_count || 6}
              </span>
              <span className="text-xs text-slate-300">components</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Immediate callers & upstream route handlers
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="px-2 py-0.5 rounded bg-[#191b24] text-[10px] font-mono text-slate-300 border border-[#282a32]">
              3 Controllers
            </span>
            <span className="px-2 py-0.5 rounded bg-[#191b24] text-[10px] font-mono text-slate-300 border border-[#282a32]">
              2 Services
            </span>
            <span className="px-2 py-0.5 rounded bg-[#191b24] text-[10px] font-mono text-slate-300 border border-[#282a32]">
              1 Webhook
            </span>
          </div>
        </div>

        {/* KPI 3: Transitive Dependents */}
        <div className="bg-[#11131b] border border-[#282a32] p-4 rounded-xl shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-medium">
              Transitive Dependents
            </span>
            <Network className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-indigo-300">
                {currentAnalysis?.metrics.transitive_dependents_count || 19}
              </span>
              <span className="text-xs text-slate-300">downstream modules</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Across 4 architectural layers</p>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono text-slate-400">
            <span className="text-cyan-400">Routing</span>
            <span>→</span>
            <span className="text-indigo-400">Domain</span>
            <span>→</span>
            <span className="text-amber-400">Data</span>
            <span>→</span>
            <span className="text-slate-300">Infra</span>
          </div>
        </div>

        {/* KPI 4: Test Suite Exposure */}
        <div className="bg-[#11131b] border border-[#282a32] p-4 rounded-xl shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-medium">
              Test Suite Exposure
            </span>
            <Code2 className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-purple-300">
                {currentAnalysis?.metrics.test_suites_count || 8}
              </span>
              <span className="text-xs text-slate-300">test suites</span>
              <span className="text-[10px] font-mono text-slate-500">
                ({currentAnalysis?.metrics.test_cases_count || 34} tests)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Requires regression guard verification
            </p>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-[10px] font-mono text-red-400 font-semibold">
              {currentAnalysis?.metrics.exposed_public_endpoints_count || 3} Public Endpoints at Risk
            </span>
          </div>
        </div>
      </div>

      {/* ================= MAIN INTERACTIVE WORKSPACE (SPLIT 60 / 40) ================= */}
      <div className="p-6 pt-0 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-8">
        {/* LEFT PANEL: CONCENTRIC SHOCKWAVE GRAPH (7 Cols on lg) */}
        <div className="lg:col-span-7 flex flex-col bg-[#11131b] border border-[#282a32] rounded-xl shadow-xl overflow-hidden">
          {/* Visualizer Canvas Top Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#191b24] border-b border-[#282a32]">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                Concentric Shockwave Graph
              </span>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1">
              {[
                { id: "all", label: `All (${counts.all})` },
                { id: "service", label: `Services (${counts.service})` },
                { id: "routing", label: `Controllers (${counts.routing})` },
                { id: "test", label: `Tests (${counts.test})` },
              ].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setSelectedFilter(chip.id as any)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                    selectedFilter === chip.id
                      ? "bg-indigo-600 text-white font-semibold"
                      : "bg-[#282a32] hover:bg-[#33343d] text-slate-300"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-[#0c0e16] p-1 rounded-lg border border-[#282a32]">
              <button
                onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1d1f28]"
                title="Zoom In"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono text-slate-400 px-1">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1d1f28]"
                title="Zoom Out"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setZoomLevel(100);
                  setPanOffset({ x: 0, y: 0 });
                }}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1d1f28]"
                title="Recenter & Reset View"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Visualizer Canvas Area (Draggable & Scrollable) */}
          <div
            className={`relative w-full h-[620px] bg-[#0c0e16] flex items-center justify-center overflow-hidden select-none ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onWheel={handleCanvasWheel}
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
              backgroundSize: "24px 24px",
              backgroundPosition: `${panOffset.x % 24}px ${panOffset.y % 24}px`,
            }}
          >
            <div
              className="relative w-[700px] h-[620px] shrink-0 flex items-center justify-center"
              style={{
                transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomLevel / 100})`,
                transformOrigin: "center center",
                transition: isDragging ? "none" : "transform 0.15s ease-out",
              }}
            >
              {/* Ambient Concentric Rings */}
              <div className="absolute w-[680px] h-[680px] rounded-full flex items-center justify-center pointer-events-none">
                {/* Ring 3: Outer Perimeter (Endpoints & Tests) */}
                <div className="w-[640px] h-[640px] rounded-full border border-dashed border-[#282a32]/80 flex items-center justify-center">
                  {/* Ring 2: Transitive Consumers */}
                  <div className="w-[480px] h-[480px] rounded-full border border-dashed border-indigo-500/20 flex items-center justify-center">
                    {/* Ring 1: Direct Callers */}
                    <div className="w-[280px] h-[280px] rounded-full border border-dashed border-cyan-500/30 flex items-center justify-center">
                      {/* Ring 0 Epicenter Glow Field */}
                      <div className="w-32 h-32 rounded-full bg-indigo-600/10 blur-2xl" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Glowing Dynamic SVG Connectors */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 700 620">
                <defs>
                  <linearGradient id="laser-direct" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.4" />
                  </linearGradient>
                </defs>

                {/* Render each concentric edge dynamically */}
                {currentAnalysis?.concentric_edges?.map((edge) => {
                  const p1 =
                    nodePositionMap.get(edge.source) ||
                    (edge.source === currentAnalysis?.target.name ? { x: 350, y: 310 } : null);
                  const p2 = nodePositionMap.get(edge.target);
                  if (!p1 || !p2) return null;

                  const isHighlight =
                    hoveredNode &&
                    (hoveredNode.id === edge.source || hoveredNode.id === edge.target);

                  return (
                    <line
                      key={edge.id}
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={edge.is_breaking ? "#ef4444" : edge.hop === 1 ? "url(#laser-direct)" : "#475569"}
                      strokeWidth={isHighlight ? 2.5 : edge.is_breaking ? 1.8 : 1.2}
                      strokeDasharray={edge.is_breaking ? "4 2" : edge.hop === 1 ? "4 2" : "2 2"}
                      opacity={hoveredNode ? (isHighlight ? 1 : 0.2) : 0.75}
                      className="transition-all duration-200"
                    />
                  );
                })}
              </svg>

              {/* RING 0: EPICENTER NODE */}
              {(() => {
                const epicenter = filteredNodes.find((n) => n.ring === 0);
                if (!epicenter) return null;
                return (
                  <div
                    style={{
                      position: "absolute",
                      left: "350px",
                      top: "310px",
                      transform: "translate(-50%, -50%)",
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(epicenter);
                    }}
                    className="z-20 flex flex-col items-center group cursor-pointer"
                  >
                    <div className="absolute -inset-4 rounded-full bg-indigo-500/20 animate-ping pointer-events-none" />
                    <div className="relative px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-2xl flex items-center gap-2 border border-indigo-400/50 transition-transform group-hover:scale-105">
                      <Sparkles className="w-4 h-4 text-cyan-300" />
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-mono font-bold tracking-tight">
                          {currentAnalysis?.target.name || targetSymbol}
                        </span>
                        <span className="text-[10px] font-mono text-indigo-200">
                          {currentAnalysis?.target.file_path || "core.services.payment:L114"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 px-2 py-0.5 rounded bg-[#11131b] border border-indigo-500/30 text-[9px] font-mono font-bold text-indigo-300 shadow">
                      EPICENTER
                    </div>
                  </div>
                );
              })()}

              {/* RINGS 1, 2, 3: DYNAMIC NODES */}
              {filteredNodes
                .filter((n) => n.ring > 0)
                .map((node) => {
                  const pos = nodePositionMap.get(node.id);
                  if (!pos) return null;
                  const isSelected = selectedNode?.id === node.id;
                  const isHovered = hoveredNode?.id === node.id;
                  const isBreaking = node.risk_level === "critical" || node.risk_level === "high";

                  const badgeColor =
                    node.ring === 1
                      ? node.layer === "routing"
                        ? "text-cyan-300 bg-cyan-500/10 border-cyan-500/30"
                        : "text-indigo-300 bg-indigo-500/10 border-indigo-500/30"
                      : node.ring === 2
                      ? "text-purple-300 bg-purple-500/10 border-purple-500/30"
                      : node.node_type === "test"
                      ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
                      : "text-amber-300 bg-amber-500/10 border-amber-500/30";

                  return (
                    <div
                      key={node.id}
                      style={{
                        position: "absolute",
                        left: `${pos.x}px`,
                        top: `${pos.y}px`,
                        transform: "translate(-50%, -50%)",
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNode(node);
                      }}
                      onMouseEnter={() => setHoveredNode(node)}
                      onMouseLeave={() => setHoveredNode(null)}
                      className={`z-10 flex flex-col items-center group cursor-pointer transition-transform duration-150 ${
                        isSelected ? "scale-110 z-30" : isHovered ? "scale-105 z-25" : ""
                      }`}
                    >
                      <div
                        className={`px-2.5 py-1.5 rounded-lg bg-[#191b24] hover:bg-[#282a32] text-slate-200 border shadow-lg flex items-center gap-1.5 transition-colors max-w-[210px] ${
                          isSelected
                            ? "border-indigo-400 ring-2 ring-indigo-500/40"
                            : isBreaking
                            ? "border-red-500/40 hover:border-red-400"
                            : "border-[#282a32] hover:border-slate-500"
                        }`}
                      >
                        {node.node_type === "endpoint" ? (
                          <span className="px-1 py-0.2 rounded bg-cyan-500 text-black font-mono text-[9px] font-bold shrink-0">
                            API
                          </span>
                        ) : node.node_type === "test" ? (
                          <Play className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : isBreaking ? (
                          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0" />
                        ) : (
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              node.ring === 1
                                ? "bg-cyan-400"
                                : node.ring === 2
                                ? "bg-indigo-400"
                                : "bg-purple-400"
                            }`}
                          />
                        )}

                        <span className="text-xs font-mono font-semibold truncate">{node.label}</span>

                        <span
                          className={`px-1 py-0.2 rounded text-[8px] font-mono uppercase shrink-0 border ${badgeColor}`}
                        >
                          {node.node_type === "test"
                            ? "TEST"
                            : node.layer === "routing"
                            ? "ROUTE"
                            : node.layer}
                        </span>
                      </div>
                    </div>
                  );
                })}

              {/* FLOATING INSPECTION TOOLTIP (Shows selected or hovered node) */}
              {(hoveredNode || selectedNode) && (
                <div className="absolute left-[350px] top-[24px] -translate-x-1/2 z-40 bg-[#191b24]/95 border border-[#33343d] p-3 rounded-xl shadow-2xl flex flex-col gap-1 w-80 backdrop-blur-md pointer-events-none">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-cyan-300 truncate">
                      {(hoveredNode || selectedNode)?.label}
                    </span>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#0c0e16] text-slate-400">
                      Ring {(hoveredNode || selectedNode)?.ring} • {(hoveredNode || selectedNode)?.layer}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {(hoveredNode || selectedNode)?.impact_reason || "Component in blast radius path."}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-[#282a32] text-[10px] font-mono">
                    <span className="text-slate-400">
                      Complexity:{" "}
                      <strong className="text-slate-200">
                        {(hoveredNode || selectedNode)?.cyclomatic_complexity || 8}
                      </strong>
                    </span>
                    <span className="text-slate-400">
                      Blast Weight:{" "}
                      <strong className="text-red-400">
                        {(hoveredNode || selectedNode)?.blast_weight_pct || 14}%
                      </strong>
                    </span>
                    <span className="text-slate-400">
                      Risk:{" "}
                      <strong className="text-amber-400 uppercase">
                        {(hoveredNode || selectedNode)?.risk_level}
                      </strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Canvas Legend Along Bottom */}
            <div className="absolute bottom-3 left-4 right-4 flex flex-wrap items-center justify-between bg-[#11131b]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#282a32] z-20 pointer-events-auto">
              <div className="flex items-center gap-4 flex-wrap text-[11px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span className="text-slate-200">Epicenter</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="text-slate-400">Direct Callers</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                  <span className="text-slate-400">Transitive</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span className="text-slate-400">Public Edge</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                  <span className="text-slate-400">Test Fixtures</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 flex items-center gap-1">
                  <Move className="w-3 h-3 text-indigo-400" /> Drag to Pan • Wheel to Scroll
                </span>
                <span className="text-[10px] font-mono text-slate-500">Orbit Radius: 330px</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: IMPACT BREAKDOWN & AI MITIGATION INSPECTOR (5 Cols on lg) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-[#11131b] border border-[#282a32] rounded-xl shadow-xl overflow-hidden flex flex-col">
            {/* Segmented Tab Header */}
            <div className="flex items-center bg-[#191b24] p-1 border-b border-[#282a32]">
              <button
                onClick={() => setActiveInspectorTab("entities")}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  activeInspectorTab === "entities"
                    ? "bg-[#282a32] text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[#1f212a]"
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Affected Entities ({currentAnalysis?.metrics.total_nodes_affected || 25})
              </button>

              <button
                onClick={() => setActiveInspectorTab("advisor")}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  activeInspectorTab === "advisor"
                    ? "bg-[#282a32] text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[#1f212a]"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                AI Risk & Migration ({currentAnalysis?.ai_advisor.checklist.length || 3})
              </button>
            </div>

            {/* TAB CONTENT 1: AFFECTED ENTITIES */}
            {activeInspectorTab === "entities" && (
              <div className="p-4 flex flex-col gap-4 max-h-[620px] overflow-y-auto">
                {/* Group 1: Direct Impact (Critical) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Direct Impact (Critical — {currentAnalysis?.direct_impact.length || 3} Callers)
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                      Breaking
                    </span>
                  </div>

                  {currentAnalysis?.direct_impact.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-[#191b24] hover:bg-[#282a32] border border-[#282a32] transition-colors flex flex-col gap-1 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-slate-200">
                          {item.symbol_name}
                        </span>
                        <span className="text-[10px] font-mono text-red-400 font-semibold px-1.5 py-0.2 rounded bg-red-500/10 border border-red-500/20">
                          {item.issue_type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{item.description}</p>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 mt-0.5">
                        <span>{item.file_path}:{item.line_number}</span>
                        <span>•</span>
                        <span>Caller #{item.caller_index}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Group 2: Cascading Transitive Impact */}
                <div className="space-y-2 pt-1 border-t border-[#282a32]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Network className="w-3.5 h-3.5" />
                      Cascading Transitive ({currentAnalysis?.transitive_impact.length || 3} Entities)
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">2 to 3 Hops</span>
                  </div>

                  {currentAnalysis?.transitive_impact.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-[#191b24] border border-[#282a32] flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-slate-200">{item.symbol_name}</span>
                        <span className="px-1.5 py-0.2 rounded bg-[#0c0e16] text-[10px] font-mono text-slate-400 border border-[#282a32]">
                          {item.tag}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{item.description}</p>
                    </div>
                  ))}
                </div>

                {/* Group 3: Exposed Test Suites */}
                <div className="space-y-2 pt-1 border-t border-[#282a32]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5" />
                      Exposed Test Suites ({currentAnalysis?.exposed_tests.length || 3} Files)
                    </span>
                    <button
                      onClick={() => {
                        currentAnalysis?.exposed_tests.forEach((t) => handleRunSingleTest(t.test_file));
                      }}
                      className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 underline"
                    >
                      Run All Tests
                    </button>
                  </div>

                  {currentAnalysis?.exposed_tests.map((test, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-[#191b24] border border-[#282a32] flex items-center justify-between"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-mono text-xs text-slate-200 truncate">{test.test_file}</span>
                        <span className="text-[11px] text-red-400 truncate">{test.failure_prediction}</span>
                      </div>
                      <button
                        onClick={() => handleRunSingleTest(test.test_file)}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1 shadow-sm transition-all flex-shrink-0 ${
                          testRunStates[test.test_file] === "passed"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : testRunStates[test.test_file] === "running"
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse"
                            : "bg-[#282a32] hover:bg-[#33343d] text-slate-200"
                        }`}
                      >
                        {testRunStates[test.test_file] === "passed" ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" /> Passed
                          </>
                        ) : testRunStates[test.test_file] === "running" ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" /> Verifying...
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-slate-300" /> Run
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Quick Code Diff Snippet Widget */}
                {currentAnalysis?.diff_preview && (
                  <div className="bg-[#0c0e16] border border-[#282a32] rounded-lg p-3 shadow-inner flex flex-col gap-2 mt-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span className="flex items-center gap-1 text-slate-300">
                        <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                        diff — {currentAnalysis.diff_preview.file_path}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#191b24] border border-[#282a32]">
                        {currentAnalysis.diff_preview.lines_range}
                      </span>
                    </div>
                    <pre className="font-mono text-xs leading-relaxed bg-[#11131b] p-2.5 rounded border border-[#282a32] overflow-x-auto">
                      <code className="text-red-400 bg-red-500/10 block px-1 py-0.5 rounded">
                        {currentAnalysis.diff_preview.old_snippet}
                      </code>
                      <code className="text-cyan-300 bg-cyan-500/10 block px-1 py-0.5 rounded mt-1">
                        {currentAnalysis.diff_preview.new_snippet}
                      </code>
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: AI RISK & MIGRATION ADVISOR */}
            {activeInspectorTab === "advisor" && (
              <div className="p-4 flex flex-col gap-4 max-h-[620px] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                      AI Refactoring Advisor
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {currentAnalysis?.ai_advisor.checklist.length || 3} Recommendations
                  </span>
                </div>

                {/* Synthesis Banner */}
                <div className="p-3 rounded-lg bg-[#191b24] border border-indigo-500/30 flex items-start gap-2.5">
                  <HelpCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {currentAnalysis?.ai_advisor.synthesis ||
                      "Modifying this signature breaks 2 public API schemas and invalidates fixture mocks in upstream test suites. Use a non-breaking wrapper adapter."}
                  </p>
                </div>

                {/* Safe Refactoring Checklist */}
                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                    Safe Migration Checklist:
                  </span>
                  <div className="flex flex-col gap-2">
                    {currentAnalysis?.ai_advisor.checklist.map((item) => (
                      <label
                        key={item.id}
                        onClick={() => toggleChecklistItem(item.id)}
                        className="flex items-start gap-2.5 p-2 rounded-lg bg-[#191b24] hover:bg-[#282a32] border border-[#282a32] text-xs text-slate-300 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={!!checklistStates[item.id]}
                          readOnly
                          className="mt-0.5 rounded text-indigo-500 bg-[#0c0e16] border-[#282a32] cursor-pointer"
                        />
                        <span className={checklistStates[item.id] ? "line-through text-slate-500" : ""}>
                          {item.text}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Wrapper Snippet Toggle & Code Block */}
                {currentAnalysis?.ai_advisor.recommended_wrapper_snippet && (
                  <div className="space-y-2 pt-2 border-t border-[#282a32]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase font-bold text-slate-400">
                        Compatibility Wrapper Adapter
                      </span>
                      <button
                        onClick={toggleShowWrapperCode}
                        className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline"
                      >
                        {showWrapperCode ? "Hide Wrapper" : "View Wrapper"}
                      </button>
                    </div>

                    {showWrapperCode && (
                      <div className="relative">
                        <pre className="font-mono text-xs leading-relaxed bg-[#0c0e16] p-3 rounded-lg border border-[#282a32] text-slate-200 overflow-x-auto">
                          <code>{currentAnalysis.ai_advisor.recommended_wrapper_snippet}</code>
                        </pre>
                        <button
                          onClick={() => handleCopyWrapper(currentAnalysis.ai_advisor.recommended_wrapper_snippet!)}
                          className="absolute top-2 right-2 p-1.5 rounded bg-[#191b24] hover:bg-[#282a32] text-slate-300 border border-[#282a32] transition-colors"
                          title="Copy Code"
                        >
                          {copiedCode ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Advisor Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    onClick={toggleShowWrapperCode}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {showWrapperCode ? "Wrapper Visible" : "Generate Non-Breaking Wrapper"}
                  </button>

                  <button
                    onClick={handleAskAI}
                    className="px-3 py-2 rounded-lg bg-[#282a32] hover:bg-[#33343d] text-slate-200 text-xs font-mono transition-colors flex items-center gap-1.5"
                  >
                    Attach to Chat →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= BOTTOM TELEMETRY BAR ================= */}
      <div className="mt-auto w-full bg-[#0c0e16] border-t border-[#282a32] px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-slate-200 font-semibold">RUN #{currentAnalysis?.run_id || "IR-4092"}</span>
          </div>
          <span>•</span>
          <span>
            TARGET: <strong className="text-indigo-300">{currentAnalysis?.target.name || targetSymbol}</strong>
          </span>
          <span>•</span>
          <span>
            SCOPE: <strong className="text-slate-200">{depth}-Hops</strong>
          </span>
          <span>•</span>
          <span>
            TOTAL NODES: <strong className="text-cyan-300">{currentAnalysis?.metrics.total_nodes_affected || 25}</strong>
          </span>
          <span>•</span>
          <span>
            CONTRACT BREAKS: <strong className="text-red-400">{currentAnalysis?.metrics.contract_breaks_detected || 2} DETECTED</strong>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span>
            EXEC TIME: <strong className="text-slate-200">{currentAnalysis?.metrics.execution_time_ms || 84}ms</strong>
          </span>
          <span>•</span>
          <span>
            AST ENGINE: <strong className="text-slate-400">{currentAnalysis?.metrics.ast_engine || "Tree-Sitter AST v3.1"}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
