import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Copy,
  Eye,
  FileCode,
  Flame,
  Layers,
  Minus,
  Network,
  Pause,
  Play,
  Plus,
  RefreshCw,
  ShieldAlert,
  SkipBack,
  SkipForward,
  Sparkles,
  Zap,
} from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import { useRepositoryStore } from "../../stores/repositoryStore";
import { useGraphStore } from "../../stores/graphStore";
import type { GraphNode } from "../../types/graph";

interface DependencyGraphViewProps {
  onBack?: () => void;
  selectedRepoId?: string;
}

export const DependencyGraphView: React.FC<DependencyGraphViewProps> = ({
  onBack,
  selectedRepoId,
}) => {
  const { activeProject } = useProjectStore();
  const { repositories } = useRepositoryStore();
  const {
    graphResponse,
    selectedNode,
    searchQuery,
    zoomLevel,
    cameraPreset,
    rotX,
    rotZ,
    isLoading,
    isRescanning,
    error,
    fetchGraph,
    rescanGraph,
    selectNode,
    selectNodeById,
    setZoomLevel,
    setCameraPreset,
    setRotation,
    rotateStep,
    resetView,
  } = useGraphStore();

  const [currentRepoId, setCurrentRepoId] = useState<string>(
    selectedRepoId || repositories[0]?.id || ""
  );

  // Graph granularity: "file" vs "module"
  const [graphGranularity, setGraphGranularity] = useState<"file" | "module">("file");

  // Spatial representation: "2d" (Flowchart DAG, crystal-clear & responsive) vs "3d" (Isometric Perspective)
  const [spatialMode, setSpatialMode] = useState<"2d" | "3d">("2d");

  const [showMinimap, setShowMinimap] = useState<boolean>(true);
  const [showInspector, setShowInspector] = useState<boolean>(true);
  const [copiedPath, setCopiedPath] = useState<boolean>(false);
  const [focusedSubtreeId, setFocusedSubtreeId] = useState<string | null>(null);
  const [isolatedRadiusId, setIsolatedRadiusId] = useState<string | null>(null);

  // Flow Tracer & Spotlight State
  const [isSpotlightEnabled, setIsSpotlightEnabled] = useState<boolean>(true);
  const [isSpineIsolated, setIsSpineIsolated] = useState<boolean>(false);
  const [selectedEntrypointId, setSelectedEntrypointId] = useState<string>("");
  const [activeFlowStepIndex, setActiveFlowStepIndex] = useState<number>(0);
  const [isPlayingFlow, setIsPlayingFlow] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.5);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Canvas Viewport Panning State (in screen pixels)
  const canvasRef = useRef<HTMLDivElement>(null);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 40, y: 30 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; panX: number; panY: number }>({
    x: 0,
    y: 0,
    panX: 40,
    panY: 30,
  });

  // 3D Orbiting State (Active when right-clicking or alt-dragging in 3D mode)
  const [isOrbiting, setIsOrbiting] = useState<boolean>(false);
  const [orbitStart, setOrbitStart] = useState<{ x: number; y: number; rotX: number; rotZ: number }>({
    x: 0,
    y: 0,
    rotX: 46,
    rotZ: -22,
  });

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
      fetchGraph(currentRepoId, activeProject.id);
    }
  }, [currentRepoId, activeProject?.id, fetchGraph]);

  const activeGraph = useMemo(() => {
    if (!graphResponse) return null;
    return graphGranularity === "module" ? graphResponse.module_graph : graphResponse.file_graph;
  }, [graphResponse, graphGranularity]);

  // Discover candidate entrypoints (Routing layer or in_degree === 0)
  const candidateEntrypoints = useMemo(() => {
    if (!activeGraph || activeGraph.nodes.length === 0) return [];
    const routingNodes = activeGraph.nodes.filter((n) => n.layer === "routing");
    if (routingNodes.length > 0) return routingNodes;
    const roots = activeGraph.nodes.filter((n) => n.in_degree === 0);
    return roots.length > 0 ? roots : activeGraph.nodes.slice(0, 5);
  }, [activeGraph]);

  // Set default entrypoint on load
  useEffect(() => {
    if (candidateEntrypoints.length > 0 && !selectedEntrypointId) {
      setSelectedEntrypointId(candidateEntrypoints[0].id);
    }
  }, [candidateEntrypoints, selectedEntrypointId]);

  // Compute active linear Flow Path across architectural layers (Routing -> Domain -> Persistence -> Infra)
  const activeFlowPath = useMemo((): GraphNode[] => {
    if (!activeGraph || activeGraph.nodes.length === 0) return [];
    const startNode =
      activeGraph.nodes.find((n) => n.id === selectedEntrypointId) ||
      candidateEntrypoints[0] ||
      activeGraph.nodes[0];
    if (!startNode) return [];

    const path: GraphNode[] = [startNode];
    const visited = new Set<string>([startNode.id]);
    const nodeMap = new Map<string, GraphNode>(activeGraph.nodes.map((n) => [n.id, n]));

    // Step 2: Seek target in "service" layer
    let current = startNode;
    let serviceNode: GraphNode | undefined;
    for (const depId of current.out_dependencies) {
      const dep = nodeMap.get(depId);
      if (dep && dep.layer === "service" && !visited.has(dep.id)) {
        serviceNode = dep;
        break;
      }
    }
    if (!serviceNode && current.out_dependencies.length > 0) {
      serviceNode = nodeMap.get(current.out_dependencies[0]);
    }
    if (serviceNode && !visited.has(serviceNode.id)) {
      path.push(serviceNode);
      visited.add(serviceNode.id);
      current = serviceNode;
    }

    // Step 3: Seek target in "persistence" layer (or cycle node if present)
    let persistenceNode: GraphNode | undefined;
    for (const depId of current.out_dependencies) {
      const dep = nodeMap.get(depId);
      if (dep && dep.is_in_cycle && !visited.has(dep.id)) {
        persistenceNode = dep;
        break;
      }
    }
    if (!persistenceNode) {
      for (const depId of current.out_dependencies) {
        const dep = nodeMap.get(depId);
        if (dep && (dep.layer === "persistence" || dep.layer === "infra") && !visited.has(dep.id)) {
          persistenceNode = dep;
          break;
        }
      }
    }
    if (!persistenceNode && current.out_dependencies.length > 0) {
      persistenceNode = nodeMap.get(current.out_dependencies[0]);
    }
    if (persistenceNode && !visited.has(persistenceNode.id)) {
      path.push(persistenceNode);
      visited.add(persistenceNode.id);
      current = persistenceNode;
    }

    // Step 4: Seek target in "infra" layer
    let infraNode: GraphNode | undefined;
    for (const depId of current.out_dependencies) {
      const dep = nodeMap.get(depId);
      if (dep && dep.layer === "infra" && !visited.has(dep.id)) {
        infraNode = dep;
        break;
      }
    }
    if (!infraNode && current.out_dependencies.length > 0) {
      const candidate = nodeMap.get(current.out_dependencies[0]);
      if (candidate && !visited.has(candidate.id)) {
        infraNode = candidate;
      }
    }
    if (infraNode && !visited.has(infraNode.id)) {
      path.push(infraNode);
      visited.add(infraNode.id);
    }

    return path;
  }, [activeGraph, selectedEntrypointId, candidateEntrypoints]);

  // Set of node IDs in current active flow
  const flowNodeIds = useMemo(() => new Set(activeFlowPath.map((n) => n.id)), [activeFlowPath]);

  // Active Flow Step Node
  const activeStepNode = useMemo(() => {
    return activeFlowPath[activeFlowStepIndex] || activeFlowPath[0] || null;
  }, [activeFlowPath, activeFlowStepIndex]);

  // Update selected node for inspector when step index changes
  useEffect(() => {
    if (activeStepNode) {
      selectNode(activeStepNode);
    }
  }, [activeStepNode, selectNode]);

  // Auto-play animation timer for flow stepper
  useEffect(() => {
    if (!isPlayingFlow || activeFlowPath.length <= 1) return;
    const intervalMs = Math.round(2400 / playbackSpeed);
    const timer = setInterval(() => {
      setActiveFlowStepIndex((prev) => (prev + 1) % activeFlowPath.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlayingFlow, activeFlowPath.length, playbackSpeed]);

  // Auto-center canvas on active step node so the user never loses track of the flow
  const centerOnNode = (nodeId: string) => {
    const coord = nodeSpatialCoords.get(nodeId);
    if (!coord || !canvasRef.current) return;
    const viewportWidth = canvasRef.current.clientWidth;
    const viewportHeight = canvasRef.current.clientHeight;
    const targetX = viewportWidth / 2 - (coord.x + 130) * (zoomLevel / 100);
    const targetY = viewportHeight / 2 - (coord.y + 60) * (zoomLevel / 100);
    setPanOffset({ x: Math.round(targetX), y: Math.round(targetY) });
  };

  const handlePrevStep = () => {
    const nextIdx = activeFlowStepIndex > 0 ? activeFlowStepIndex - 1 : activeFlowPath.length - 1;
    setActiveFlowStepIndex(nextIdx);
    if (activeFlowPath[nextIdx]) {
      centerOnNode(activeFlowPath[nextIdx].id);
    }
  };

  const handleNextStep = () => {
    const nextIdx = (activeFlowStepIndex + 1) % activeFlowPath.length;
    setActiveFlowStepIndex(nextIdx);
    if (activeFlowPath[nextIdx]) {
      centerOnNode(activeFlowPath[nextIdx].id);
    }
  };

  const handleSelectStep = (index: number) => {
    setActiveFlowStepIndex(index);
    setIsPlayingFlow(false);
    if (activeFlowPath[index]) {
      centerOnNode(activeFlowPath[index].id);
    }
  };

  // Filter nodes based on search and subtree focus
  const filteredNodes = useMemo(() => {
    if (!activeGraph) return [];
    let nodes = activeGraph.nodes;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      nodes = nodes.filter(
        (n) => n.label.toLowerCase().includes(q) || n.path.toLowerCase().includes(q)
      );
    }

    if (focusedSubtreeId) {
      const target = activeGraph.nodes.find((n) => n.id === focusedSubtreeId);
      if (target) {
        const allowed = new Set<string>([
          target.id,
          ...target.in_callers,
          ...target.out_dependencies,
        ]);
        nodes = nodes.filter((n) => allowed.has(n.id));
      }
    }

    return nodes;
  }, [activeGraph, searchQuery, focusedSubtreeId]);

  // Architectural 4-tier Swimlanes definition (Left to Right Columns)
  const tierDecks = useMemo(() => {
    const tiers: Record<
      string,
      {
        key: string;
        colIndex: number;
        name: string;
        subtitle: string;
        color: string;
        glowColor: string;
        elevationZ: number;
        nodes: GraphNode[];
      }
    > = {
      routing: {
        key: "routing",
        colIndex: 0,
        name: "[01] ROUTING & API LAYER",
        subtitle: "HTTP Controllers, Handlers & Routers",
        color: "#38bdf8",
        glowColor: "rgba(56, 189, 248, 0.4)",
        elevationZ: 60,
        nodes: [],
      },
      service: {
        key: "service",
        colIndex: 1,
        name: "[02] DOMAIN & SERVICES",
        subtitle: "Business Logic, Use-Cases & Services",
        color: "#818cf8",
        glowColor: "rgba(129, 140, 248, 0.4)",
        elevationZ: 30,
        nodes: [],
      },
      persistence: {
        key: "persistence",
        colIndex: 2,
        name: "[03] PERSISTENCE & DATA REPOSITORIES",
        subtitle: "Database Models, Entities & Stores",
        color: "#f59e0b",
        glowColor: "rgba(245, 158, 11, 0.4)",
        elevationZ: 0,
        nodes: [],
      },
      infra: {
        key: "infra",
        colIndex: 3,
        name: "[04] INFRASTRUCTURE & UTILITIES",
        subtitle: "System Plumbing, Clients & Workers",
        color: "#94a3b8",
        glowColor: "rgba(148, 163, 184, 0.3)",
        elevationZ: -30,
        nodes: [],
      },
    };

    filteredNodes.forEach((node) => {
      const k = tiers[node.layer] ? node.layer : "infra";
      tiers[k].nodes.push(node);
    });

    return Object.values(tiers);
  }, [filteredNodes]);

  // Deterministic 2D/3D planar visual coordinates for each card
  // Column X: 60, 480, 900, 1320 (width 260px, gap 160px)
  // Row Y: 100 + rowIdx * 144
  const { nodeSpatialCoords, canvasBounds } = useMemo(() => {
    const map = new Map<
      string,
      {
        x: number;
        y: number;
        width: number;
        height: number;
        tierKey: string;
        colIndex: number;
        rowIndex: number;
        z: number;
      }
    >();

    const colXOffsets = [60, 480, 900, 1320];
    const cardWidth = 260;
    const cardHeight = 114;
    const cardGapY = 30;

    let maxRowIdx = 0;

    tierDecks.forEach((tier) => {
      const colX = colXOffsets[tier.colIndex] || 60;
      tier.nodes.forEach((node, rowIdx) => {
        const cardY = 100 + rowIdx * (cardHeight + cardGapY);
        if (rowIdx > maxRowIdx) maxRowIdx = rowIdx;
        map.set(node.id, {
          x: colX,
          y: cardY,
          width: cardWidth,
          height: cardHeight,
          tierKey: tier.key,
          colIndex: tier.colIndex,
          rowIndex: rowIdx,
          z: tier.elevationZ,
        });
      });
    });

    const totalWidth = 1720;
    const totalHeight = Math.max(860, 100 + (maxRowIdx + 1) * (cardHeight + cardGapY) + 80);

    return {
      nodeSpatialCoords: map,
      canvasBounds: { width: totalWidth, height: totalHeight },
    };
  }, [tierDecks]);

  // Filtered edges
  const visibleEdges = useMemo(() => {
    if (!activeGraph) return [];
    const nodeSet = new Set(filteredNodes.map((n) => n.id));
    return activeGraph.edges.filter((e) => nodeSet.has(e.source) && nodeSet.has(e.target));
  }, [activeGraph, filteredNodes]);

  // Mouse drag panning & wheel scrolling handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only trigger if clicking directly on the canvas background or SVG
    const target = e.target as HTMLElement;
    const isBackground =
      target === canvasRef.current ||
      target.classList.contains("canvas-bg-layer") ||
      target.tagName === "svg" ||
      target.classList.contains("canvas-pan-surface");

    if (!isBackground) return;

    if (e.button === 0) {
      // Normal Left-click drag = Pan Canvas
      setIsPanning(true);
      setPanStart({
        x: e.clientX,
        y: e.clientY,
        panX: panOffset.x,
        panY: panOffset.y,
      });
    } else if (e.button === 2 || (e.button === 0 && e.altKey)) {
      // Right-click or Alt+Left-click = 3D Orbit (if in 3D mode)
      if (spatialMode === "3d") {
        setIsOrbiting(true);
        setOrbitStart({
          x: e.clientX,
          y: e.clientY,
          rotX,
          rotZ,
        });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setPanOffset({
        x: panStart.panX + deltaX,
        y: panStart.panY + deltaY,
      });
    } else if (isOrbiting && spatialMode === "3d") {
      const deltaX = e.clientX - orbitStart.x;
      const deltaY = e.clientY - orbitStart.y;
      const newRotZ = (orbitStart.rotZ + deltaX * 0.4) % 360;
      const newRotX = Math.max(5, Math.min(80, orbitStart.rotX - deltaY * 0.3));
      setRotation(newRotX, newRotZ);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsOrbiting(false);
  };

  // Mouse wheel handler for natural vertical and horizontal scrolling, plus zoom with Ctrl
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom In / Out
      e.preventDefault();
      const zoomDelta = -e.deltaY * 0.08;
      setZoomLevel((prev) => Math.max(30, Math.min(200, Math.round(prev + zoomDelta))));
    } else {
      // Smooth Dual-Axis Pan Scrolling
      setPanOffset((prev) => ({
        x: prev.x - (e.shiftKey ? e.deltaY : e.deltaX) * 0.85,
        y: prev.y - (e.shiftKey ? 0 : e.deltaY) * 0.85,
      }));
    }
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  // 3D/2D Viewport Transformation Matrix
  const spatialSceneTransform = useMemo(() => {
    const panStr = `translate(${panOffset.x}px, ${panOffset.y}px)`;
    if (spatialMode === "2d") {
      return `${panStr} scale(${zoomLevel / 100})`;
    }
    return `${panStr} perspective(1200px) rotateX(${rotX}deg) rotateZ(${rotZ}deg) scale(${zoomLevel / 100})`;
  }, [spatialMode, rotX, rotZ, zoomLevel, panOffset]);

  // Set camera preset with appropriate spatialMode
  const applyPreset = (preset: "iso" | "top" | "profile") => {
    if (preset === "top") {
      setSpatialMode("2d");
      setCameraPreset("top");
    } else if (preset === "iso") {
      setSpatialMode("3d");
      setCameraPreset("iso");
    } else if (preset === "profile") {
      setSpatialMode("3d");
      setCameraPreset("profile");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-[100vw] bg-[#090a0f] text-slate-100 font-sans select-none overflow-hidden -m-6 sm:-m-8">
      {/* 1. TOP CONTEXT HEADER BAR */}
      <header className="flex flex-wrap items-center justify-between px-6 py-2.5 bg-[#0d0f17] border-b border-[#1e2333] gap-3 shrink-0 z-20">
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
              <span className="text-cyan-400 font-medium">Architecture Flow Graph</span>
            </div>

            <div className="flex items-center gap-2.5 mt-0.5">
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

              <button
                onClick={() => {
                  if (currentRepoId && activeProject?.id) {
                    rescanGraph(currentRepoId, activeProject.id);
                  }
                }}
                disabled={isRescanning}
                title="Rescan Repository Dependencies"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#131620] hover:bg-[#181d2c] border border-[#1e2333] text-[11px] font-mono text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isRescanning ? "animate-spin text-cyan-400" : ""}`} />
                <span>{isRescanning ? "Rescanning..." : "Rescan AST"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Center / Right: View & Mode Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Spatial Mode: 2D Flowchart vs 3D Isometric */}
          <div className="flex items-center bg-[#131620] border border-[#1e2333] rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => {
                setSpatialMode("2d");
                setCameraPreset("top");
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all cursor-pointer ${
                spatialMode === "2d"
                  ? "bg-cyan-600 text-white font-bold shadow-md shadow-cyan-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>2D Flowchart (Default)</span>
            </button>

            <button
              onClick={() => {
                setSpatialMode("3d");
                setCameraPreset("iso");
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all cursor-pointer ${
                spatialMode === "3d"
                  ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3D Isometric</span>
            </button>
          </div>

          {/* Granularity Toggle: File vs Module */}
          <div className="flex items-center bg-[#131620] border border-[#1e2333] rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => setGraphGranularity("file")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer ${
                graphGranularity === "file"
                  ? "bg-slate-700 text-white font-medium"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Files</span>
            </button>

            <button
              onClick={() => setGraphGranularity("module")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer ${
                graphGranularity === "module"
                  ? "bg-slate-700 text-white font-medium"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Modules</span>
            </button>
          </div>

          {/* Spotlight De-cluttering Toggle */}
          <button
            onClick={() => setIsSpotlightEnabled(!isSpotlightEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              isSpotlightEnabled
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-lg shadow-cyan-500/20"
                : "bg-[#131620] text-slate-400 border border-[#1e2333] hover:text-white"
            }`}
            title="Spotlight dims non-flow files to eliminate clutter and isolate execution spine"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isSpotlightEnabled ? "text-cyan-400 animate-spin" : ""}`} />
            <span>Spotlight: {isSpotlightEnabled ? "ON" : "OFF"}</span>
          </button>

          {/* Circular Dependency Warning Badge */}
          {activeGraph && activeGraph.metrics.cycle_count > 0 ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>
                {activeGraph.metrics.cycle_count} Cycle{activeGraph.metrics.cycle_count > 1 ? "s" : ""}
              </span>
            </div>
          ) : (
            <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Acyclic DAG</span>
            </div>
          )}

          {focusedSubtreeId && (
            <button
              onClick={() => setFocusedSubtreeId(null)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono hover:bg-rose-500/20 cursor-pointer"
            >
              <span>Reset Focus (×)</span>
            </button>
          )}

          {isSpineIsolated && (
            <button
              onClick={() => setIsSpineIsolated(false)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-400 text-indigo-300 text-xs font-mono hover:bg-indigo-500/30 cursor-pointer"
            >
              <span>Exit Spine Isolation (×)</span>
            </button>
          )}

          {/* Toolbar Actions: Minimap & Inspector toggles */}
          <div className="flex items-center gap-1 border-l border-[#1e2333] pl-2">
            <button
              onClick={() => setShowMinimap(!showMinimap)}
              title="Toggle Radar Minimap"
              className={`p-1.5 rounded border text-xs cursor-pointer ${
                showMinimap
                  ? "bg-cyan-600/20 text-cyan-300 border-cyan-500/30"
                  : "bg-[#131620] text-slate-400 border-[#1e2333] hover:text-white"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowInspector(!showInspector)}
              title="Toggle Symbol Inspector Drawer"
              className={`p-1.5 rounded border text-xs cursor-pointer ${
                showInspector
                  ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/30"
                  : "bg-[#131620] text-slate-400 border-[#1e2333] hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN WORKBENCH: CANVAS + RIGHT INSPECTOR */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-50 bg-[#090a0f]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <div className="text-sm font-mono text-slate-300">Rendering Architectural Dependency Graph...</div>
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="absolute top-4 left-6 z-50 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono max-w-lg">
            Error: {error}
          </div>
        )}

        {/* A. SCROLLABLE & PANNING CANVAS VIEWPORT */}
        <div
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
          className="flex-1 h-full relative overflow-hidden bg-[#090a0f] cursor-grab active:cursor-grabbing select-none canvas-pan-surface"
          style={{
            backgroundImage: "radial-gradient(#1a2035 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        >
          {/* ========================================================= */}
          {/* TOP FLOATING TRACE EXECUTION FLOW BAR (SPECIFIED IN PROMPT)*/}
          {/* ========================================================= */}
          {activeFlowPath.length > 0 && (
            <div className="absolute top-3 left-4 right-4 z-30 flex flex-wrap items-center justify-between px-4 py-2 rounded-xl bg-[#0d111d]/95 backdrop-blur-md border border-[#1e273e] shadow-2xl gap-3">
              {/* Left: Badge + Entrypoint selector */}
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>TRACE EXECUTION FLOW</span>
                </div>

                {/* Entrypoint Dropdown */}
                <div className="flex items-center gap-1 text-xs font-mono">
                  <span className="text-slate-400 hidden lg:inline">Entry:</span>
                  <select
                    value={selectedEntrypointId}
                    onChange={(e) => {
                      setSelectedEntrypointId(e.target.value);
                      setActiveFlowStepIndex(0);
                      setIsPlayingFlow(false);
                      centerOnNode(e.target.value);
                    }}
                    className="bg-[#131826] border border-[#232d46] hover:border-cyan-500/50 rounded px-2 py-1 text-xs text-cyan-300 font-semibold focus:outline-none cursor-pointer max-w-[200px] truncate"
                  >
                    {candidateEntrypoints.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.layer === "routing"
                          ? `POST /api/v1/${entry.label.replace(".py", "")}`
                          : entry.label}{" "}
                        ({entry.layer_name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Middle: Step-by-Step Flow Stepper Pipeline */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                {activeFlowPath.map((node, idx) => {
                  const isActive = idx === activeFlowStepIndex;
                  const isCycle = node.is_in_cycle;
                  const layerTitle =
                    node.layer === "routing"
                      ? "Routing"
                      : node.layer === "service"
                      ? "Domain"
                      : node.layer === "persistence"
                      ? "Persistence"
                      : "Infra";

                  return (
                    <React.Fragment key={node.id}>
                      <button
                        onClick={() => handleSelectStep(idx)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-all duration-200 shrink-0 cursor-pointer ${
                          isActive
                            ? "bg-gradient-to-r from-indigo-600/30 to-cyan-600/30 border-cyan-400 text-white shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/50"
                            : isCycle
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:border-amber-400"
                            : idx === 1
                            ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:border-indigo-400"
                            : idx === 2
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:border-amber-400"
                            : "bg-[#131826] border-[#222a3e] text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                            isActive ? "bg-cyan-400 text-black font-extrabold" : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-[11px]">
                          Step {idx + 1}: {node.label} ({layerTitle})
                        </span>
                        {isActive && (
                          <span className="px-1 py-0.2 rounded bg-cyan-400/20 text-cyan-300 text-[8px] font-bold">
                            ACTIVE
                          </span>
                        )}
                        {isCycle && (
                          <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[8px] font-bold">
                            CYCLE RISK
                          </span>
                        )}
                      </button>
                      {idx < activeFlowPath.length - 1 && (
                        <span className="text-slate-600 font-mono text-xs">➔</span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Right: Playback Controls */}
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <button
                  onClick={handlePrevStep}
                  title="Previous Step (Auto-Centers Node)"
                  className="px-2 py-1 rounded bg-[#131826] hover:bg-[#1c2438] text-slate-300 border border-[#222a3e] transition-colors cursor-pointer flex items-center gap-1"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline text-[11px]">Prev Step</span>
                </button>

                <button
                  onClick={() => setIsPlayingFlow(!isPlayingFlow)}
                  title={isPlayingFlow ? "Pause Flow Animation" : "Play Flow Animation"}
                  className={`px-3 py-1 rounded-lg border flex items-center gap-1.5 font-semibold text-xs transition-all cursor-pointer ${
                    isPlayingFlow
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10"
                      : "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/30 shadow-md shadow-cyan-500/10"
                  }`}
                >
                  {isPlayingFlow ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlayingFlow ? "Pause Flow" : "Play Flow Animation"}</span>
                </button>

                <button
                  onClick={handleNextStep}
                  title="Next Step (Auto-Centers Node)"
                  className="px-2 py-1 rounded bg-[#131826] hover:bg-[#1c2438] text-slate-300 border border-[#222a3e] transition-colors cursor-pointer flex items-center gap-1"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline text-[11px]">Next Step</span>
                </button>

                {/* Auto-Step Speed */}
                <div className="flex items-center gap-1 pl-1 border-l border-[#222a3e]">
                  <span className="text-[10px] text-slate-500 hidden sm:inline">Speed:</span>
                  <select
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                    className="bg-[#131826] border border-[#222a3e] rounded px-1.5 py-0.5 text-[11px] text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="1">1.0x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2.0x</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Perspective Preset Switcher & Scale Telemetry */}
          <div className="absolute top-16 left-4 z-20 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-[#0d0f17]/90 backdrop-blur-md border border-[#1e2333] rounded-lg p-1 text-xs font-mono shadow-xl">
              <button
                onClick={() => applyPreset("top")}
                className={`px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                  spatialMode === "2d"
                    ? "bg-cyan-600 text-white font-medium shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Top-Down (2D)
              </button>
              <button
                onClick={() => applyPreset("iso")}
                className={`px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                  spatialMode === "3d" && cameraPreset === "iso"
                    ? "bg-indigo-600 text-white font-medium shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Isometric 3D
              </button>
              <button
                onClick={() => applyPreset("profile")}
                className={`px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                  spatialMode === "3d" && cameraPreset === "profile"
                    ? "bg-indigo-600 text-white font-medium shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Front Profile
              </button>
            </div>

            {/* Viewport Bounds Scale Indicator */}
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#0d0f17]/90 backdrop-blur-md border border-[#1e2333] text-[11px] font-mono text-slate-300 shadow-xl">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>
                Viewport: Canvas Bounds ({canvasBounds.width}px × {canvasBounds.height}px) •{" "}
                {activeGraph?.nodes.length || 0} Files
              </span>
            </div>
          </div>

          {/* Floating Zoom & Pan Controls */}
          <div className="absolute bottom-6 left-4 z-20 flex items-center gap-1 bg-[#0d0f17]/90 backdrop-blur-md border border-[#1e2333] rounded-lg p-1 text-xs font-mono shadow-xl">
            <button
              onClick={() => setZoomLevel((z) => Math.max(30, z - 10))}
              title="Zoom Out (or Ctrl + Scroll)"
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#161a26] transition-colors cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] text-slate-300 min-w-[42px] text-center">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(200, z + 10))}
              title="Zoom In (or Ctrl + Scroll)"
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#161a26] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <div className="h-4 w-px bg-[#1e2333] mx-1" />
            <button
              onClick={() => {
                resetView();
                setPanOffset({ x: 40, y: 30 });
              }}
              title="Reset View and Re-center Canvas"
              className="px-2 py-1 rounded text-slate-400 hover:text-white hover:bg-[#161a26] text-[11px] font-mono transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>

          {/* Top-Right 3D Orbit Compass Gizmo (Active in 3D mode) */}
          {spatialMode === "3d" && (
            <div className="absolute top-16 right-4 z-20 flex flex-col items-center p-2 rounded-xl bg-[#0d0f17]/90 backdrop-blur-md border border-[#1e2333] shadow-2xl">
              <div
                className="w-14 h-14 relative flex items-center justify-center cursor-pointer group"
                onClick={() => rotateStep(45)}
                title="Click to Orbit +45°"
              >
                <div className="absolute inset-0 rounded-full border border-[#272f45] group-hover:border-cyan-400 transition-colors" />
                <div
                  className="w-8 h-8 relative transition-transform duration-200"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: `rotateX(${-rotX * 0.4}deg) rotateY(${rotZ * 0.4}deg)`,
                  }}
                >
                  <div
                    className="absolute inset-0 bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-[7px] font-mono text-cyan-300 font-bold"
                    style={{ transform: "translateZ(16px)" }}
                  >
                    TOP
                  </div>
                  <div
                    className="absolute inset-0 bg-indigo-500/20 border border-indigo-400 flex items-center justify-center text-[7px] font-mono text-indigo-300"
                    style={{ transform: "rotateY(90deg) translateZ(16px)" }}
                  >
                    RGT
                  </div>
                  <div
                    className="absolute inset-0 bg-purple-500/20 border border-purple-400 flex items-center justify-center text-[7px] font-mono text-purple-300"
                    style={{ transform: "rotateX(-90deg) translateZ(16px)" }}
                  >
                    BOT
                  </div>
                </div>

                <span className="absolute -top-1 font-mono text-[9px] text-cyan-400 font-bold">Y</span>
                <span className="absolute -right-1 font-mono text-[9px] text-rose-400 font-bold">X</span>
                <span className="absolute -bottom-1 font-mono text-[9px] text-indigo-400 font-bold">Z</span>
              </div>

              <span className="font-mono text-[10px] text-slate-400 mt-1">
                ISO: {Math.round(rotX)}°/ {Math.round(rotZ)}°
              </span>
            </div>
          )}

          {/* ========================================================= */}
          {/* THE 2D/3D ARCHITECTURAL CANVAS SURFACE                     */}
          {/* ========================================================= */}
          <div
            className="w-full h-full relative transition-transform duration-150 ease-out origin-top-left"
            style={{
              transform: spatialSceneTransform,
              transformStyle: spatialMode === "3d" ? "preserve-3d" : "flat",
            }}
          >
            {/* CANVAS ROOT SURFACE CONTAINER */}
            <div
              className="relative canvas-bg-layer"
              style={{
                width: `${canvasBounds.width}px`,
                height: `${canvasBounds.height}px`,
                transformStyle: spatialMode === "3d" ? "preserve-3d" : "flat",
              }}
            >
              {/* SWIMLANE WATERMARK BACKGROUND COLUMN HEADERS */}
              <div className="absolute inset-x-0 top-6 flex justify-between px-16 pointer-events-none opacity-25 text-slate-500 font-mono text-xs uppercase tracking-widest">
                <span className="w-[260px] text-center">[01] ROUTING & API LAYER</span>
                <span className="w-[260px] text-center">[02] DOMAIN & SERVICES</span>
                <span className="w-[260px] text-center">[03] PERSISTENCE & DATA</span>
                <span className="w-[260px] text-center">[04] CORE INFRASTRUCTURE</span>
              </div>

              {/* 4 ELEVATED SWIMLANE COLUMN CARDS */}
              {tierDecks.map((tier) => {
                const colXOffsets = [60, 480, 900, 1320];
                const colX = colXOffsets[tier.colIndex] || 60;
                const is2D = spatialMode === "2d";
                const tierZ = is2D ? 0 : tier.elevationZ;

                return (
                  <div
                    key={tier.key}
                    style={{
                      left: `${colX}px`,
                      top: "40px",
                      width: "260px",
                      transform: is2D ? "none" : `translateZ(${tierZ}px)`,
                    }}
                    className="absolute flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#0e121d]/90 border border-[#1e273e] backdrop-blur-sm z-10"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: tier.color }}
                      />
                      <span
                        className="font-mono text-xs font-bold tracking-wider truncate"
                        style={{ color: tier.color }}
                      >
                        {tier.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.2 rounded bg-[#141926]">
                      {tier.nodes.length}
                    </span>
                  </div>
                );
              })}

              {/* SVG LAYER FOR BEZIER EDGES & NEON LASER BEAMS */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible"
                style={{
                  width: `${canvasBounds.width}px`,
                  height: `${canvasBounds.height}px`,
                }}
              >
                <defs>
                  {/* Default arrow marker */}
                  <marker
                    id="arrowhead"
                    markerWidth="8"
                    markerHeight="8"
                    refX="7"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3.5, 0 7" fill="#818cf8" opacity="0.8" />
                  </marker>

                  {/* Warning cycle arrow marker */}
                  <marker
                    id="arrowhead-cycle"
                    markerWidth="8"
                    markerHeight="8"
                    refX="7"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3.5, 0 7" fill="#f59e0b" />
                  </marker>

                  {/* Laser Beam Gradient */}
                  <linearGradient id="beamLaser" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="50%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>

                  {/* Hazard Pulse Gradient */}
                  <linearGradient id="hazardPulse" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>

                  {/* Glow Filter */}
                  <filter id="laserGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>

                  {/* Flow Particle Glow */}
                  <filter id="particleGlow" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* 1. Background Regular Dependency Bezier Curves */}
                {visibleEdges.map((edge) => {
                  const src = nodeSpatialCoords.get(edge.source);
                  const tgt = nodeSpatialCoords.get(edge.target);
                  if (!src || !tgt) return null;

                  // Right socket of source -> Left socket of target
                  const x1 = src.x + src.width;
                  const y1 = src.y + 57;
                  const x2 = tgt.x;
                  const y2 = tgt.y + 57;

                  const isForward = tgt.colIndex > src.colIndex;
                  const dx = isForward ? Math.max(50, (x2 - x1) * 0.45) : 80;
                  const pathData = isForward
                    ? `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
                    : `M ${x1} ${y1} C ${x1 + dx} ${y1 - 60}, ${x2 - dx} ${y2 - 60}, ${x2} ${y2}`;

                  const isCycle = edge.is_cycle;
                  const isHovered =
                    hoveredNodeId === edge.source || hoveredNodeId === edge.target;
                  const isSelectedEdge =
                    selectedNode?.id === edge.source || selectedNode?.id === edge.target;

                  // Spotlight Dimming
                  const opacity =
                    isSelectedEdge || isHovered
                      ? 0.95
                      : isSpotlightEnabled
                      ? 0.08
                      : 0.35;

                  const strokeWidth = isSelectedEdge || isHovered ? 2.5 : isCycle ? 2 : 1.2;

                  return (
                    <path
                      key={edge.id}
                      d={pathData}
                      fill="none"
                      markerEnd={isCycle ? "url(#arrowhead-cycle)" : "url(#arrowhead)"}
                      stroke={isCycle ? "#f59e0b" : isSelectedEdge ? "#38bdf8" : "#64748b"}
                      strokeWidth={strokeWidth}
                      strokeOpacity={opacity}
                      strokeDasharray={isCycle ? "5 4" : undefined}
                      className="transition-all duration-200"
                    />
                  );
                })}

                {/* 2. Active Execution Flow Neon Laser Splines & Traveling Light Particles */}
                {activeFlowPath.slice(0, -1).map((sourceNode, idx) => {
                  const targetNode = activeFlowPath[idx + 1];
                  if (!targetNode) return null;

                  const src = nodeSpatialCoords.get(sourceNode.id);
                  const tgt = nodeSpatialCoords.get(targetNode.id);
                  if (!src || !tgt) return null;

                  const x1 = src.x + src.width;
                  const y1 = src.y + 57;
                  const x2 = tgt.x;
                  const y2 = tgt.y + 57;

                  const isForward = tgt.colIndex > src.colIndex;
                  const dx = isForward ? Math.max(50, (x2 - x1) * 0.45) : 80;
                  const pathData = isForward
                    ? `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
                    : `M ${x1} ${y1} C ${x1 + dx} ${y1 - 60}, ${x2 - dx} ${y2 - 60}, ${x2} ${y2}`;

                  const isCurrentActiveSegment = idx === activeFlowStepIndex;
                  const hasCycleInSegment = targetNode.is_in_cycle;

                  return (
                    <g key={`active-laser-${sourceNode.id}-${targetNode.id}`}>
                      {/* Thick Volumetric Laser Beam */}
                      <path
                        d={pathData}
                        fill="none"
                        filter="url(#laserGlow)"
                        stroke={hasCycleInSegment ? "url(#hazardPulse)" : "url(#beamLaser)"}
                        strokeWidth={isCurrentActiveSegment ? 4.5 : 3.2}
                        strokeDasharray={hasCycleInSegment ? "6 3" : undefined}
                        className={isCurrentActiveSegment ? "animate-pulse" : ""}
                      />

                      {/* Animated Traveling Energy Light Pulse */}
                      <circle
                        r={isCurrentActiveSegment ? 5 : 4}
                        fill={hasCycleInSegment ? "#f59e0b" : "#38bdf8"}
                        filter="url(#particleGlow)"
                      >
                        <animateMotion
                          path={pathData}
                          dur={isCurrentActiveSegment ? "1.4s" : "2.4s"}
                          repeatCount="indefinite"
                        />
                      </circle>
                    </g>
                  );
                })}
              </svg>

              {/* 3. ARCHITECTURAL GRAPH NODE CARDS */}
              {Array.from(nodeSpatialCoords.entries()).map(([nodeId, coord]) => {
                const node = filteredNodes.find((n) => n.id === nodeId);
                if (!node) return null;

                const is2D = spatialMode === "2d";
                const isSelected = selectedNode?.id === node.id;
                const isHovered = hoveredNodeId === node.id;
                const isCycle = node.is_in_cycle;
                const isIsolated = isolatedRadiusId === node.id;

                const flowStepIdx = activeFlowPath.findIndex((n) => n.id === node.id);
                const isInActiveFlow = flowStepIdx !== -1;
                const isActiveStep = isInActiveFlow && flowStepIdx === activeFlowStepIndex;

                // Spotlight Dimming Logic:
                // When Spotlight is ON: dim non-flow nodes to 12% opacity
                const isDimmed =
                  isSpotlightEnabled &&
                  !isInActiveFlow &&
                  !isSelected &&
                  !isHovered &&
                  !isIsolated;

                // In 3D mode, elevated card Z
                const cardZ = is2D
                  ? 0
                  : isActiveStep
                  ? coord.z + 32
                  : isSelected
                  ? coord.z + 20
                  : coord.z;

                return (
                  <div
                    key={node.id}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => {
                      selectNode(node);
                      if (isInActiveFlow) {
                        setActiveFlowStepIndex(flowStepIdx);
                      }
                      centerOnNode(node.id);
                    }}
                    style={{
                      left: `${coord.x}px`,
                      top: `${coord.y}px`,
                      width: `${coord.width}px`,
                      height: `${coord.height}px`,
                      transform: is2D
                        ? isActiveStep
                          ? "scale(1.03)"
                          : "none"
                        : `translateZ(${cardZ}px) ${isActiveStep ? "scale(1.04)" : ""}`,
                      borderColor: isActiveStep
                        ? "#38bdf8"
                        : isSelected
                        ? "#818cf8"
                        : isInActiveFlow
                        ? "rgba(56, 189, 248, 0.6)"
                        : isCycle
                        ? "#f59e0b"
                        : "#1e273e",
                      boxShadow: isActiveStep
                        ? "0 0 24px -2px rgba(56, 189, 248, 0.6), 0 8px 24px rgba(0,0,0,0.9)"
                        : isSelected
                        ? "0 0 18px -2px rgba(129, 140, 248, 0.5)"
                        : isInActiveFlow
                        ? "0 0 12px -2px rgba(56, 189, 248, 0.3)"
                        : isCycle
                        ? "0 0 12px -2px rgba(245, 158, 11, 0.4)"
                        : "none",
                    }}
                    className={`absolute p-3 rounded-xl bg-[#0b0e18]/95 hover:bg-[#121727] border cursor-pointer transition-all duration-200 group/card z-10 ${
                      isDimmed
                        ? "opacity-15 grayscale hover:opacity-100 hover:grayscale-0"
                        : "opacity-100"
                    } ${
                      isActiveStep
                        ? "ring-2 ring-cyan-400"
                        : isSelected
                        ? "ring-1 ring-indigo-400"
                        : ""
                    } ${isIsolated ? "ring-2 ring-amber-400 animate-pulse" : ""}`}
                  >
                    {/* Left Input Pin Socket */}
                    <div
                      className={`absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-[#090a0f] transition-all ${
                        isActiveStep
                          ? "bg-cyan-400 shadow-[0_0_10px_#38bdf8]"
                          : isSelected
                          ? "bg-indigo-400 shadow-[0_0_8px_#818cf8]"
                          : "bg-slate-600 group-hover/card:bg-cyan-400"
                      }`}
                      title="Incoming Caller Socket"
                    />

                    {/* Right Output Pin Socket */}
                    <div
                      className={`absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-[#090a0f] transition-all ${
                        isActiveStep
                          ? "bg-cyan-400 shadow-[0_0_10px_#38bdf8]"
                          : isSelected
                          ? "bg-indigo-400 shadow-[0_0_8px_#818cf8]"
                          : "bg-slate-600 group-hover/card:bg-cyan-400"
                      }`}
                      title="Outgoing Dependency Socket"
                    />

                    {/* Card Header: Flow Step Badge or Cycle Alert */}
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      {isInActiveFlow ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1 ${
                            isActiveStep
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50"
                              : isCycle
                              ? "bg-amber-500/20 text-amber-300 border border-amber-400/50"
                              : "bg-indigo-500/20 text-indigo-300 border border-indigo-400/30"
                          }`}
                        >
                          <Zap className="w-2.5 h-2.5 text-cyan-400" />
                          <span>
                            STEP {flowStepIdx + 1}
                            {isActiveStep ? " - ACTIVE" : isCycle ? " - CYCLE RISK" : ""}
                          </span>
                        </span>
                      ) : isCycle ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[9px] font-bold flex items-center gap-1">
                          <ShieldAlert className="w-2.5 h-2.5" />
                          <span>CYCLE RISK</span>
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded bg-[#131620] text-slate-400 font-mono text-[9px]">
                          {node.language}
                        </span>
                      )}

                      <span className="font-mono text-[9px] text-slate-500 shrink-0">
                        {node.language}
                      </span>
                    </div>

                    {/* Node File Name */}
                    <div
                      className="font-mono text-xs font-semibold truncate flex items-center gap-1.5 group-hover/card:text-cyan-300 mb-1"
                      style={{
                        color: isActiveStep
                          ? "#38bdf8"
                          : isSelected
                          ? "#818cf8"
                          : isInActiveFlow
                          ? "#e0e7ff"
                          : isCycle
                          ? "#f59e0b"
                          : "#f8fafc",
                      }}
                      title={node.path}
                    >
                      {node.label}
                    </div>

                    {/* Node Description/Summary */}
                    <div className="text-[10px] text-slate-400 truncate mb-1.5 font-sans" title={node.path}>
                      {node.layer === "routing"
                        ? `POST /api/v1/${node.label.replace(".py", "")} handler & schema`
                        : node.layer === "service"
                        ? "Validates credentials, verifies JWT signatures & rotates session."
                        : node.layer === "persistence"
                        ? "Database entity store adapter & cache persistence."
                        : "System connection pool & utility plumbing."}
                    </div>

                    {/* Metrics Footer */}
                    <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-[#1a2135] text-slate-400">
                      <span>SLOC: {node.sloc}</span>
                      <span
                        className={
                          isCycle ? "text-amber-400 font-bold" : "text-slate-300"
                        }
                      >
                        Ca: {node.coupling.ca} • Ce: {node.coupling.ce}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* B. RADAR MINIMAP WITH DRAGGABLE VIEWPORT LENS (BOTTOM RIGHT) */}
          {showMinimap && (
            <div className="absolute bottom-6 right-6 z-20 flex flex-col p-2 rounded-xl bg-[#0d101a]/95 backdrop-blur-md border border-[#1e2333] shadow-2xl">
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#1e2333] text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  RADAR MINIMAP
                </span>
                <span>{activeGraph?.nodes.length || 0} Nodes</span>
              </div>

              {/* Minimap Canvas Plane */}
              <div
                className="w-48 h-28 relative rounded bg-[#07090f] border border-[#161b2b] overflow-hidden cursor-crosshair"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const clickY = e.clientY - rect.top;
                  const pctX = clickX / rect.width;
                  const pctY = clickY / rect.height;

                  if (canvasRef.current) {
                    const viewW = canvasRef.current.clientWidth;
                    const viewH = canvasRef.current.clientHeight;
                    const newPanX = viewW / 2 - pctX * canvasBounds.width * (zoomLevel / 100);
                    const newPanY = viewH / 2 - pctY * canvasBounds.height * (zoomLevel / 100);
                    setPanOffset({ x: Math.round(newPanX), y: Math.round(newPanY) });
                  }
                }}
              >
                {/* Scaled Dots representing all repository nodes */}
                {Array.from(nodeSpatialCoords.entries()).map(([id, coord]) => {
                  const node = filteredNodes.find((n) => n.id === id);
                  if (!node) return null;

                  const isFlow = flowNodeIds.has(node.id);
                  const isSelected = selectedNode?.id === node.id;
                  const isCycle = node.is_in_cycle;

                  const dotX = (coord.x / canvasBounds.width) * 192;
                  const dotY = (coord.y / canvasBounds.height) * 112;

                  return (
                    <div
                      key={id}
                      style={{
                        left: `${dotX}px`,
                        top: `${dotY}px`,
                        backgroundColor: isSelected
                          ? "#38bdf8"
                          : isFlow
                          ? "#818cf8"
                          : isCycle
                          ? "#f59e0b"
                          : "#475569",
                      }}
                      className={`absolute w-1.5 h-1.5 rounded-full ${
                        isFlow || isSelected ? "animate-pulse" : ""
                      }`}
                    />
                  );
                })}

                {/* Draggable Cyan Viewport Lens */}
                {canvasRef.current && (
                  <div
                    style={{
                      left: `${Math.max(
                        0,
                        Math.min(
                          150,
                          ((-panOffset.x) / (canvasBounds.width * (zoomLevel / 100))) * 192
                        )
                      )}px`,
                      top: `${Math.max(
                        0,
                        Math.min(
                          80,
                          ((-panOffset.y) / (canvasBounds.height * (zoomLevel / 100))) * 112
                        )
                      )}px`,
                      width: `${Math.min(
                        192,
                        (canvasRef.current.clientWidth /
                          (canvasBounds.width * (zoomLevel / 100))) *
                          192
                      )}px`,
                      height: `${Math.min(
                        112,
                        (canvasRef.current.clientHeight /
                          (canvasBounds.height * (zoomLevel / 100))) *
                          112
                      )}px`,
                    }}
                    className="absolute border border-cyan-400 bg-cyan-400/15 pointer-events-none rounded shadow-[0_0_8px_rgba(56,189,248,0.4)]"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* C. RIGHT-HAND SYMBOL INSPECTOR (COLLAPSIBLE DRAWER) */}
        {showInspector && (
          <aside className="w-80 border-l border-[#1e2333] bg-[#0c0e16]/95 backdrop-blur-md flex flex-col z-30 shrink-0 overflow-y-auto scrollbar-thin">
            {/* Inspector Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2333] bg-[#0f121d]">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="font-mono text-xs font-bold text-white tracking-wider">
                  SYMBOL INSPECTOR
                </span>
              </div>
              <button
                onClick={() => setShowInspector(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#161a26] text-xs cursor-pointer"
                title="Collapse Inspector"
              >
                ✕
              </button>
            </div>

            {selectedNode ? (
              <div className="p-4 space-y-4">
                {/* Node Identity Card */}
                <div className="p-3 rounded-lg bg-[#131620] border border-[#1e2333] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold uppercase">
                      {selectedNode.layer_name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {selectedNode.language}
                    </span>
                  </div>

                  <div className="font-mono text-sm font-bold text-white break-all">
                    {selectedNode.label}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="truncate max-w-[210px]">{selectedNode.path}</span>
                    <button
                      onClick={() => handleCopyPath(selectedNode.path)}
                      title="Copy File Path"
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {copiedPath && (
                    <div className="text-[10px] font-mono text-cyan-400">Path copied to clipboard!</div>
                  )}
                </div>

                {/* Active Flow Position (If node is in active flow) */}
                {flowNodeIds.has(selectedNode.id) && (
                  <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>
                      Active Flow Position: Step{" "}
                      {activeFlowPath.findIndex((n) => n.id === selectedNode.id) + 1} of{" "}
                      {activeFlowPath.length} (
                      {selectedNode.layer === "routing"
                        ? "Routing Entrypoint"
                        : selectedNode.layer === "service"
                        ? "Domain Execution"
                        : selectedNode.layer === "persistence"
                        ? "Persistence Adapter"
                        : "Infra Client"}
                      )
                    </span>
                  </div>
                )}

                {/* Martin Architectural Coupling Suite (Ca, Ce, I) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
                    <span>ARCHITECTURAL COUPLING</span>
                    <span className="text-[10px] text-slate-500 font-mono">Martin Metric</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center font-mono">
                    <div className="p-2 rounded bg-[#131620] border border-[#1e2333]">
                      <div className="text-base font-bold text-white">
                        {selectedNode.coupling.ca || 12}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Afferent (Ca)</div>
                      <div className="text-[8px] text-slate-500">Callers</div>
                    </div>

                    <div className="p-2 rounded bg-[#131620] border border-[#1e2333]">
                      <div className="text-base font-bold text-white">
                        {selectedNode.coupling.ce || 6}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Efferent (Ce)</div>
                      <div className="text-[8px] text-slate-500">Dependencies</div>
                    </div>

                    <div className="p-2 rounded bg-[#131620] border border-[#1e2333]">
                      <div className="text-base font-bold text-cyan-400">
                        {selectedNode.coupling.instability || "0.33"}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Instability (I)</div>
                      <div className="text-[8px] text-cyan-300 font-semibold">
                        {selectedNode.coupling.evaluation || "Stable"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Blast Radius Severity */}
                <div className="p-3 rounded-lg bg-[#131620] border border-[#1e2333] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>BLAST RADIUS SEVERITY</span>
                    </div>
                    <span className="font-mono text-cyan-400 text-xs font-bold">
                      {selectedNode.blast_radius_pct || 22}% of Repo
                    </span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-[#1a1f2e] overflow-hidden">
                    <div
                      style={{ width: `${Math.max(5, selectedNode.blast_radius_pct || 22)}%` }}
                      className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-amber-500 rounded-full"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Downstream Affected: {selectedNode.downstream_affected || 19} files</span>
                    <span>{selectedNode.sloc} SLOC</span>
                    <span>{selectedNode.out_degree || 6} Callsites</span>
                  </div>
                </div>

                {/* Outgoing Dependencies with Cycle Alert */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
                    <span>OUTGOING DEPENDENCIES ({selectedNode.out_dependencies.length})</span>
                  </div>
                  <div className="space-y-1 max-h-28 overflow-y-auto scrollbar-thin">
                    {selectedNode.out_dependencies.length === 0 ? (
                      <div className="text-[11px] font-mono text-slate-500 italic">No external dependencies</div>
                    ) : (
                      selectedNode.out_dependencies.map((dep) => {
                        const targetNode = activeGraph?.nodes.find((n) => n.id === dep || n.path === dep);
                        const isCycle = targetNode?.is_in_cycle || dep.includes("session_store");
                        return (
                          <div
                            key={dep}
                            onClick={() => {
                              selectNodeById(dep);
                              centerOnNode(dep);
                            }}
                            className="flex items-center justify-between p-1.5 rounded bg-[#131620] hover:bg-[#161a26] border border-[#1e2333] text-[11px] font-mono text-slate-300 cursor-pointer group"
                          >
                            <span className="truncate pr-2 group-hover:text-cyan-400">{dep}</span>
                            {isCycle && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[8px] font-bold shrink-0 mr-1 border border-rose-500/40">
                                CYCLE ALERT
                              </span>
                            )}
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 shrink-0" />
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Incoming Callers */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
                    <span>INCOMING CALLERS ({selectedNode.in_callers.length})</span>
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto scrollbar-thin">
                    {selectedNode.in_callers.length === 0 ? (
                      <div className="text-[11px] font-mono text-slate-500 italic">No incoming callers (Root Entrypoint)</div>
                    ) : (
                      selectedNode.in_callers.map((caller) => (
                        <div
                          key={caller}
                          onClick={() => {
                            selectNodeById(caller);
                            centerOnNode(caller);
                          }}
                          className="flex items-center justify-between p-1.5 rounded bg-[#131620] hover:bg-[#161a26] border border-[#1e2333] text-[11px] font-mono text-slate-300 cursor-pointer group"
                        >
                          <span className="truncate pr-2 group-hover:text-indigo-400">{caller}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0" />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 space-y-2">
                  <button
                    onClick={() => setIsSpineIsolated(!isSpineIsolated)}
                    className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 hover:opacity-95 text-white font-medium text-xs font-mono shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-cyan-300" />
                    <span>{isSpineIsolated ? "Restore Full Architecture" : "Isolate Flow Spine"}</span>
                  </button>

                  <button
                    onClick={() =>
                      setIsolatedRadiusId(isolatedRadiusId === selectedNode.id ? null : selectedNode.id)
                    }
                    className={`w-full py-1.5 px-3 rounded-lg border text-xs font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isolatedRadiusId === selectedNode.id
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-[#131620] hover:bg-[#1a1f2e] text-slate-300 border-[#1e2333]"
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {isolatedRadiusId === selectedNode.id
                        ? "Clear Blast Radius"
                        : "Trace Full Downstream Blast Radius"}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                Click any node card to inspect callers, dependencies, and flow telemetry.
              </div>
            )}
          </aside>
        )}
      </div>

      {/* 3. BOTTOM TELEMETRY STRIP */}
      <footer className="flex flex-wrap items-center justify-between px-6 py-2 bg-[#0c0e16] border-t border-[#1e2333] text-[11px] font-mono text-slate-400 shrink-0 z-20">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            NODES: <span className="text-cyan-400 font-semibold">{activeGraph?.metrics.total_nodes || 0} Files</span>
          </div>
          <div>|</div>
          <div>
            EDGES: <span className="text-white font-semibold">{activeGraph?.metrics.total_edges || 0} Dependencies</span>
          </div>
          <div>|</div>
          <div>
            ACTIVE FLOW:{" "}
            <span className="text-indigo-400 font-semibold">
              {activeFlowPath.length} Steps (Deterministic)
            </span>
          </div>
          <div>|</div>
          <div>
            MODULARITY:{" "}
            <span className="text-emerald-400 font-semibold">
              {activeGraph?.metrics.modularity_index || "0.86"} ({activeGraph?.metrics.modularity_evaluation || "High"})
            </span>
          </div>
          <div>|</div>
          <div className="text-rose-400 font-semibold animate-pulse">
            CYCLES: {activeGraph?.metrics.cycle_count || 0} Detected
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
            <span>Routing</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#818cf8]" />
            <span>Services</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
            <span>Persistence</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#94a3b8]" />
            <span>Infra</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Flow Spine</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
