import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import type {
  ImpactAnalysisResponse,
  CandidateSymbol,
  SymbolType,
  ImpactNode,
} from "../types/impact";

interface ImpactState {
  currentAnalysis: ImpactAnalysisResponse | null;
  availableSymbols: CandidateSymbol[];
  targetSymbol: string;
  targetType: SymbolType;
  depth: number;
  isLoading: boolean;
  error: string | null;
  selectedFilter: "all" | "service" | "routing" | "test";
  activeInspectorTab: "entities" | "advisor";
  selectedNode: ImpactNode | null;
  hoveredNode: ImpactNode | null;
  showWrapperCode: boolean;
  checklistStates: Record<string, boolean>;

  // Actions
  setTargetSymbol: (symbol: string) => void;
  setTargetType: (type: SymbolType) => void;
  setDepth: (depth: number) => void;
  setSelectedFilter: (filter: "all" | "service" | "routing" | "test") => void;
  setActiveInspectorTab: (tab: "entities" | "advisor") => void;
  setSelectedNode: (node: ImpactNode | null) => void;
  setHoveredNode: (node: ImpactNode | null) => void;
  toggleChecklistItem: (itemId: string) => void;
  toggleShowWrapperCode: () => void;
  clearError: () => void;

  runImpactAnalysis: (
    projectId: string,
    repositoryId: string,
    targetSymbol?: string,
    targetType?: SymbolType,
    depth?: number
  ) => Promise<ImpactAnalysisResponse | null>;
  fetchSymbols: (projectId: string, repositoryId: string) => Promise<CandidateSymbol[]>;
}

export const useImpactStore = create<ImpactState>((set, get) => ({
  currentAnalysis: null,
  availableSymbols: [],
  targetSymbol: "PaymentService.processPayment()",
  targetType: "fn",
  depth: 3,
  isLoading: false,
  error: null,
  selectedFilter: "all",
  activeInspectorTab: "entities",
  selectedNode: null,
  hoveredNode: null,
  showWrapperCode: false,
  checklistStates: {
    "item-1": true,
    "item-2": true,
    "item-3": false,
    "item-4": false,
  },

  setTargetSymbol: (symbol) => set({ targetSymbol: symbol }),
  setTargetType: (type) => set({ targetType: type }),
  setDepth: (depth) => set({ depth }),
  setSelectedFilter: (filter) => set({ selectedFilter: filter }),
  setActiveInspectorTab: (tab) => set({ activeInspectorTab: tab }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  setHoveredNode: (node) => set({ hoveredNode: node }),
  toggleShowWrapperCode: () => set((state) => ({ showWrapperCode: !state.showWrapperCode })),
  clearError: () => set({ error: null }),

  toggleChecklistItem: (itemId: string) => {
    set((state) => ({
      checklistStates: {
        ...state.checklistStates,
        [itemId]: !state.checklistStates[itemId],
      },
    }));
  },

  fetchSymbols: async (projectId: string, repositoryId: string) => {
    try {
      const res = await apiClient.get<any>(
        `/projects/${projectId}/repositories/${repositoryId}/impact/symbols`
      );
      const data = res.data?.data || res.data;
      const symbols = data?.symbols || [];
      if (symbols && symbols.length > 0) {
        set({ availableSymbols: symbols });
        return symbols;
      }
      return [];
    } catch {
      return [];
    }
  },

  runImpactAnalysis: async (
    projectId: string,
    repositoryId: string,
    targetSymbol?: string,
    targetType?: SymbolType,
    depth?: number
  ) => {
    const symbolToRun = targetSymbol ?? get().targetSymbol;
    const typeToRun = targetType ?? get().targetType;
    const depthToRun = depth ?? get().depth;

    set({ isLoading: true, error: null });

    try {
      const res = await apiClient.post<any>(
        `/projects/${projectId}/repositories/${repositoryId}/impact/analyze`,
        {
          target_symbol: symbolToRun,
          target_type: typeToRun,
          depth: depthToRun,
        }
      );

      const analysisData: ImpactAnalysisResponse = res.data?.data || res.data;
      if (analysisData && analysisData.concentric_nodes) {
        // Initialize checklist state
        const initialChecklist: Record<string, boolean> = {};
        analysisData.ai_advisor?.checklist?.forEach((item) => {
          initialChecklist[item.id] = item.checked;
        });

        // Set default selected node as epicenter
        const epicenter = analysisData.concentric_nodes?.find((n) => n.ring === 0) || null;

        set({
          currentAnalysis: analysisData,
          isLoading: false,
          targetSymbol: analysisData.target?.name || symbolToRun,
          targetType: analysisData.target?.target_type || typeToRun,
          depth: analysisData.depth || depthToRun,
          selectedNode: epicenter,
          checklistStates: initialChecklist,
          availableSymbols:
            analysisData.available_symbols && analysisData.available_symbols.length > 0
              ? analysisData.available_symbols
              : get().availableSymbols,
        });
        return analysisData;
      }
      set({ isLoading: false });
      return null;
    } catch (err: any) {
      console.warn("Failed to execute impact analysis, using client fallback", err);
      set({
        isLoading: false,
        error: err.response?.data?.message || err.message || "Failed to analyze impact",
      });
      return null;
    }
  },
}));
