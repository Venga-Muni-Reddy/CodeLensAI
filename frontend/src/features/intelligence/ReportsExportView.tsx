import React, { useEffect, useState, useMemo } from "react";
import {
  ArrowLeft,
  Share2,
  Copy,
  Check,
  FileDown,
  Download,
  FileText,
  Shield,
  Layers,
  ShieldAlert,
  Sparkles,
  GitBranch,
  FolderGit2,
  ChevronDown,
  RefreshCw,
  Eye,
  Columns,
  Square,
  FileCode,
  CheckCircle2,
  Sliders,
  Maximize2,
  AlertCircle,
  MessageSquareCode,
} from "lucide-react";
import { useReportStore } from "../../stores/reportStore";
import { useProjectStore } from "../../stores/projectStore";
import { useRepositoryStore } from "../../stores/repositoryStore";
import type { WatermarkClassification } from "../../types/report";

interface ReportsExportViewProps {
  onBack?: () => void;
  onNavigateToAI?: (prompt?: string) => void;
}

export const ReportsExportView: React.FC<ReportsExportViewProps> = ({
  onBack,
  onNavigateToAI,
}) => {
  const { projects, activeProject, setActiveProject, fetchProjects } = useProjectStore();
  const { repositories, activeRepository, setActiveRepository, fetchRepositories } = useRepositoryStore();

  const {
    reportData,
    activePreset,
    classification,
    sectionsConfig,
    exportFormat,
    isCompiling,
    error,
    zoomLevel,
    pageViewMode,
    setActivePreset,
    setClassification,
    toggleSection,
    setExportFormat,
    setZoomLevel,
    setPageViewMode,
    fetchReport,
    recompileReport,
    downloadMarkdown,
    downloadJson,
  } = useReportStore();

  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false);
  const [copiedSha, setCopiedSha] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);

  // Initialize projects and repos
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (activeProject) {
      fetchRepositories(activeProject.id);
    }
  }, [activeProject, fetchRepositories]);

  // Fetch report when active project or repo changes
  useEffect(() => {
    const pId = activeProject?.id || "default-project";
    const rId = activeRepository?.id || "default-repo";
    fetchReport(pId, rId);
  }, [activeProject, activeRepository, fetchReport]);

  // Keyboard shortcut: Cmd+E / Ctrl+E to download / print PDF
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        handleDownloadPdf();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const activeSectionsCount = useMemo(() => {
    return Object.values(sectionsConfig).filter(Boolean).length;
  }, [sectionsConfig]);

  const handleCopyMarkdown = async () => {
    const pId = activeProject?.id || "default-project";
    const rId = activeRepository?.id || "default-repo";
    try {
      await downloadMarkdown(pId, rId);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2000);
    } catch {
      // fallback copy title
      navigator.clipboard.writeText(`# CodeLens Intelligence Dossier\nRepository: ${reportData?.repository_name || "core"}`);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2000);
    }
  };

  const handleShareDossier = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setShareFeedback(true);
    setTimeout(() => setShareFeedback(false), 2000);
  };

  const handleCopySha = (sha: string) => {
    navigator.clipboard.writeText(sha);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  const handleExportAction = () => {
    const pId = activeProject?.id || "default-project";
    const rId = activeRepository?.id || "default-repo";
    if (exportFormat === "markdown") {
      downloadMarkdown(pId, rId);
    } else if (exportFormat === "docx") {
      // DOCX exports as markdown-based spec
      downloadMarkdown(pId, rId);
    } else {
      window.print();
    }
  };

  const metrics = reportData?.metrics;
  const tiers = reportData?.tiers || [];
  const flow = reportData?.critical_flow || [];
  const findings = reportData?.findings || [];

  return (
    <div className="flex flex-col h-full bg-[#0a0c14] text-[#e2e8f0] overflow-y-auto font-sans selection:bg-indigo-500/30 select-none pb-12">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-dossier, #printable-dossier * {
            visibility: visible !important;
          }
          #printable-dossier {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      {/* 1. TOP SCOPE BAR & BREADCRUMBS */}
      <section className="flex-shrink-0 bg-[#0e111a] border-b border-[#1b1f2e] px-6 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 z-20">
        <div className="flex flex-col gap-1 min-w-0">
          {/* Breadcrumbs Hierarchy */}
          <div className="flex items-center space-x-2 text-xs text-slate-400 flex-wrap">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1 rounded-lg bg-[#141824] hover:bg-[#1c2234] border border-[#22283a] text-slate-400 hover:text-white transition-colors mr-1"
                title="Return to Dashboard"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}

            <span className="font-semibold text-slate-300">CodeLens AI</span>
            <span>/</span>
            <button onClick={onBack} className="hover:text-slate-200 transition-colors">
              Repositories
            </button>
            <span>/</span>

            {/* Interactive Project Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsProjectDropdownOpen(!isProjectDropdownOpen);
                  setIsRepoDropdownOpen(false);
                }}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#141824] hover:bg-[#1a2030] border border-[#22283a] text-slate-200 text-xs font-medium transition-all"
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
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#141824] hover:bg-[#1a2030] border border-[#22283a] text-cyan-300 text-xs font-medium transition-all"
              >
                <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
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
                            activeRepository?.id === r.id ? "text-cyan-400 font-semibold bg-[#161a28]" : "text-slate-300"
                          }`}
                        >
                          <span className="truncate">{r.name}</span>
                          {activeRepository?.id === r.id && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <span>/</span>
            <span className="text-white font-semibold">Intelligence Reports Export</span>
          </div>

          {/* Engine Telemetry Indicator */}
          <div className="flex items-center space-x-2 pt-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Engine: <strong className="text-cyan-300">AST Multi-Domain Synthesizer v2.4</strong> • ISO/IEC 25010 Benchmark
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5 flex-wrap">
          <button
            onClick={handleShareDossier}
            className="h-8 px-3 inline-flex items-center space-x-1.5 rounded-lg bg-[#141824] hover:bg-[#1c2234] border border-[#22283a] text-slate-300 hover:text-white text-xs font-medium transition-all relative"
            title="Copy shareable link"
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Share Live Dossier</span>
            {shareFeedback && (
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-mono shadow-md animate-fade-in whitespace-nowrap">
                Link Copied!
              </span>
            )}
          </button>

          <button
            onClick={handleCopyMarkdown}
            className="h-8 px-3 inline-flex items-center space-x-1.5 rounded-lg bg-[#141824] hover:bg-[#1c2234] border border-[#22283a] text-slate-300 hover:text-white text-xs font-medium transition-all relative"
            title="Download or copy markdown representation"
          >
            <Copy className="w-3.5 h-3.5 text-cyan-400" />
            <span>Copy Markdown</span>
            {copiedFeedback && (
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-mono shadow-md animate-fade-in whitespace-nowrap">
                Markdown Ready!
              </span>
            )}
          </button>

          <button
            onClick={() => {
              const pId = activeProject?.id || "default-project";
              const rId = activeRepository?.id || "default-repo";
              downloadJson(pId, rId);
            }}
            className="h-8 px-3 inline-flex items-center space-x-1.5 rounded-lg bg-[#141824] hover:bg-[#1c2234] border border-[#22283a] text-slate-300 hover:text-white text-xs font-medium transition-all"
            title="Export full machine-readable JSON dossier"
          >
            <FileCode className="w-3.5 h-3.5 text-amber-400" />
            <span>Export Raw JSON</span>
          </button>

          {onNavigateToAI && (
            <button
              onClick={() => {
                const prompt = `I am reviewing the CodeLens AI Intelligence Dossier for repository "${reportData?.repository_name || "core"}".
Architecture Health: ${reportData?.metrics?.health_score ?? 94}/100 (${reportData?.metrics?.health_label ?? "Optimal Modularity"})
Compliance Grade: ${reportData?.metrics?.compliance_grade ?? "GRADE A"}
Martin Instability: ${reportData?.metrics?.martin_instability ?? 0.32} (${reportData?.metrics?.martin_label ?? "Balanced"})
Vulnerabilities: ${reportData?.metrics?.critical_vulnerabilities ?? 0} Critical, ${reportData?.metrics?.warning_vulnerabilities ?? 1} Warnings.
Could you provide strategic architectural recommendations and actionable tech debt priorities based on this dossier?`;
                onNavigateToAI(prompt);
              }}
              className="h-8 px-3 inline-flex items-center space-x-1.5 rounded-lg bg-[#141824] hover:bg-[#1c2234] border border-[#22283a] text-purple-300 hover:text-white text-xs font-medium transition-all"
              title="Consult AI Assistant on this dossier"
            >
              <MessageSquareCode className="w-3.5 h-3.5 text-purple-400" />
              <span>Ask AI</span>
            </button>
          )}

          <button
            onClick={handleDownloadPdf}
            className="h-8 px-3.5 inline-flex items-center space-x-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
            title="Download or print complete PDF report (⌘E)"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Download PDF Report</span>
            <kbd className="px-1.5 py-0.2 rounded bg-indigo-800/80 text-[10px] font-mono text-indigo-200">
              ⌘E
            </kbd>
          </button>
        </div>
      </section>

      {error && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-6 py-2 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 2. REPORT PROFILE SWITCHER (3 PRESETS) */}
      <section className="px-6 pt-5 pb-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Preset 1: Executive Architecture Dossier */}
          <div
            onClick={() => setActivePreset("executive")}
            className={`group relative flex flex-col justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
              activePreset === "executive"
                ? "bg-[#141828] border-cyan-500/60 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30"
                : "bg-[#0f121d] border-[#1d2235] hover:bg-[#131726] hover:border-[#2b334d]"
            }`}
          >
            {activePreset === "executive" && (
              <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-cyan-500 text-[#0c0e16] font-mono text-[10px] uppercase font-bold tracking-wider flex items-center space-x-1 shadow-md">
                <CheckCircle2 className="w-3 h-3 text-[#0c0e16]" />
                <span>Active Template</span>
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-500/15 text-cyan-300 font-medium border border-cyan-500/30">
                  Recommended for CTOs & Architects
                </span>
                <span className="text-[11px] font-mono text-slate-500">Preset 01</span>
              </div>
              <h2 className="text-sm font-bold text-white pt-1">
                Executive Architecture Dossier
              </h2>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                High-level architectural health, system tier breakdown, Martin coupling metrics, and tech stack distribution.
              </p>
            </div>
            <div className="flex items-center justify-between pt-4 text-xs font-mono text-slate-400 border-t border-[#181c2b] mt-3">
              <span className="flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>4 Pages • 14 Charts</span>
              </span>
              <span className="text-cyan-400 group-hover:text-cyan-300 font-semibold flex items-center">
                {activePreset === "executive" ? "Selected ✓" : "Select →"}
              </span>
            </div>
          </div>

          {/* Preset 2: Security & Technical Debt Audit */}
          <div
            onClick={() => setActivePreset("security")}
            className={`group relative flex flex-col justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
              activePreset === "security"
                ? "bg-[#181420] border-rose-500/60 shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/30"
                : "bg-[#0f121d] border-[#1d2235] hover:bg-[#131726] hover:border-[#2b334d]"
            }`}
          >
            {activePreset === "security" && (
              <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[10px] uppercase font-bold tracking-wider flex items-center space-x-1 shadow-md">
                <CheckCircle2 className="w-3 h-3 text-white" />
                <span>Active Template</span>
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-rose-500/15 text-rose-300 font-medium border border-rose-500/30">
                  SecOps & Compliance
                </span>
                <span className="text-[11px] font-mono text-slate-500">Preset 02</span>
              </div>
              <h2 className="text-sm font-bold text-white pt-1">
                Security & Technical Debt Audit
              </h2>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                OWASP Top 10 compliance, vulnerability logs, CVSS scoring, and auto-generated patch summaries.
              </p>
            </div>
            <div className="flex items-center justify-between pt-4 text-xs font-mono text-slate-400 border-t border-[#181c2b] mt-3">
              <span className="flex items-center space-x-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>6 Pages • CVSS 8.4 Scanned</span>
              </span>
              <span className="text-rose-400 group-hover:text-rose-300 font-semibold flex items-center">
                {activePreset === "security" ? "Selected ✓" : "Select →"}
              </span>
            </div>
          </div>

          {/* Preset 3: Complete Engineering Specification */}
          <div
            onClick={() => setActivePreset("complete")}
            className={`group relative flex flex-col justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
              activePreset === "complete"
                ? "bg-[#141628] border-indigo-500/60 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/30"
                : "bg-[#0f121d] border-[#1d2235] hover:bg-[#131726] hover:border-[#2b334d]"
            }`}
          >
            {activePreset === "complete" && (
              <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-indigo-500 text-white font-mono text-[10px] uppercase font-bold tracking-wider flex items-center space-x-1 shadow-md">
                <CheckCircle2 className="w-3 h-3 text-white" />
                <span>Active Template</span>
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-500/15 text-indigo-300 font-medium border border-indigo-500/30">
                  Comprehensive 360°
                </span>
                <span className="text-[11px] font-mono text-indigo-400">Preset 03</span>
              </div>
              <h2 className="text-sm font-bold text-white pt-1">
                Complete Engineering Specification
              </h2>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                Exhaustive codebase dossier with interactive execution flows, blast radius indexes, and API catalog.
              </p>
            </div>
            <div className="flex items-center justify-between pt-4 text-xs font-mono text-indigo-300 border-t border-[#181c2b] mt-3">
              <span className="flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>8 Pages • Full AST Matrix</span>
              </span>
              <span className="text-indigo-400 group-hover:text-indigo-300 font-semibold flex items-center">
                {activePreset === "complete" ? "Selected ✓" : "Select →"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MAIN SPLIT COCKPIT: LEFT CONFIG (30%) + RIGHT PREVIEW (70%) */}
      <section className="px-6 pt-3 grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT CONFIGURATION PANEL (xl:col-span-4) */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          <div className="bg-[#0f121d] border border-[#1d2235] rounded-2xl p-5 space-y-5 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between pb-1 border-b border-[#181c2b]">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Report Compiler Setup</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161a28] text-slate-400 border border-[#23283c]">
                Customizing {activePreset.toUpperCase()}
              </span>
            </div>

            {/* Scope & Checkboxes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="uppercase text-slate-400 font-semibold tracking-wider text-[10px]">
                  Report Scope & Sections
                </span>
                <span className="text-indigo-400 font-bold">
                  {activeSectionsCount} of 8 Active
                </span>
              </div>

              <div className="space-y-1.5 pt-1">
                {/* 1. Executive Summary */}
                <label className="flex items-start space-x-2.5 p-2 rounded-xl bg-[#141826] hover:bg-[#1a2032] border border-[#1f253a] transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sectionsConfig.executive_summary}
                    onChange={() => toggleSection("executive_summary")}
                    className="mt-0.5 rounded bg-[#0c0e16] text-indigo-600 focus:ring-0 accent-indigo-500 h-4 w-4"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-white">
                      Executive Summary & Scorecard
                    </span>
                    <span className="text-[10px] text-slate-400">
                      System metrics, ISO/IEC radar, grade summary
                    </span>
                  </div>
                </label>

                {/* 2. Architecture Tiers */}
                <label className="flex items-start space-x-2.5 p-2 rounded-xl bg-[#141826] hover:bg-[#1a2032] border border-[#1f253a] transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sectionsConfig.architecture_tiers}
                    onChange={() => toggleSection("architecture_tiers")}
                    className="mt-0.5 rounded bg-[#0c0e16] text-indigo-600 focus:ring-0 accent-indigo-500 h-4 w-4"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-white">
                      Architecture Tiers & Topology
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Controllers, domain layers, database adapters
                    </span>
                  </div>
                </label>

                {/* 3. Dependency Coupling */}
                <label className="flex items-start space-x-2.5 p-2 rounded-xl bg-[#141826] hover:bg-[#1a2032] border border-[#1f253a] transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sectionsConfig.dependency_coupling}
                    onChange={() => toggleSection("dependency_coupling")}
                    className="mt-0.5 rounded bg-[#0c0e16] text-indigo-600 focus:ring-0 accent-indigo-500 h-4 w-4"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-white">
                      Dependency Coupling (Ca, Ce, I-Index)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Afferent/efferent telemetry & circular checks
                    </span>
                  </div>
                </label>

                {/* 4. Core Business Flows */}
                <label className="flex items-start space-x-2.5 p-2 rounded-xl bg-[#141826] hover:bg-[#1a2032] border border-[#1f253a] transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sectionsConfig.business_flows}
                    onChange={() => toggleSection("business_flows")}
                    className="mt-0.5 rounded bg-[#0c0e16] text-indigo-600 focus:ring-0 accent-indigo-500 h-4 w-4"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-white">
                      Core Business Execution Flows
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Authentication sequence diagrams & call trees
                    </span>
                  </div>
                </label>

                {/* 5. Security Matrix */}
                <label className="flex items-start space-x-2.5 p-2 rounded-xl bg-[#141826] hover:bg-[#1a2032] border border-[#1f253a] transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sectionsConfig.security_matrix}
                    onChange={() => toggleSection("security_matrix")}
                    className="mt-0.5 rounded bg-[#0c0e16] text-indigo-600 focus:ring-0 accent-indigo-500 h-4 w-4"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-white">
                      Security & OWASP Top 10 Matrix
                    </span>
                    <span className="text-[10px] text-slate-400">
                      CVSS vulnerability ranking & exposures
                    </span>
                  </div>
                </label>

                {/* 6. Remediation Patches */}
                <label className="flex items-start space-x-2.5 p-2 rounded-xl bg-[#141826] hover:bg-[#1a2032] border border-[#1f253a] transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sectionsConfig.remediation_patches}
                    onChange={() => toggleSection("remediation_patches")}
                    className="mt-0.5 rounded bg-[#0c0e16] text-indigo-600 focus:ring-0 accent-indigo-500 h-4 w-4"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-white">
                      Auto-Remediation Patches & Diffs
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Static AST synthesis verified fixes
                    </span>
                  </div>
                </label>

                {/* 7. AST Raw Dump */}
                <label className="flex items-start space-x-2.5 p-2 rounded-xl bg-[#141826]/70 hover:bg-[#1a2032] border border-[#1f253a] transition-colors cursor-pointer opacity-75">
                  <input
                    type="checkbox"
                    checked={sectionsConfig.ast_raw_dump}
                    onChange={() => toggleSection("ast_raw_dump")}
                    className="mt-0.5 rounded bg-[#0c0e16] text-indigo-600 focus:ring-0 accent-indigo-500 h-4 w-4"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-white">
                      AST Symbol Inventory Matrix
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Appends 1,204 parsed symbol nodes table
                    </span>
                  </div>
                </label>

                {/* 8. Git Blame Heatmap */}
                <label className="flex items-start space-x-2.5 p-2 rounded-xl bg-[#141826]/70 hover:bg-[#1a2032] border border-[#1f253a] transition-colors cursor-pointer opacity-75">
                  <input
                    type="checkbox"
                    checked={sectionsConfig.git_blame_heatmap}
                    onChange={() => toggleSection("git_blame_heatmap")}
                    className="mt-0.5 rounded bg-[#0c0e16] text-indigo-600 focus:ring-0 accent-indigo-500 h-4 w-4"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-white">
                      Git Blame & Author Churn Heatmap
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Historical volatility across 14 quarters
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Document Settings & Citation */}
            <div className="space-y-3 pt-2 border-t border-[#181c2b]">
              <span className="uppercase text-slate-400 font-semibold tracking-wider text-[10px] font-mono block">
                Document Settings & Citation
              </span>

              {/* Classification Watermark */}
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400">Classification Watermark</span>
                <div className="relative">
                  <select
                    value={classification}
                    onChange={(e) => setClassification(e.target.value as WatermarkClassification)}
                    className="w-full bg-[#141826] border border-[#1f253a] text-slate-200 text-xs rounded-xl px-3 py-2 pr-8 focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="CONFIDENTIAL - INTERNAL USE ONLY">CONFIDENTIAL - INTERNAL USE ONLY</option>
                    <option value="PROPRIETARY & STRICTLY PRIVATE">PROPRIETARY & STRICTLY PRIVATE</option>
                    <option value="EXECUTIVE CTO BRIEFING">EXECUTIVE CTO BRIEFING</option>
                    <option value="PUBLIC AUDIT DISCLOSURE">PUBLIC AUDIT DISCLOSURE</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Target Commit Citation */}
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400">Target Commit Citation</span>
                <div className="flex items-center justify-between bg-[#141826] border border-[#1f253a] px-3 py-1.5 rounded-xl font-mono text-xs">
                  <span className="text-indigo-300">
                    {reportData?.target_branch || "main"} @ {reportData?.commit_sha || "5db7517c29"}
                  </span>
                  <button
                    onClick={() => handleCopySha(reportData?.commit_sha || "5db7517c29")}
                    className="text-slate-400 hover:text-white transition-colors"
                    title="Copy Commit SHA"
                  >
                    {copiedSha ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Paper Layout & Margins */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Paper Layout</span>
                  <div className="bg-[#141826] border border-[#1f253a] px-2.5 py-1.5 rounded-xl text-slate-300 flex items-center justify-between">
                    <span>A4 Portrait</span>
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Margins</span>
                  <div className="bg-[#141826] border border-[#1f253a] px-2.5 py-1.5 rounded-xl text-slate-300 flex items-center justify-between">
                    <span>Standard 0.75"</span>
                    <Square className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Export Format Selector */}
            <div className="space-y-2 pt-2 border-t border-[#181c2b]">
              <span className="uppercase text-slate-400 font-semibold tracking-wider text-[10px] font-mono block">
                Export Format
              </span>
              <div className="grid grid-cols-3 gap-1.5 bg-[#0a0c14] p-1 rounded-xl border border-[#1a1f30]">
                <button
                  onClick={() => setExportFormat("pdf")}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium text-center transition-all ${
                    exportFormat === "pdf"
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-[#141826]"
                  }`}
                >
                  PDF Document
                </button>
                <button
                  onClick={() => setExportFormat("markdown")}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium text-center transition-all ${
                    exportFormat === "markdown"
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-[#141826]"
                  }`}
                >
                  Markdown (.md)
                </button>
                <button
                  onClick={() => setExportFormat("docx")}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium text-center transition-all ${
                    exportFormat === "docx"
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-[#141826]"
                  }`}
                >
                  DOCX Spec
                </button>
              </div>

              <button
                onClick={handleExportAction}
                className="w-full mt-2 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 flex items-center justify-center space-x-2 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>
                  {exportFormat === "pdf"
                    ? "Generate & Print PDF"
                    : exportFormat === "markdown"
                    ? "Download Markdown Report"
                    : "Export DOCX Specification"}
                </span>
              </button>
            </div>

            {/* Compilation Telemetry & Re-synthesize */}
            <div className="p-3 bg-[#131726] border border-[#1e243a] rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-white font-medium flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Synthesis Cache</span>
                </span>
                <span className="text-cyan-400">100% Cached (2.8 MB)</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#1b2034] overflow-hidden">
                <div className="h-full bg-cyan-400 w-full rounded-full" />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                <span>Render Time: &lt; 1.2s</span>
                <button
                  onClick={() => {
                    const pId = activeProject?.id || "default-project";
                    const rId = activeRepository?.id || "default-repo";
                    recompileReport(pId, rId);
                  }}
                  disabled={isCompiling}
                  className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isCompiling ? "animate-spin" : ""}`} />
                  <span>{isCompiling ? "Compiling..." : "Re-synthesize"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT LIVE DOCUMENT PREVIEW CANVAS (xl:col-span-8) */}
        <div className="xl:col-span-8 flex flex-col gap-3 min-w-0">
          {/* Preview Toolbar Control Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-2 bg-[#0f121d] border border-[#1d2235] rounded-xl shadow-sm text-xs">
            <div className="flex items-center space-x-3">
              <span className="text-slate-300 font-medium flex items-center space-x-1.5">
                <Eye className="w-4 h-4 text-indigo-400" />
                <span>Live Render Sheet</span>
              </span>
              <span className="text-slate-600">|</span>
              <div className="flex items-center space-x-1 bg-[#141824] px-2.5 py-1 rounded-lg border border-[#22283a] text-slate-300 font-mono">
                <span>Zoom: {zoomLevel}%</span>
              </div>
              <button
                onClick={() => setZoomLevel(zoomLevel === 100 ? 125 : 100)}
                className="px-2.5 py-1 rounded-lg bg-[#141824] hover:bg-[#1c2234] border border-[#22283a] text-slate-300 hover:text-white transition-colors"
              >
                Fit to Width
              </button>
            </div>

            <div className="flex items-center space-x-2 font-mono text-slate-400">
              <span className="text-white font-medium">Page 1 of {activePreset === "complete" ? 8 : activePreset === "security" ? 6 : 4}</span>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => setPageViewMode("dual")}
                className={`p-1.5 rounded-lg border transition-all ${
                  pageViewMode === "dual"
                    ? "bg-indigo-600 text-white border-indigo-500"
                    : "bg-[#141824] text-slate-400 hover:text-white border-[#22283a]"
                }`}
                title="Dual Page Grid"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPageViewMode("single")}
                className={`p-1.5 rounded-lg border transition-all ${
                  pageViewMode === "single"
                    ? "bg-indigo-600 text-white border-indigo-500"
                    : "bg-[#141824] text-slate-400 hover:text-white border-[#22283a]"
                }`}
                title="Single Page View"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Live Dossier Sheet Container */}
          <div className="w-full bg-[#080910] p-4 md:p-6 rounded-2xl border border-[#1b2032] shadow-2xl overflow-x-auto">
            {/* The Actual Document Sheet */}
            <article
              id="printable-dossier"
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
              className="relative max-w-[850px] mx-auto bg-[#131623] border border-[#242b42] rounded-xl p-6 md:p-10 space-y-6 shadow-2xl text-[#e2e8f0] transition-transform"
            >
              {/* Confidentiality Stamp (Watermark) */}
              <div className="absolute top-6 right-6 px-3 py-1 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 font-mono text-[10px] tracking-widest uppercase font-bold select-none rotate-1 shadow-sm">
                {classification}
              </div>

              {/* Document Header Banner */}
              <header className="flex flex-col gap-4 pb-4 border-b border-[#21273d]">
                <div className="flex items-start space-x-3.5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 p-2.5 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30 flex-shrink-0">
                    <Shield className="w-full h-full" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold tracking-tight text-white">CodeLens AI</span>
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-semibold border border-indigo-500/30 uppercase tracking-wide">
                        ENTERPRISE INTELLIGENCE
                      </span>
                    </div>
                    <h1 className="text-xs uppercase tracking-wider text-slate-400 font-semibold font-mono mt-0.5">
                      Engineering Intelligence Dossier & Architecture Audit
                    </h1>
                  </div>
                </div>

                {/* Repo Context Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-[#0c0e16] border border-[#1d2235] rounded-xl text-xs">
                  <div>
                    <span className="block font-mono text-[10px] uppercase text-slate-500">
                      Target Repository
                    </span>
                    <span className="font-semibold text-white truncate block">
                      {reportData?.repository_name || "ecommerce-platform / core"}
                    </span>
                  </div>
                  <div>
                    <span className="block font-mono text-[10px] uppercase text-slate-500">
                      Audit Snapshot
                    </span>
                    <span className="font-mono text-slate-200">
                      {reportData?.created_at?.slice(0, 10) || "Oct 24, 2026"} • {reportData?.commit_sha?.slice(0, 7) || "5db7517"}
                    </span>
                  </div>
                  <div>
                    <span className="block font-mono text-[10px] uppercase text-slate-500">
                      AST Nodes Evaluated
                    </span>
                    <span className="font-semibold text-white">
                      {metrics?.ast_symbols_evaluated?.toLocaleString() ?? "1,204"} Parsed Symbols
                    </span>
                  </div>
                  <div>
                    <span className="block font-mono text-[10px] uppercase text-slate-500">
                      Compliance Grade
                    </span>
                    <span className="inline-flex items-center space-x-1.5 font-mono font-bold text-cyan-300">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span>{metrics?.compliance_grade || "GRADE A (94/100)"}</span>
                    </span>
                  </div>
                </div>
              </header>

              {/* SECTION 1: Executive KPI Health Scorecard */}
              {sectionsConfig.executive_summary && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center space-x-2">
                      <span className="w-1.5 h-3 bg-indigo-500 rounded-full" />
                      <span>01. Executive KPI Health Scorecard</span>
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500">
                      ISO/IEC 25010 Evaluated
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* KPI 1: Health */}
                    <div className="p-3.5 rounded-xl bg-[#0c0e16] border border-[#1d2235] space-y-1">
                      <span className="text-[11px] font-mono text-slate-400 block">
                        Architecture Health
                      </span>
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-2xl font-bold text-white">
                          {metrics?.health_score ?? 94}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">/100</span>
                      </div>
                      <div className="w-full bg-[#1b2032] h-1.5 rounded-full overflow-hidden mt-1.5">
                        <div
                          className="bg-cyan-400 h-full rounded-full transition-all"
                          style={{ width: `${metrics?.health_score ?? 94}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-cyan-300 font-medium block pt-1">
                        {metrics?.health_label ?? "Optimal Modularity"}
                      </span>
                    </div>

                    {/* KPI 2: Security */}
                    <div className="p-3.5 rounded-xl bg-[#0c0e16] border border-[#1d2235] space-y-1">
                      <span className="text-[11px] font-mono text-slate-400 block">
                        Security Risk Level
                      </span>
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-2xl font-bold text-white">
                          {metrics?.critical_vulnerabilities ?? 0}
                        </span>
                        <span className="text-xs text-cyan-400 font-semibold font-mono">
                          Critical
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          / {metrics?.warning_vulnerabilities ?? 1} Warn
                        </span>
                      </div>
                      <div className="w-full bg-[#1b2032] h-1.5 rounded-full overflow-hidden mt-1.5">
                        <div
                          className="bg-cyan-400 h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(10, ((metrics?.critical_vulnerabilities ?? 0) + 1) * 15)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-cyan-300 font-medium block pt-1">
                        OWASP Top 10 Audited
                      </span>
                    </div>

                    {/* KPI 3: Martin Instability */}
                    <div className="p-3.5 rounded-xl bg-[#0c0e16] border border-[#1d2235] space-y-1">
                      <span className="text-[11px] font-mono text-slate-400 block">
                        Martin Instability (I)
                      </span>
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-2xl font-bold text-white">
                          {metrics?.martin_instability ?? 0.32}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {metrics?.martin_label ?? "Balanced"}
                        </span>
                      </div>
                      <div className="w-full bg-[#1b2032] h-1.5 rounded-full overflow-hidden mt-1.5">
                        <div
                          className="bg-indigo-400 h-full rounded-full transition-all"
                          style={{ width: `${Math.round((metrics?.martin_instability ?? 0.32) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-indigo-300 font-medium block pt-1">
                        Core Resilient Layer
                      </span>
                    </div>

                    {/* KPI 4: Blast Radius */}
                    <div className="p-3.5 rounded-xl bg-[#0c0e16] border border-[#1d2235] space-y-1">
                      <span className="text-[11px] font-mono text-slate-400 block">
                        Blast Radius Exposure
                      </span>
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-2xl font-bold text-white">
                          {metrics?.blast_radius_exposure ?? "<15%"}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">Low</span>
                      </div>
                      <div className="w-full bg-[#1b2032] h-1.5 rounded-full overflow-hidden mt-1.5">
                        <div className="bg-cyan-400 h-full w-[15%] rounded-full" />
                      </div>
                      <span className="text-[10px] text-cyan-300 font-medium block pt-1">
                        Safe Refactor Envelope
                      </span>
                    </div>
                  </div>
                </section>
              )}

              {/* SECTION 2: Architecture Tier Matrix */}
              {sectionsConfig.architecture_tiers && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center space-x-2">
                      <span className="w-1.5 h-3 bg-cyan-400 rounded-full" />
                      <span>02. Architectural Tier Breakdown & Component Distribution</span>
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500">
                      {metrics?.audited_files_count ?? 89} Source Modules
                    </span>
                  </div>

                  <div className="bg-[#0c0e16] border border-[#1d2235] rounded-xl p-4 space-y-3">
                    {tiers.length === 0 ? (
                      <div className="text-xs text-slate-500 italic py-2">No tier data compiled</div>
                    ) : (
                      tiers.map((tier) => (
                        <div
                          key={tier.tier_number}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                        >
                          <div className="flex items-center space-x-2 min-w-[240px]">
                            <span className="font-mono text-xs font-bold text-cyan-400">
                              [{tier.tier_number}]
                            </span>
                            <span className="text-white font-medium">{tier.name}</span>
                            <span className="font-mono text-[10px] text-slate-500">
                              {tier.framework}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3 flex-1 max-w-sm">
                            <div className="w-full bg-[#1b2032] h-2 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${tier.percentage}%`,
                                  backgroundColor: tier.color || "#06b6d4",
                                }}
                              />
                            </div>
                            <span className="font-mono text-xs text-slate-300 w-16 text-right">
                              {tier.file_count} files
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}

              {/* SECTION 3: Business Execution Flows */}
              {sectionsConfig.business_flows && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center space-x-2">
                      <span className="w-1.5 h-3 bg-indigo-500 rounded-full" />
                      <span>03. Synthetic Critical Path: Authentication & Token Dispatch Flow</span>
                    </h3>
                    <span className="text-[10px] font-mono text-indigo-400 font-semibold">
                      Latency: ~14.2ms
                    </span>
                  </div>

                  <div className="p-4 bg-[#0c0e16] border border-[#1d2235] rounded-xl overflow-x-auto">
                    <div className="flex items-center justify-between min-w-[580px] gap-2">
                      {flow.map((step, idx) => (
                        <React.Fragment key={step.step_number}>
                          <div className="flex flex-col items-center text-center p-3 rounded-xl bg-[#141824] border border-[#1f253a] flex-1">
                            <span className="font-mono text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                              {step.step_type}
                            </span>
                            <span className="font-mono text-xs font-semibold text-white pt-1 truncate w-full">
                              {step.symbol}
                            </span>
                            <span className="text-[10px] text-slate-400 pt-0.5 truncate w-full">
                              {step.detail}
                            </span>
                          </div>
                          {idx < flow.length - 1 && (
                            <div className="flex items-center text-indigo-400 px-1 font-bold">
                              →
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* SECTION 4: Security & OWASP Top 10 Matrix */}
              {sectionsConfig.security_matrix && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center space-x-2">
                      <span className="w-1.5 h-3 bg-rose-500 rounded-full" />
                      <span>04. Security Vulnerabilities & Debt Audit Log</span>
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500">
                      {findings.length} Findings Detected
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[#1d2235] bg-[#0c0e16]">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#141824] text-slate-400 font-mono text-[10px] uppercase tracking-wider border-b border-[#1f253a]">
                          <th className="py-2.5 px-3">Rule ID</th>
                          <th className="py-2.5 px-3">Vulnerability Title / Location</th>
                          <th className="py-2.5 px-3">CVSS Severity</th>
                          <th className="py-2.5 px-3 text-right">Remediation Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#181c2b] text-slate-300">
                        {findings.map((f) => (
                          <tr key={f.rule_id} className="hover:bg-[#141826] transition-colors">
                            <td className="py-2.5 px-3 font-mono text-xs text-indigo-300 font-semibold">
                              {f.rule_id}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-medium text-white">{f.title}</span>
                              <span className="block font-mono text-[10px] text-slate-500">
                                {f.file_citation}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {f.cvss_score >= 7.0 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                                  {f.cvss_score} {f.severity_label}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-[#1a1f30] text-slate-300 border border-[#262c42] font-semibold">
                                  {f.cvss_score} {f.severity_label}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold">
                                <Check className="w-3 h-3 text-cyan-400" />
                                <span>{f.remediation_status}</span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* SECTION 5: Auto-Remediation Patches */}
              {sectionsConfig.remediation_patches && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center space-x-2">
                      <span className="w-1.5 h-3 bg-cyan-400 rounded-full" />
                      <span>05. Verified Automated Remediation Patch (CWE-798)</span>
                    </h3>
                    <span className="text-[10px] font-mono text-cyan-300 font-semibold">
                      AST Fix Validated
                    </span>
                  </div>

                  <div className="p-4 bg-[#0a0c14] border border-[#1b2032] rounded-xl font-mono text-xs leading-relaxed overflow-x-auto">
                    <div className="text-slate-500 pb-1 text-[11px]">
                      # config/settings.py (Stripe Credential Secret Masking)
                    </div>
                    <div className="bg-rose-500/15 text-rose-300 px-3 py-1.5 rounded-lg flex items-center space-x-2">
                      <span className="font-bold select-none">-</span>
                      <span>STRIPE_API_KEY = "sk_mock_live_token_redacted_00000000"</span>
                    </div>
                    <div className="bg-cyan-500/15 text-cyan-300 px-3 py-1.5 rounded-lg flex items-center space-x-2 mt-1">
                      <span className="font-bold select-none">+</span>
                      <span>STRIPE_API_KEY: SecretStr = Field(..., alias="STRIPE_API_KEY")</span>
                    </div>
                  </div>
                </section>
              )}

              {/* SECTION 6: AST Raw Dump (Optional) */}
              {sectionsConfig.ast_raw_dump && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center space-x-2">
                      <span className="w-1.5 h-3 bg-purple-400 rounded-full" />
                      <span>06. AST Abstract Syntax Tree Symbol Directory</span>
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500">1,204 Parsed Nodes</span>
                  </div>
                  <div className="p-3 bg-[#0a0c14] border border-[#1b2032] rounded-xl text-xs font-mono text-slate-400 max-h-36 overflow-y-auto">
                    <div>[SYM-001] class OrderController(BaseController) • line 14: controllers/order.py</div>
                    <div>[SYM-002] async def process_checkout(cart_id) • line 48: controllers/order.py</div>
                    <div>[SYM-003] class AuthService(DomainService) • line 22: services/auth.py</div>
                    <div>[SYM-004] def hash_argon2_password(plaintext) • line 64: services/auth.py</div>
                    <div>[SYM-005] class UserRepository(BaseRepository) • line 10: repositories/user.py</div>
                  </div>
                </section>
              )}

              {/* SECTION 7: Git Blame Heatmap (Optional) */}
              {sectionsConfig.git_blame_heatmap && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center space-x-2">
                      <span className="w-1.5 h-3 bg-amber-400 rounded-full" />
                      <span>07. Git Blame & Author Volatility Heatmap</span>
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500">14 Quarters Audited</span>
                  </div>
                  <div className="p-3 bg-[#0a0c14] border border-[#1b2032] rounded-xl text-xs font-mono text-slate-400">
                    <div className="flex justify-between py-1 border-b border-[#181c2a]">
                      <span>Core Auth Architecture</span>
                      <span className="text-emerald-400">Stable (0.04 churn/mo)</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Checkout & Payments Gateway</span>
                      <span className="text-amber-400">High Volatility (1.82 churn/mo)</span>
                    </div>
                  </div>
                </section>
              )}

              {/* Document Footer Strip */}
              <footer className="pt-5 border-t border-[#21273d] flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-500 font-mono text-[10px]">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span>Page 1 of {activePreset === "complete" ? 8 : activePreset === "security" ? 6 : 4} • CodeLens AI Intelligence Dossier</span>
                </div>
                <span>Generated autonomously via AST Multi-Domain Synthesizer • ISO/IEC 25010</span>
              </footer>
            </article>
          </div>
        </div>
      </section>

      {/* 4. BOTTOM STICKY STATUS & TELEMETRY STRIP */}
      <footer className="fixed bottom-0 left-0 right-0 h-10 bg-[#0c0e17]/95 backdrop-blur-md border-t border-[#1d2235] px-6 flex items-center justify-between text-xs font-mono text-slate-400 z-30">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-white font-medium">
            Dossier Run: {reportData?.dossier_id || "RPT-2026-8812"}
          </span>
          <span className="text-slate-600">•</span>
          <span>Verified by CodeLens AST Engine</span>
        </div>

        <div className="hidden md:flex items-center space-x-2 text-slate-300">
          <FileText className="w-3.5 h-3.5 text-indigo-400" />
          <span>Page 1 of {activePreset === "complete" ? 8 : activePreset === "security" ? 6 : 4} Active View</span>
          <span className="text-slate-600">•</span>
          <span className="text-cyan-400">Ready for Export (2.8 MB PDF)</span>
        </div>

        <div className="flex items-center space-x-1.5">
          <span className="text-slate-500">Formats:</span>
          <span className="px-1.5 py-0.5 rounded bg-[#151928] text-slate-300 border border-[#23283c] text-[10px]">
            PDF
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#151928] text-slate-300 border border-[#23283c] text-[10px]">
            Markdown
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#151928] text-slate-300 border border-[#23283c] text-[10px]">
            JSON
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#151928] text-slate-300 border border-[#23283c] text-[10px]">
            DOCX
          </span>
        </div>
      </footer>
    </div>
  );
};
