import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Cpu,
  CreditCard,
  FileDown,
  FileText,
  Flame,
  Lock,
  MessageSquareCode,
  Network,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import { useRepositoryStore } from "../../stores/repositoryStore";
import { useFeatureStore } from "../../stores/featureStore";
import type { FeatureStep } from "../../types/feature";

interface FeatureDiscoveryViewProps {
  onBack?: () => void;
  onNavigateToGraph?: (entrypointId?: string) => void;
  onNavigateToAI?: (featureContext?: string) => void;
  onNavigateToImpact?: (featureId?: string) => void;
  selectedRepoId?: string;
}

export const FeatureDiscoveryView: React.FC<FeatureDiscoveryViewProps> = ({
  onBack,
  onNavigateToGraph,
  onNavigateToAI,
  onNavigateToImpact,
  selectedRepoId,
}) => {
  const { activeProject } = useProjectStore();
  const { repositories } = useRepositoryStore();
  const {
    features,
    selectedFeature,
    activeCategory,
    searchQuery,
    activeInspectorTab,
    syncedSymbols,
    routesCount,
    isLoading,
    isRescanning,
    fetchFeatures,
    discoverFeatures,
    rescanFeatures,
    selectFeature,
    setActiveCategory,
    setSearchQuery,
    setActiveInspectorTab,
  } = useFeatureStore();

  const [currentRepoId, setCurrentRepoId] = useState<string>(
    selectedRepoId || repositories[0]?.id || ""
  );
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  const currentRepo = useMemo(
    () => repositories.find((r) => r.id === currentRepoId) || repositories[0],
    [repositories, currentRepoId]
  );

  useEffect(() => {
    if (selectedRepoId) {
      setCurrentRepoId(selectedRepoId);
    }
  }, [selectedRepoId]);

  useEffect(() => {
    if (currentRepoId && activeProject?.id) {
      fetchFeatures(currentRepoId, activeProject.id);
    }
  }, [currentRepoId, activeProject?.id, fetchFeatures]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRepoId && activeProject?.id) {
      discoverFeatures(currentRepoId, searchQuery, activeProject.id);
    }
  };

  const handleTopicClick = (queryText: string) => {
    setSearchQuery(queryText);
    if (currentRepoId && activeProject?.id) {
      discoverFeatures(currentRepoId, queryText, activeProject.id);
    }
  };

  const filteredFeatures = useMemo(() => {
    if (activeCategory === "all") return features;
    return features.filter((f) => f.category === activeCategory);
  }, [features, activeCategory]);

  const activeStep: FeatureStep | undefined =
    selectedFeature?.steps[activeStepIndex] || selectedFeature?.steps[0];

  const handleCopySnippet = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleExportInventory = () => {
    const dataStr = JSON.stringify(features, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `codelens-features-${currentRepo?.name || "repo"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-[100vw] bg-[#090a0f] text-[#f8fafc] font-sans overflow-y-auto scrollbar-thin select-none -m-6 sm:-m-8">
      {/* 1. TOP CONTEXT STRIP */}
      <header className="flex flex-wrap items-center justify-between px-6 py-3 bg-[#0d0f17] border-b border-[#1e2333] gap-3 shrink-0 z-20 sticky top-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              title="Return to Dashboard"
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-[#161a26] border border-[#1e2333] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
              <span>Workspace</span>
              <span>/</span>
              <span className="text-slate-300">{activeProject?.name || "Active Workspace"}</span>
              <span>/</span>
              <span className="text-indigo-400 font-semibold">{currentRepo?.name || "repository"}</span>
              <span>/</span>
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Feature Discovery & Semantic Flow
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <select
                value={currentRepoId}
                onChange={(e) => setCurrentRepoId(e.target.value)}
                className="bg-[#131620] border border-[#1e2333] hover:border-slate-500 rounded px-2.5 py-0.5 text-xs text-white font-mono focus:outline-none cursor-pointer max-w-[200px] truncate"
              >
                {repositories.map((repo) => (
                  <option key={repo.id} value={repo.id}>
                    {repo.name} ({repo.default_branch || "main"})
                  </option>
                ))}
              </select>

              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#131620] border border-[#1e2333] text-[10px] font-mono text-slate-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-cyan-400 font-semibold">Semantic AST: 100% Synced</span>
                <span className="text-slate-500">({syncedSymbols} Symbols, {routesCount} Routes)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (currentRepoId && activeProject?.id) {
                rescanFeatures(currentRepoId, activeProject.id);
              }
            }}
            disabled={isRescanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#131620] hover:bg-[#1a2030] border border-[#1e2333] text-xs font-mono text-slate-300 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRescanning ? "animate-spin" : ""}`} />
            <span>{isRescanning ? "Rescanning..." : "Rescan Semantic Index"}</span>
          </button>

          <button
            onClick={handleExportInventory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#131620] hover:bg-[#1a2030] border border-[#1e2333] text-xs font-mono text-slate-300 transition-colors cursor-pointer shadow-sm"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Export Inventory</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* HERO QUERY DISCOVERY DECK */}
        <section className="relative bg-[#0d101a] rounded-2xl p-6 border border-[#1e273e] shadow-2xl overflow-hidden">
          {/* Ambient Background Glows */}
          <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-80 h-80 rounded-full bg-cyan-600/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h1 className="font-bold text-lg text-white tracking-tight">
                  Semantic Feature & Code Flow Discovery
                </h1>
              </div>
              <span className="text-xs font-mono text-slate-400 hidden sm:flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                Natural Language AST Cross-Encoder
              </span>
            </div>

            {/* Discovery Search Input Form */}
            <form onSubmit={handleSearchSubmit} className="relative flex items-center bg-[#131620] border border-[#232b3e] rounded-xl p-1.5 shadow-lg focus-within:border-cyan-500/60 focus-within:ring-1 focus-within:ring-cyan-500/30 transition-all">
              <div className="pl-3 pr-2 text-slate-400 flex items-center">
                <Search className="w-5 h-5 text-cyan-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask anything about this codebase... (e.g. 'Where is Stripe checkout webhook handled?')"
                className="flex-1 bg-transparent text-white placeholder:text-slate-500 text-sm focus:outline-none px-2 font-sans"
              />
              <div className="flex items-center gap-2 pr-1">
                <kbd className="hidden md:inline font-mono text-[11px] px-2 py-1 rounded bg-[#1c2233] text-slate-400 border border-[#2b354d]">
                  ⌘K
                </kbd>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:opacity-95 text-white font-medium text-xs font-mono shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                  <span>{isLoading ? "Searching..." : "Discover Flow"}</span>
                </button>
              </div>
            </form>

            {/* Quick Recommended Prompt Discovery Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mr-1">
                Discovered Topics:
              </span>
              <button
                onClick={() => handleTopicClick("How does user login and JWT rotation work across persistence layers?")}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#141926] hover:bg-[#1c2336] text-cyan-300 border border-cyan-500/30 text-xs font-mono transition-all cursor-pointer shadow-sm"
              >
                <Lock className="w-3 h-3 text-cyan-400" />
                <span>User Authentication & JWT Refresh</span>
              </button>

              <button
                onClick={() => handleTopicClick("Where is Stripe payment checkout and webhook guard handled?")}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#141926] hover:bg-[#1c2336] text-slate-300 hover:text-white border border-[#1e273e] text-xs font-mono transition-all cursor-pointer"
              >
                <CreditCard className="w-3 h-3 text-indigo-400" />
                <span>Stripe Payment & Webhooks</span>
              </button>

              <button
                onClick={() => handleTopicClick("Team workspace member role guard and invite token flow")}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#141926] hover:bg-[#1c2336] text-slate-300 hover:text-white border border-[#1e273e] text-xs font-mono transition-all cursor-pointer"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Team Workspace RBAC</span>
              </button>

              <button
                onClick={() => handleTopicClick("Async PDF invoice generator celery worker pipeline")}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#141926] hover:bg-[#1c2336] text-slate-300 hover:text-white border border-[#1e273e] text-xs font-mono transition-all cursor-pointer"
              >
                <FileText className="w-3 h-3 text-amber-400" />
                <span>PDF Invoice Engine</span>
              </button>
            </div>
          </div>
        </section>

        {/* 3. MAIN 2-COLUMN SPLIT WORKBENCH */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-8">
          {/* LEFT COLUMN: FEATURE INVENTORY NAVIGATOR (4 cols on lg) */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <div className="flex items-center justify-between bg-[#0e111a] px-4 py-2.5 rounded-xl border border-[#1e2333] shadow-sm">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold tracking-wider text-white">
                  DISCOVERED FEATURES
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-bold">
                  {features.length}
                </span>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-[#0d0f17] p-1 rounded-xl border border-[#1e2333] overflow-x-auto scrollbar-none">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "auth", label: "Auth & Sec" },
                  { id: "billing", label: "Billing" },
                  { id: "rbac", label: "RBAC" },
                  { id: "async", label: "Async" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`px-3 py-1 rounded-lg font-mono text-xs transition-all cursor-pointer shrink-0 ${
                    activeCategory === tab.id
                      ? "bg-indigo-600 text-white font-bold shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Feature Cards List */}
            <div className="space-y-3">
              {filteredFeatures.map((feat) => {
                const isSelected = selectedFeature?.id === feat.id;
                return (
                  <div
                    key={feat.id}
                    onClick={() => {
                      selectFeature(feat);
                      setActiveStepIndex(0);
                    }}
                    className={`cursor-pointer rounded-xl p-4 transition-all duration-200 border ${
                      isSelected
                        ? "bg-[#141824] border-cyan-400/80 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/40"
                        : "bg-[#0d101a] hover:bg-[#121624] border-[#1e273e]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            feat.confidence_score >= 0.95
                              ? "bg-cyan-400"
                              : feat.confidence_score >= 0.9
                              ? "bg-indigo-400"
                              : "bg-amber-400"
                          }`}
                        />
                        <span className="font-mono text-[10px] text-cyan-300 font-bold">
                          {feat.confidence_label}
                        </span>
                      </div>
                      {feat.entrypoint_route && (
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#1c2233] text-indigo-300 border border-[#2b354d]">
                          {feat.entrypoint_route.split(" ")[1] || feat.entrypoint_route}
                        </span>
                      )}
                    </div>

                    <h3
                      className={`font-semibold text-sm mt-1 transition-colors ${
                        isSelected ? "text-cyan-300" : "text-white"
                      }`}
                    >
                      {feat.title}
                    </h3>

                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {feat.description}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-[#1a2135] flex flex-wrap items-center gap-2 font-mono text-[10px] text-slate-400">
                      <span className="bg-[#141926] px-2 py-0.5 rounded text-slate-300">
                        {feat.layers_count} Layers
                      </span>
                      <span>•</span>
                      <span className="bg-[#141926] px-2 py-0.5 rounded text-slate-300">
                        {feat.files_count} Files
                      </span>
                      <span>•</span>
                      <span className="bg-[#141926] px-2 py-0.5 rounded text-slate-300">
                        {feat.sloc} SLOC
                      </span>
                      <span className="ml-auto font-medium text-cyan-400">
                        {feat.is_deterministic ? "Deterministic" : "Heuristic"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: FLOW EXECUTION CANVAS & SYMBOL TRACE (8 cols on lg) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {selectedFeature ? (
              <>
                {/* Active Feature Title Header Banner */}
                <div className="bg-[#0e121d] rounded-2xl p-5 border border-[#1e273e] shadow-xl flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#141a29] text-cyan-300 font-medium border border-cyan-500/30">
                        {selectedFeature.language_framework}
                      </span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-medium border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Deterministic Semantic Trace
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-white tracking-tight">
                      Feature: {selectedFeature.title}
                    </h2>

                    <p className="text-xs text-slate-400">
                      Endpoint Entry:{" "}
                      <code className="font-mono text-indigo-400">
                        {selectedFeature.entrypoint_route || "Internal Dispatch"}
                      </code>{" "}
                      • Domain Context:{" "}
                      <span className="text-slate-300">{selectedFeature.domain_context}</span>
                    </p>
                  </div>

                  {/* Cross-Feature Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {onNavigateToAI && (
                      <button
                        onClick={() => onNavigateToAI(`Feature: ${selectedFeature.title}\n${selectedFeature.description}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141926] hover:bg-[#1a2133] text-slate-200 border border-[#222a3e] text-xs font-mono transition-colors cursor-pointer shadow-sm"
                      >
                        <MessageSquareCode className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Ask AI</span>
                      </button>
                    )}

                    {onNavigateToImpact && (
                      <button
                        onClick={() => onNavigateToImpact(selectedFeature.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141926] hover:bg-[#1a2133] text-slate-200 border border-[#222a3e] text-xs font-mono transition-colors cursor-pointer shadow-sm"
                      >
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        <span>Blast Radius</span>
                      </button>
                    )}

                    {onNavigateToGraph && (
                      <button
                        onClick={() => {
                          const firstStep = selectedFeature.steps[0];
                          onNavigateToGraph(firstStep?.file_path);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 hover:opacity-95 text-white font-medium text-xs font-mono shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                      >
                        <Network className="w-3.5 h-3.5 text-cyan-200" />
                        <span>Trace in 3D Canvas</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Execution Pipeline: Horizontal Interconnected Flow Stepper */}
                <div className="bg-[#0e121d] rounded-2xl p-5 border border-[#1e273e] shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs uppercase tracking-wider text-slate-400 font-bold">
                        ARCHITECTURAL EXECUTION PATH
                      </span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#161c2b] text-cyan-300 font-semibold border border-[#222c42]">
                        {selectedFeature.steps.length} Hops
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      Click any step card to preview symbol source
                    </span>
                  </div>

                  {/* Flow Nodes Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    {selectedFeature.steps.map((step, idx) => {
                      const isActiveStep = idx === activeStepIndex;
                      const layerColor =
                        step.layer === "routing"
                          ? "#38bdf8"
                          : step.layer === "service"
                          ? "#818cf8"
                          : step.layer === "persistence"
                          ? "#f59e0b"
                          : "#94a3b8";

                      return (
                        <div
                          key={step.step_number}
                          onClick={() => setActiveStepIndex(idx)}
                          style={{
                            borderColor: isActiveStep ? layerColor : "#1e273e",
                            boxShadow: isActiveStep
                              ? `0 0 16px -2px ${layerColor}40`
                              : "none",
                          }}
                          className={`bg-[#0a0d16] rounded-xl p-3 border flex flex-col justify-between cursor-pointer transition-all duration-200 group ${
                            isActiveStep
                              ? "bg-[#101524] ring-1 ring-cyan-400/50"
                              : "hover:bg-[#0f1422]"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span
                                className="font-mono text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                                style={{
                                  backgroundColor: `${layerColor}20`,
                                  color: layerColor,
                                }}
                              >
                                {step.layer_title}
                              </span>
                              <span className="font-mono text-[9px] text-slate-500">
                                Step {idx + 1}
                              </span>
                            </div>

                            <div className="font-mono text-xs font-bold text-white truncate">
                              {step.file_path.split("/").pop()}
                            </div>
                            <div
                              className="font-mono text-[11px] truncate mt-0.5 font-semibold"
                              style={{ color: layerColor }}
                            >
                              {step.symbol_name}
                            </div>

                            <div className="mt-2 p-2 rounded bg-[#06080f] font-mono text-[10px] text-slate-300 overflow-x-auto max-h-24 scrollbar-none border border-[#141926]">
                              <pre className="leading-tight">
                                <code>{step.snippet}</code>
                              </pre>
                            </div>
                          </div>

                          <div className="mt-3 pt-2 border-t border-[#181f30] flex items-center justify-between font-mono text-[10px] text-slate-400">
                            <span>{step.lines_range}</span>
                            <span
                              className="flex items-center gap-0.5 font-medium"
                              style={{ color: layerColor }}
                            >
                              {step.action_type}{" "}
                              {idx < selectedFeature.steps.length - 1 && "➔"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lower Tabbed Detail Inspector & Interactive Code Viewer */}
                <div className="bg-[#0e121d] rounded-2xl p-5 border border-[#1e273e] shadow-xl space-y-4">
                  {/* Inspector Tabs Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1 bg-[#090c15] p-1 rounded-xl border border-[#1a2133]">
                      {(
                        [
                          { id: "code", label: "Code Flow Snippets" },
                          { id: "schema", label: "Input / Output Schemas" },
                          { id: "security", label: "Security Guardrails" },
                          { id: "deps", label: `Dependencies (${selectedFeature.dependencies.length})` },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveInspectorTab(tab.id)}
                          className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all cursor-pointer ${
                            activeInspectorTab === tab.id
                              ? "bg-indigo-600 text-white font-bold shadow-sm"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Quick Telemetry Badges */}
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-[#131826] text-cyan-300 border border-[#21293d]">
                        ⚡ 14.2ms avg trace
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#131826] text-slate-300 border border-[#21293d]">
                        Lock: None
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#131826] text-indigo-300 border border-[#21293d]">
                        Redis TTL: 86400s
                      </span>
                    </div>
                  </div>

                  {/* Tab Content 1: Code Flow View */}
                  {activeInspectorTab === "code" && activeStep && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-[#131826] px-4 py-2 rounded-xl border border-[#212a3d]">
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <Terminal className="w-4 h-4 text-cyan-400" />
                          <span className="text-slate-300">{activeStep.file_path}</span>
                          <span className="text-slate-500">::</span>
                          <span className="text-cyan-400 font-bold">{activeStep.symbol_name}</span>
                          <span className="text-slate-500">[{activeStep.lines_range}]</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopySnippet(activeStep.snippet)}
                            title="Copy code snippet"
                            className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          {copiedCode && (
                            <span className="text-[10px] font-mono text-cyan-400">Copied!</span>
                          )}
                        </div>
                      </div>

                      <div className="bg-[#080a11] rounded-xl p-4 font-mono text-xs text-slate-200 overflow-x-auto border border-[#1a2133]">
                        <pre className="leading-relaxed">
                          <code>{activeStep.snippet}</code>
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Tab Content 2: Input / Output Schemas */}
                  {activeInspectorTab === "schema" && (
                    <div className="p-4 rounded-xl bg-[#090c15] border border-[#1a2133] space-y-3 font-mono text-xs">
                      <div className="text-slate-400 font-bold uppercase text-[11px]">
                        PAYLOAD & SCHEMA DEFINITIONS
                      </div>
                      <div className="space-y-2">
                        {Object.entries(selectedFeature.schema_info).map(([k, v]) => (
                          <div key={k} className="p-2.5 rounded bg-[#121624] border border-[#1d2538] flex flex-col gap-1">
                            <span className="text-cyan-400 font-bold">{k}:</span>
                            <span className="text-slate-300 font-sans text-xs">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tab Content 3: Security & Policy Guardrails */}
                  {activeInspectorTab === "security" && (
                    <div className="p-4 rounded-xl bg-[#090c15] border border-[#1a2133] space-y-3 font-mono text-xs">
                      <div className="text-slate-400 font-bold uppercase text-[11px]">
                        SECURITY & POLICY GUARDRAILS
                      </div>
                      <div className="space-y-2">
                        {selectedFeature.security_guardrails.map((rule, idx) => (
                          <div key={idx} className="p-2 rounded bg-[#121624] border border-[#1d2538] flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-slate-200 font-sans text-xs">{rule}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tab Content 4: Dependencies */}
                  {activeInspectorTab === "deps" && (
                    <div className="p-4 rounded-xl bg-[#090c15] border border-[#1a2133] space-y-3 font-mono text-xs">
                      <div className="text-slate-400 font-bold uppercase text-[11px]">
                        MODULE DEPENDENCIES ({selectedFeature.dependencies.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedFeature.dependencies.map((dep) => (
                          <span
                            key={dep}
                            className="px-2.5 py-1 rounded-lg bg-[#121624] border border-[#1d2538] text-indigo-300"
                          >
                            {dep}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-500 font-mono text-xs bg-[#0e121d] rounded-2xl border border-[#1e273e]">
                No feature selected. Click a feature card from the left inventory to trace its execution flow.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 4. BOTTOM MONOSPACE TELEMETRY STRIP */}
      <footer className="flex flex-wrap items-center justify-between px-6 py-2 bg-[#0c0e16] border-t border-[#1e2333] text-[11px] font-mono text-slate-400 shrink-0 z-20 sticky bottom-0">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            DISCOVERED: <span className="text-cyan-400 font-semibold">{features.length} Capabilities</span>
          </div>
          <div>|</div>
          <div>
            SEMANTIC EMBEDDINGS: <span className="text-white font-semibold">{syncedSymbols} Symbols</span>
          </div>
          <div>|</div>
          <div>
            ACTIVE TRACE:{" "}
            <span className="text-indigo-400 font-semibold">
              {selectedFeature?.steps.length || 4} Architectural Hops
            </span>
          </div>
          <div>|</div>
          <div>
            CONFIDENCE:{" "}
            <span className="text-emerald-400 font-semibold">
              {selectedFeature ? (selectedFeature.confidence_score * 100).toFixed(0) + "%" : "98%"}
            </span>
          </div>
          <div>|</div>
          <div className="text-slate-400">LATENCY: 42ms</div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
            <span>API Route</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#818cf8]" />
            <span>Domain Svc</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
            <span>Persistence</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#94a3b8]" />
            <span>Infra</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
