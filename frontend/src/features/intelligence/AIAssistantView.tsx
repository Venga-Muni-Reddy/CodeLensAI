import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  Copy,
  Cpu,
  Download,
  Flame,
  FolderGit2,
  GitFork,
  Layers,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Plus,
  Search,
  Send,
  Share2,
  Sparkles,
  Terminal,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import { useRepositoryStore } from "../../stores/repositoryStore";
import { useChatStore } from "../../stores/chatStore";

interface AIAssistantViewProps {
  initialPrompt?: string;
  onBack?: () => void;
  onNavigateToGraph?: (filePath?: string) => void;
  onNavigateToImpact?: (targetSymbol?: string) => void;
  selectedRepoId?: string;
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  initialPrompt,
  onBack,
  onNavigateToGraph,
  onNavigateToImpact,
  selectedRepoId,
}) => {
  const { projects, activeProject, setActiveProject, fetchProjects } = useProjectStore();
  const { repositories, fetchRepositories } = useRepositoryStore();
  const {
    conversations,
    activeConversation,
    activeCitation,
    deepRagEnabled,
    preferredProvider,
    attachedFiles,
    isLoading,
    isSending,
    fetchConversations,
    selectConversation,
    createConversation,
    renameConversation,
    deleteConversation,
    sendMessage,
    submitFeedback,
    toggleAttachedFile,
    setDeepRag,
    setPreferredProvider,
    setActiveCitation,
  } = useChatStore();

  const [inputMessage, setInputMessage] = useState("");
  const [threadSearch, setThreadSearch] = useState("");
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightInspector, setShowRightInspector] = useState(true);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedAnswerId, setCopiedAnswerId] = useState<string | null>(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<"symbol" | "snippet" | "relations">("symbol");

  // Project & Repo local selection
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedRepoIdState, setSelectedRepoIdState] = useState<string>("");

  // Thread renaming state
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initial projects fetch if needed
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Sync active project and fetch repositories
  useEffect(() => {
    if (activeProject) {
      const pid = activeProject.id || (activeProject as any)._id;
      setSelectedProjectId(pid);
      fetchRepositories(pid);
    } else if (projects.length > 0) {
      const first = projects[0];
      const pid = first.id || (first as any)._id;
      setSelectedProjectId(pid);
      setActiveProject(first);
      fetchRepositories(pid);
    }
  }, [activeProject, projects, setActiveProject, fetchRepositories]);

  // Determine active repository
  const currentRepo = useMemo(() => {
    if (selectedRepoIdState) {
      const found = repositories.find((r) => r.id === selectedRepoIdState || (r as any)._id === selectedRepoIdState);
      if (found) return found;
    }
    if (selectedRepoId) {
      const found = repositories.find((r) => r.id === selectedRepoId || (r as any)._id === selectedRepoId);
      if (found) return found;
    }
    return repositories[0] || null;
  }, [repositories, selectedRepoIdState, selectedRepoId]);

  const repoId = currentRepo?.id || (currentRepo as any)?._id || "default-repo";
  const projectId = selectedProjectId || activeProject?.id || (activeProject as any)?._id || "default";

  // Initial fetch of conversations when repoId or projectId changes
  useEffect(() => {
    fetchConversations(repoId, projectId);
  }, [repoId, projectId, fetchConversations]);

  // Handle project selector change
  const handleProjectChange = (newProjId: string) => {
    setSelectedProjectId(newProjId);
    setSelectedRepoIdState("");
    const foundProj = projects.find((p) => (p.id || (p as any)._id) === newProjId);
    if (foundProj) {
      setActiveProject(foundProj);
      fetchRepositories(newProjId);
    }
  };

  // Handle initial prompt if passed via navigation
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setInputMessage(initialPrompt);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [initialPrompt]);

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  const filteredConversations = useMemo(() => {
    if (!threadSearch.trim()) return conversations;
    const q = threadSearch.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [conversations, threadSearch]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isSending) return;

    setInputMessage("");
    await sendMessage(repoId, text, projectId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleCopyMarkdown = (markdown: string, id: string) => {
    navigator.clipboard.writeText(markdown);
    setCopiedAnswerId(id);
    setTimeout(() => setCopiedAnswerId(null), 2000);
  };

  const handleExportMarkdown = () => {
    if (!activeConversation) return;
    let md = `# ${activeConversation.title}\n\n`;
    md += `*Generated by CodeLens AI • Date: ${new Date(activeConversation.updated_at).toLocaleString()}*\n\n---\n\n`;

    activeConversation.messages.forEach((msg) => {
      const author = msg.role === "user" ? "### Lead Architect (User)" : `### CodeLens AI (${msg.provider_used || "AI"})`;
      md += `${author}\n\n${msg.content}\n\n`;
      if (msg.citations && msg.citations.length > 0) {
        md += `**Referenced Citations:**\n`;
        msg.citations.forEach((c) => {
          md += `- \`@${c.file_path}:${c.symbol_name || ""}\` (${c.match_percentage}% match, layer: ${c.layer})\n`;
        });
        md += `\n`;
      }
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeConversation.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_export.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Renaming handlers
  const handleStartRename = (thread: { id: string; title: string }, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingThreadId(thread.id);
    setEditingTitleText(thread.title);
  };

  const handleSaveRename = async (threadId: string, e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    const trimmed = editingTitleText.trim();
    if (trimmed) {
      await renameConversation(repoId, threadId, trimmed, projectId);
    }
    setEditingThreadId(null);
  };

  const handleCancelRename = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    setEditingThreadId(null);
  };

  const getLayerColor = (layer: string) => {
    switch (layer) {
      case "routing":
        return { text: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30", dot: "bg-cyan-400" };
      case "domain":
        return { text: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/30", dot: "bg-indigo-400" };
      case "persistence":
        return { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", dot: "bg-amber-400" };
      case "infra":
      default:
        return { text: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", dot: "bg-purple-400" };
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-[#0c0e16] text-[#e2e1ed] overflow-hidden select-text">
      {/* ============================================================== */}
      {/* TOP WORKBENCH HEADER & CONTEXT TELEMETRY BAR                   */}
      {/* ============================================================== */}
      <header className="h-14 border-b border-[#282a32] bg-[#11131b]/90 backdrop-blur-xl px-4 lg:px-6 flex items-center justify-between gap-3 flex-shrink-0 z-30">
        {/* Left: Navigation, Project & Repo Selector, Model Pill */}
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg bg-[#191b24] hover:bg-[#282a32] text-[#908fa0] hover:text-white transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {/* Project Selector Dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#191b24] border border-[#282a32] text-xs">
            <FolderGit2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <span className="text-[#908fa0] hidden sm:inline">Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer max-w-[130px] truncate"
            >
              {projects.length > 0 ? (
                projects.map((p) => {
                  const pid = p.id || (p as any)._id;
                  return (
                    <option key={pid} value={pid} className="bg-[#11131b] text-white">
                      {p.name}
                    </option>
                  );
                })
              ) : (
                <option value="default" className="bg-[#11131b] text-white">
                  {activeProject?.name || "Default Project"}
                </option>
              )}
            </select>
          </div>

          {/* Repository Selector Dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#191b24] border border-[#282a32] text-xs">
            <GitFork className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span className="text-[#908fa0] hidden sm:inline">Repo:</span>
            <select
              value={repoId}
              onChange={(e) => setSelectedRepoIdState(e.target.value)}
              className="bg-transparent text-[#e2e1ed] font-medium text-xs focus:outline-none cursor-pointer max-w-[130px] truncate"
            >
              {repositories.length > 0 ? (
                repositories.map((r) => {
                  const rid = r.id || (r as any)._id;
                  return (
                    <option key={rid} value={rid} className="bg-[#11131b] text-white">
                      {r.name}
                    </option>
                  );
                })
              ) : (
                <option value="default-repo" className="bg-[#11131b] text-white">
                  {currentRepo?.name || "workspace-repo"}
                </option>
              )}
            </select>
          </div>

          {/* Neural Engine Provider Pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-[#191b24] border border-indigo-500/25 text-xs text-[#e2e1ed] shadow-[0_0_12px_rgba(99,102,241,0.15)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-indigo-300">Neural Engine</span>
            <span className="text-[#464554]">|</span>
            <span className="text-[#c7c4d7] font-mono text-[11px]">
              OpenRouter: gpt-3.5-turbo{" "}
              <span className="text-[#908fa0] hidden xl:inline">(Fallback: Gemini → GPT → Grok)</span>
            </span>
          </div>
        </div>

        {/* Right: Actions & Panel Toggles */}
        <div className="flex items-center gap-2">
          {/* Active Thread Rename header hint */}
          {activeConversation && (
            <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#191b24] border border-[#282a32] text-xs">
              <span className="text-[#908fa0]">Thread:</span>
              <span className="text-white font-medium truncate max-w-[150px]">{activeConversation.title}</span>
              <button
                onClick={(e) => handleStartRename(activeConversation, e)}
                className="p-0.5 text-[#908fa0] hover:text-indigo-300"
                title="Rename active thread"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}

          <button
            onClick={handleExportMarkdown}
            disabled={!activeConversation || activeConversation.messages.length === 0}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#191b24] hover:bg-[#282a32] text-xs text-[#c7c4d7] hover:text-white transition-colors disabled:opacity-50"
            title="Export conversation as Markdown"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export (MD)</span>
          </button>

          <button
            onClick={() => createConversation(repoId, projectId)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-[0_0_12px_rgba(99,102,241,0.35)] transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Thread</span>
          </button>

          <div className="h-4 w-px bg-[#282a32] mx-1"></div>

          {/* Toggle Left Sidebar */}
          <button
            onClick={() => setShowLeftSidebar((prev) => !prev)}
            className="p-1.5 rounded-lg bg-[#191b24] hover:bg-[#282a32] text-[#908fa0] hover:text-white transition-colors"
            title={showLeftSidebar ? "Collapse Threads Sidebar" : "Show Threads Sidebar"}
          >
            {showLeftSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>

          {/* Toggle Right Inspector */}
          <button
            onClick={() => setShowRightInspector((prev) => !prev)}
            className="p-1.5 rounded-lg bg-[#191b24] hover:bg-[#282a32] text-[#908fa0] hover:text-white transition-colors"
            title={showRightInspector ? "Collapse Inspector" : "Show Inspector"}
          >
            {showRightInspector ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 3-COLUMN WORKBENCH MAIN VIEW                                   */}
      {/* ============================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* ========================================== */}
        {/* COLUMN A: THREAD SESSIONS SIDEBAR (~280px) */}
        {/* ========================================== */}
        {showLeftSidebar && (
          <aside className="w-72 lg:w-80 flex-shrink-0 bg-[#0c0e16] border-r border-[#282a32] flex flex-col justify-between transition-all duration-300 z-20">
            {/* Top: Search & Threads List */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search threads... (⌘F)"
                  value={threadSearch}
                  onChange={(e) => setThreadSearch(e.target.value)}
                  className="w-full bg-[#191b24] text-xs text-white pl-8 pr-3 py-2 rounded-lg border border-[#282a32] focus:outline-none focus:border-indigo-500 placeholder-[#908fa0]"
                />
                <Search className="w-3.5 h-3.5 text-[#908fa0] absolute left-2.5 top-2.5" />
              </div>

              {/* Gradient New Thread Button */}
              <button
                onClick={() => createConversation(repoId, projectId)}
                className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:opacity-95 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(99,102,241,0.25)] transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>New Chat Thread</span>
              </button>

              {/* Threads Header */}
              <div className="flex items-center justify-between px-1 pt-1 text-xs text-[#908fa0]">
                <span className="font-semibold uppercase tracking-wider text-[11px]">Active & Pinned</span>
                <span className="bg-[#191b24] px-1.5 py-0.5 rounded text-[11px] font-mono">
                  {filteredConversations.length} Sessions
                </span>
              </div>

              {/* Threads List */}
              <div className="space-y-1.5">
                {isLoading && conversations.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#908fa0]">Loading threads...</div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#908fa0]">No threads found.</div>
                ) : (
                  filteredConversations.map((thread) => {
                    const isActive = activeConversation?.id === thread.id;
                    const isEditing = editingThreadId === thread.id;

                    return (
                      <div
                        key={thread.id}
                        onClick={() => selectConversation(thread.id)}
                        className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${
                          isActive
                            ? "bg-[#1d1f28] border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                            : "bg-[#11131b]/80 hover:bg-[#191b24] border-transparent hover:border-[#282a32]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>}
                            <span className="text-[11px] text-[#908fa0]">
                              {new Date(thread.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-[#908fa0] bg-[#191b24] px-1.5 py-0.5 rounded">
                            {thread.messages.length} msgs
                          </span>
                        </div>

                        {/* Thread Title or Inline Rename Input */}
                        {isEditing ? (
                          <div className="flex items-center gap-1 my-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingTitleText}
                              onChange={(e) => setEditingTitleText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveRename(thread.id, e);
                                if (e.key === "Escape") handleCancelRename(e);
                              }}
                              autoFocus
                              className="flex-1 bg-[#0c0e16] text-white text-xs px-2 py-1 rounded border border-indigo-500 focus:outline-none"
                            />
                            <button
                              onClick={(e) => handleSaveRename(thread.id, e)}
                              className="p-1 rounded bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleCancelRename}
                              className="p-1 rounded bg-[#282a32] text-[#908fa0] hover:text-white"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-xs font-medium leading-snug line-clamp-2 ${
                                isActive ? "text-white" : "text-[#c7c4d7] group-hover:text-white"
                              }`}
                            >
                              {thread.title}
                            </p>

                            {/* Hover Actions: Rename and Delete */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button
                                onClick={(e) => handleStartRename(thread, e)}
                                className="p-1 rounded hover:bg-indigo-500/20 text-[#908fa0] hover:text-indigo-300 transition-colors"
                                title="Rename thread"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteConversation(repoId, thread.id, projectId);
                                }}
                                className="p-1 rounded hover:bg-rose-500/20 text-[#908fa0] hover:text-rose-400 transition-colors"
                                title="Delete thread"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {thread.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-[#191b24] text-indigo-300 font-mono"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom: Monthly Token Quota Card */}
            <div className="p-3 bg-[#11131b] border-t border-[#282a32]">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[#c7c4d7] font-medium">Monthly Token Quota</span>
                <span className="text-cyan-400 font-semibold font-mono">37%</span>
              </div>
              <div className="w-full h-1.5 bg-[#191b24] rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full"
                  style={{ width: "37%" }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#908fa0]">
                <span className="font-mono">18,450 / 50,000</span>
                <span className="px-1.5 py-0.5 rounded bg-[#191b24] text-[#c7c4d7]">Reset in 12d</span>
              </div>
            </div>
          </aside>
        )}

        {/* ========================================== */}
        {/* COLUMN B: CHAT STREAM & INPUT DECK         */}
        {/* ========================================== */}
        <main className="flex-1 flex flex-col justify-between overflow-hidden bg-[#0c0e16] relative">
          {/* Top Sticky Attached Context Ribbon */}
          <div className="sticky top-0 z-10 bg-[#11131b]/90 backdrop-blur-md px-4 py-2 border-b border-[#282a32] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                <Layers className="w-3.5 h-3.5" />
                <span>Attached Context ({attachedFiles.length} Files • AST Verified):</span>
              </div>
              {attachedFiles.map((file, idx) => {
                const layer = idx === 0 ? "routing" : idx === 1 ? "domain" : idx === 2 ? "persistence" : "infra";
                const c = getLayerColor(layer);
                return (
                  <button
                    key={file}
                    onClick={() => toggleAttachedFile(file)}
                    title="Click to toggle file context"
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border transition-all hover:opacity-80 cursor-pointer ${c.bg} ${c.text} ${c.border}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}></span>
                    <span>{file.split("/").pop()}</span>
                    <span className="opacity-60 text-[10px]">({layer})</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setDeepRag(!deepRagEnabled)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  deepRagEnabled
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    : "bg-[#191b24] text-[#908fa0]"
                }`}
              >
                Deep RAG: {deepRagEnabled ? "ON" : "OFF"}
              </button>
            </div>
          </div>

          {/* Scrollable Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
            {!activeConversation || activeConversation.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_24px_rgba(99,102,241,0.2)]">
                  <Bot className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Repository-Aware AI Assistant</h3>
                  <p className="text-xs text-[#908fa0] mt-1 leading-relaxed">
                    Ask questions grounded directly in your codebase AST symbols, multi-layer architecture, and data flows.
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full text-xs">
                  <button
                    onClick={() =>
                      handleSendMessage(
                        "How does the authentication flow handle credential verification and JWT session rotation?"
                      )
                    }
                    className="p-2.5 rounded-lg bg-[#191b24] hover:bg-[#282a32] text-[#c7c4d7] hover:text-white text-left transition-colors border border-[#282a32]"
                  >
                    🔐 "How does the authentication flow handle credential verification and JWT session rotation?"
                  </button>
                  <button
                    onClick={() =>
                      handleSendMessage(
                        "Explain the 4-layer architecture of this repository from routing to persistence."
                      )
                    }
                    className="p-2.5 rounded-lg bg-[#191b24] hover:bg-[#282a32] text-[#c7c4d7] hover:text-white text-left transition-colors border border-[#282a32]"
                  >
                    🏛️ "Explain the 4-layer architecture of this repository from routing to persistence."
                  </button>
                </div>
              </div>
            ) : (
              activeConversation.messages.map((msg, index) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id || index}
                    className={`flex items-start gap-3.5 max-w-4xl ${isUser ? "ml-auto justify-end" : ""}`}
                  >
                    {/* Assistant Avatar */}
                    {!isUser && (
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex-shrink-0 flex items-center justify-center text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.3)] mt-1">
                        <Bot className="w-5 h-5" />
                      </div>
                    )}

                    {/* Message Bubble Container */}
                    <div className={`space-y-2.5 max-w-3xl ${isUser ? "text-right" : ""}`}>
                      {/* Meta header */}
                      <div className={`flex items-center gap-2 text-xs text-[#908fa0] ${isUser ? "justify-end" : ""}`}>
                        <span className="font-semibold text-white">
                          {isUser ? "Lead Architect" : "CodeLens AI"}
                        </span>
                        {!isUser && (
                          <span className="px-2 py-0.5 rounded-full bg-[#191b24] text-cyan-400 border border-cyan-500/20 text-[10px] font-mono">
                            {msg.provider_used === "openrouter"
                              ? "OpenRouter: gpt-3.5-turbo"
                              : msg.model_used || "OpenRouter"}
                          </span>
                        )}
                        <span>•</span>
                        <span className="text-[11px]">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {msg.latency_ms && (
                          <span className="text-cyan-400 font-mono text-[10px]">
                            • {msg.latency_ms}ms
                          </span>
                        )}
                      </div>

                      {/* Content Card */}
                      <div
                        className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed text-left ${
                          isUser
                            ? "bg-indigo-600/90 text-white rounded-tr-none shadow-lg"
                            : "bg-[#11131b] border border-[#282a32] text-[#e2e1ed] rounded-tl-none shadow-md"
                        }`}
                      >
                        {/* Markdown / text formatting */}
                        <div className="space-y-3 whitespace-pre-wrap font-sans">
                          {msg.content}
                        </div>

                        {/* Referenced Citations Badges */}
                        {!isUser && msg.citations && msg.citations.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-[#282a32]">
                            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#908fa0] block mb-2">
                              Referenced Codebase Citations:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {msg.citations.map((cit, cIdx) => {
                                const cColors = getLayerColor(cit.layer);
                                return (
                                  <button
                                    key={cit.id || cIdx}
                                    onClick={() => {
                                      setActiveCitation(cit);
                                      setShowRightInspector(true);
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${cColors.bg} ${cColors.text} ${cColors.border} hover:scale-[1.02]`}
                                    title="Click to inspect symbol & code snippet"
                                  >
                                    <span>@{cit.file_path.split("/").pop()}:{cit.symbol_name || "symbol"}</span>
                                    <span className="text-cyan-300 font-sans text-[10px] font-semibold">
                                      {cit.match_percentage}%
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Cross-Feature Action CTAs */}
                        {!isUser && (
                          <div className="mt-4 pt-3 border-t border-[#282a32] flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {onNavigateToGraph && (
                                <button
                                  onClick={() => onNavigateToGraph(msg.citations?.[0]?.file_path)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:opacity-90 text-white font-medium text-xs shadow-[0_0_12px_rgba(99,102,241,0.25)] transition-all"
                                >
                                  <Network className="w-3.5 h-3.5" />
                                  <span>Trace in 3D Canvas</span>
                                </button>
                              )}
                              {onNavigateToImpact && (
                                <button
                                  onClick={() => onNavigateToImpact(msg.citations?.[0]?.symbol_name)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#191b24] hover:bg-[#282a32] text-[#c7c4d7] hover:text-white text-xs border border-[#282a32] transition-colors"
                                >
                                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                                  <span>Calculate Blast Radius</span>
                                </button>
                              )}
                            </div>

                            {/* Feedback & Share Buttons */}
                            <div className="flex items-center gap-1 text-[#908fa0]">
                              <button
                                onClick={() =>
                                  submitFeedback(repoId, activeConversation.id, msg.id, "helpful", projectId)
                                }
                                className={`p-1 rounded hover:bg-[#191b24] transition-colors ${
                                  msg.feedback === "helpful" ? "text-emerald-400" : "hover:text-white"
                                }`}
                                title="Helpful"
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  submitFeedback(repoId, activeConversation.id, msg.id, "reported", projectId)
                                }
                                className={`p-1 rounded hover:bg-[#191b24] transition-colors ${
                                  msg.feedback === "reported" ? "text-rose-400" : "hover:text-white"
                                }`}
                                title="Report Issue"
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleCopyMarkdown(msg.content, msg.id)}
                                className="p-1 rounded hover:bg-[#191b24] hover:text-white transition-colors"
                                title="Copy answer"
                              >
                                {copiedAnswerId === msg.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Share2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Suggested Inquiries Chips */}
                      {!isUser && msg.suggested_inquiries && msg.suggested_inquiries.length > 0 && (
                        <div className="pt-1 space-y-1.5">
                          <span className="text-[11px] font-semibold text-[#908fa0] uppercase tracking-wider block">
                            Suggested Inquiries:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {msg.suggested_inquiries.map((inq, iIdx) => (
                              <button
                                key={iIdx}
                                onClick={() => handleSendMessage(inq)}
                                className="px-3 py-1.5 rounded-full bg-[#11131b] hover:bg-[#191b24] text-xs text-[#c7c4d7] hover:text-cyan-300 border border-[#282a32] hover:border-cyan-500/30 transition-all flex items-center gap-1.5"
                              >
                                <span>{inq}</span>
                                <ArrowRight className="w-3 h-3 text-[#908fa0]" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* User Avatar */}
                    {isUser && (
                      <div className="w-9 h-9 rounded-xl bg-[#282a32] flex-shrink-0 flex items-center justify-center font-bold text-xs text-indigo-300 mt-1 shadow-inner">
                        MV
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {isSending && (
              <div className="flex items-start gap-3.5 max-w-xl">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.3)]">
                  <Bot className="w-5 h-5 animate-bounce" />
                </div>
                <div className="p-3.5 rounded-2xl bg-[#11131b] border border-[#282a32] text-xs text-[#908fa0] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                  <span>Synthesizing repository AST & cascading models...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Floating Bottom Input Deck */}
          <div className="p-4 bg-gradient-to-t from-[#0c0e16] via-[#0c0e16]/95 to-transparent flex-shrink-0 z-20">
            <div className="max-w-4xl mx-auto rounded-2xl bg-[#11131b] border border-[#282a32] focus-within:border-indigo-500 focus-within:shadow-[0_0_24px_rgba(99,102,241,0.2)] transition-all p-3">
              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder="Ask CodeLens AI about this repository, request architectural flows, or trace symbols... (⌘+Enter to send)"
                className="w-full bg-transparent text-white placeholder-[#908fa0] text-xs sm:text-sm focus:outline-none resize-none leading-relaxed"
              />

              {/* Bottom Toolbar */}
              <div className="flex items-center justify-between pt-2 border-t border-[#282a32] mt-1 text-xs">
                {/* Left contextual controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#191b24] text-xs text-[#c7c4d7]">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                    <span>Deep Repo RAG: <strong className="text-cyan-400">ON (4 Layers)</strong></span>
                  </div>

                  {/* Provider selector */}
                  <select
                    value={preferredProvider}
                    onChange={(e) => setPreferredProvider(e.target.value)}
                    className="bg-[#191b24] text-[#c7c4d7] text-xs px-2 py-1 rounded-lg border border-[#282a32] focus:outline-none"
                  >
                    <option value="auto">Auto (OpenRouter: gpt-3.5-turbo)</option>
                    <option value="openrouter">OpenRouter Primary</option>
                    <option value="gemini">Gemini 1.5 Pro</option>
                    <option value="openai">OpenAI GPT-4o</option>
                    <option value="grok">xAI Grok</option>
                    <option value="mock">Deterministic AST Fallback</option>
                  </select>
                </div>

                {/* Right submit button */}
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-[11px] text-[#908fa0] font-mono">⌘ + ↵ to run</span>
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim() || isSending}
                    className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.4)] transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* ========================================== */}
        {/* COLUMN C: CITATION & CONTEXT INSPECTOR     */}
        {/* ========================================== */}
        {showRightInspector && (
          <aside className="w-80 lg:w-96 flex-shrink-0 bg-[#0c0e16] border-l border-[#282a32] flex flex-col justify-between transition-all duration-300 z-20">
            {/* Top Inspector Header */}
            <div className="p-3.5 border-b border-[#282a32] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-white">
                  Retrieved Context & Citations
                </span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#191b24] text-cyan-400 font-mono">
                {activeCitation ? "1 Active" : "Overview"}
              </span>
            </div>

            {/* Inspector Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Tab Selector */}
              <div className="flex rounded-lg bg-[#11131b] p-1 border border-[#282a32]">
                <button
                  onClick={() => setActiveInspectorTab("symbol")}
                  className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeInspectorTab === "symbol" ? "bg-[#191b24] text-white" : "text-[#908fa0] hover:text-white"
                  }`}
                >
                  AST Symbol
                </button>
                <button
                  onClick={() => setActiveInspectorTab("snippet")}
                  className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeInspectorTab === "snippet" ? "bg-[#191b24] text-white" : "text-[#908fa0] hover:text-white"
                  }`}
                >
                  Code Snippet
                </button>
                <button
                  onClick={() => setActiveInspectorTab("relations")}
                  className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeInspectorTab === "relations" ? "bg-[#191b24] text-white" : "text-[#908fa0] hover:text-white"
                  }`}
                >
                  Relations
                </button>
              </div>

              {activeCitation ? (
                <div className="space-y-4">
                  {/* Symbol details card */}
                  <div className="p-3.5 rounded-xl bg-[#11131b] border border-[#282a32] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-[#908fa0]">
                        Active Ingestion
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-mono font-semibold ${
                          getLayerColor(activeCitation.layer).bg
                        } ${getLayerColor(activeCitation.layer).text}`}
                      >
                        {activeCitation.layer} Layer
                      </span>
                    </div>

                    <h4 className="text-sm font-mono font-semibold text-white">
                      {activeCitation.symbol_name || "Scope Entrypoint"}
                    </h4>

                    <p className="text-xs font-mono text-cyan-300 break-all">
                      {activeCitation.file_path}
                    </p>

                    <div className="flex items-center gap-2 pt-1 text-xs text-[#908fa0]">
                      <span>Lines: {activeCitation.line_start || 1}-{activeCitation.line_end || 50}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold">{activeCitation.match_percentage}% Match</span>
                    </div>
                  </div>

                  {/* Tab specific content */}
                  {activeInspectorTab === "symbol" && (
                    <div className="p-3.5 rounded-xl bg-[#11131b] border border-[#282a32] space-y-3">
                      <span className="text-xs font-semibold text-white block">AST Node Metadata</span>
                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex justify-between py-1 border-b border-[#282a32]">
                          <span className="text-[#908fa0]">Node Type</span>
                          <span className="text-white">AsyncFunctionDef</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[#282a32]">
                          <span className="text-[#908fa0]">Cyclomatic Complexity</span>
                          <span className="text-amber-400 font-semibold">4 (Low)</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[#282a32]">
                          <span className="text-[#908fa0]">Coupling Metric</span>
                          <span className="text-cyan-400">Afferent: 2 / Efferent: 3</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeInspectorTab === "snippet" && (
                    <div className="rounded-xl bg-[#11131b] border border-[#282a32] overflow-hidden">
                      <div className="px-3 py-2 bg-[#191b24] border-b border-[#282a32] flex items-center justify-between text-xs font-mono">
                        <span className="text-[#908fa0]">Python 3.11</span>
                        <button
                          onClick={() =>
                            handleCopyCode(
                              activeCitation.snippet || "# Code snippet",
                              activeCitation.id
                            )
                          }
                          className="flex items-center gap-1 text-[#908fa0] hover:text-white transition-colors"
                        >
                          {copiedCodeId === activeCitation.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>Copy</span>
                        </button>
                      </div>
                      <pre className="p-3 text-xs font-mono text-[#e2e1ed] overflow-x-auto leading-relaxed">
                        {activeCitation.snippet || `# Ingestion from ${activeCitation.file_path}\nasync def ${activeCitation.symbol_name || "execute"}():\n    pass`}
                      </pre>
                    </div>
                  )}

                  {activeInspectorTab === "relations" && (
                    <div className="p-3.5 rounded-xl bg-[#11131b] border border-[#282a32] space-y-3 text-xs">
                      <span className="font-semibold text-white block">Caller / Callee Hierarchy</span>
                      <div className="space-y-2">
                        <div className="p-2 rounded bg-[#191b24] border border-[#282a32]">
                          <span className="text-[10px] text-cyan-400 uppercase font-bold block mb-1">
                            Upstream Callers
                          </span>
                          <span className="font-mono text-white">api.v1.auth.login()</span>
                        </div>
                        <div className="p-2 rounded bg-[#191b24] border border-[#282a32]">
                          <span className="text-[10px] text-purple-400 uppercase font-bold block mb-1">
                            Downstream Callees
                          </span>
                          <span className="font-mono text-white">repositories.user_repo.get_by_email()</span>
                          <span className="font-mono text-white block mt-1">core.security.create_session_tokens()</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Deep Jump Action */}
                  {onNavigateToGraph && (
                    <button
                      onClick={() => onNavigateToGraph(activeCitation.file_path)}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:opacity-90 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(99,102,241,0.25)] transition-all"
                    >
                      <Network className="w-4 h-4" />
                      <span>Jump to Node in 3D Canvas</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#908fa0] space-y-2">
                  <Cpu className="w-8 h-8 mx-auto text-[#464554]" />
                  <p>Click any codebase citation chip in the chat to inspect AST details, lines, and relations.</p>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
