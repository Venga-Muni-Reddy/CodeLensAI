import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import type { GraphNode, RepositoryGraphResponse } from "../types/graph";

interface GraphState {
  graphResponse: RepositoryGraphResponse | null;
  selectedNode: GraphNode | null;
  viewMode: "file" | "module" | "2d" | "3d";
  depthFilter: "1" | "2" | "all";
  searchQuery: string;
  zoomLevel: number;
  viewportOffset: { x: number; y: number };
  cameraPreset: "iso" | "top" | "profile";
  rotX: number;
  rotZ: number;
  isLoading: boolean;
  isRescanning: boolean;
  error: string | null;

  fetchGraph: (repositoryId: string, projectId?: string) => Promise<RepositoryGraphResponse | null>;
  rescanGraph: (repositoryId: string, projectId?: string) => Promise<RepositoryGraphResponse | null>;
  selectNode: (node: GraphNode | null) => void;
  selectNodeById: (nodeId: string) => void;
  setViewMode: (mode: "file" | "module" | "2d" | "3d") => void;
  setDepthFilter: (depth: "1" | "2" | "all") => void;
  setSearchQuery: (query: string) => void;
  setZoomLevel: (zoom: number | ((prev: number) => number)) => void;
  setViewportOffset: (offset: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  setCameraPreset: (preset: "iso" | "top" | "profile") => void;
  setRotation: (rotX: number, rotZ: number) => void;
  rotateStep: (deltaZ: number) => void;
  resetView: () => void;
  clearError: () => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  graphResponse: null,
  selectedNode: null,
  viewMode: "3d",
  depthFilter: "2",
  searchQuery: "",
  zoomLevel: 92,
  viewportOffset: { x: 0, y: 0 },
  cameraPreset: "iso",
  rotX: 46,
  rotZ: -22,
  isLoading: false,
  isRescanning: false,
  error: null,

  clearError: () => set({ error: null }),

  selectNode: (node: GraphNode | null) => set({ selectedNode: node }),

  selectNodeById: (nodeId: string) => {
    const { graphResponse, viewMode } = get();
    if (!graphResponse) return;
    const currentGraph = viewMode === "module" ? graphResponse.module_graph : graphResponse.file_graph;
    const found = currentGraph.nodes.find((n) => n.id === nodeId || n.path === nodeId) || null;
    set({ selectedNode: found });
  },

  setViewMode: (mode: "file" | "module" | "2d" | "3d") => {
    set({ viewMode: mode });
    // Reset selected node to first in current view mode or null
    const { graphResponse } = get();
    if (graphResponse) {
      const currentGraph = mode === "module" ? graphResponse.module_graph : graphResponse.file_graph;
      if (currentGraph.nodes.length > 0) {
        set({ selectedNode: currentGraph.nodes[0] });
      } else {
        set({ selectedNode: null });
      }
    }
  },

  setDepthFilter: (depth: "1" | "2" | "all") => set({ depthFilter: depth }),

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  setZoomLevel: (zoom) =>
    set((state) => ({
      zoomLevel: typeof zoom === "function" ? Math.max(30, Math.min(200, zoom(state.zoomLevel))) : Math.max(30, Math.min(200, zoom)),
    })),

  setViewportOffset: (offset) =>
    set((state) => ({
      viewportOffset: typeof offset === "function" ? offset(state.viewportOffset) : offset,
    })),

  setCameraPreset: (preset: "iso" | "top" | "profile") => {
    if (preset === "iso") {
      set({ cameraPreset: "iso", rotX: 46, rotZ: -22, zoomLevel: 92 });
    } else if (preset === "top") {
      set({ cameraPreset: "top", rotX: 0, rotZ: 0, zoomLevel: 85 });
    } else if (preset === "profile") {
      set({ cameraPreset: "profile", rotX: 72, rotZ: -12, zoomLevel: 95 });
    }
  },

  setRotation: (rotX: number, rotZ: number) => set({ rotX, rotZ }),

  rotateStep: (deltaZ: number) =>
    set((state) => ({
      rotZ: (state.rotZ + deltaZ) % 360,
    })),

  resetView: () =>
    set({
      zoomLevel: 92,
      viewportOffset: { x: 0, y: 0 },
      rotX: 46,
      rotZ: -22,
      cameraPreset: "iso",
    }),

  fetchGraph: async (repositoryId: string, projectId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const url = projectId
        ? `/projects/${projectId}/repositories/${repositoryId}/graph`
        : `/repositories/${repositoryId}/graph`;
      const res = await apiClient.get<{ success: boolean; data: RepositoryGraphResponse }>(url);
      const data = res.data.data;
      set({
        graphResponse: data,
        isLoading: false,
        // Set default selected node to the first service or first node
        selectedNode:
          data.file_graph.nodes.find((n) => n.layer === "service") ||
          data.file_graph.nodes[0] ||
          null,
      });
      return data;
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Failed to load repository dependency graph.";
      set({ error: msg, isLoading: false });
      return null;
    }
  },

  rescanGraph: async (repositoryId: string, projectId?: string) => {
    set({ isRescanning: true, error: null });
    try {
      const url = projectId
        ? `/projects/${projectId}/repositories/${repositoryId}/graph/rescan`
        : `/repositories/${repositoryId}/graph/rescan`;
      const res = await apiClient.post<{ success: boolean; data: RepositoryGraphResponse }>(url);
      const data = res.data.data;
      set({
        graphResponse: data,
        isRescanning: false,
        selectedNode:
          data.file_graph.nodes.find((n) => n.layer === "service") ||
          data.file_graph.nodes[0] ||
          null,
      });
      return data;
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Failed to re-scan dependency graph.";
      set({ error: msg, isRescanning: false });
      return null;
    }
  },
}));
