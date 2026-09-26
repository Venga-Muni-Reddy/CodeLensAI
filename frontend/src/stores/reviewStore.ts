import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import type {
  CodeReviewResponse,
  SeverityTab,
  CategoryFilter,
  DiffViewMode,
} from "../types/review";

interface ReviewState {
  reviewData: CodeReviewResponse | null;
  selectedFindingId: string | null;
  severityFilter: SeverityTab;
  categoryFilter: CategoryFilter;
  searchQuery: string;
  diffViewMode: DiffViewMode;
  checklistStates: Record<string, boolean>;
  isScanning: boolean;
  isApplyingPatch: boolean;
  appliedPatchIds: string[];
  error: string | null;

  // Actions
  setSelectedFindingId: (id: string | null) => void;
  setSeverityFilter: (tab: SeverityTab) => void;
  setCategoryFilter: (cat: CategoryFilter) => void;
  setSearchQuery: (query: string) => void;
  setDiffViewMode: (mode: DiffViewMode) => void;
  toggleChecklistItem: (itemId: string) => void;
  clearError: () => void;

  fetchReview: (projectId: string, repositoryId: string) => Promise<CodeReviewResponse | null>;
  triggerScan: (projectId: string, repositoryId: string) => Promise<CodeReviewResponse | null>;
  applyPatch: (findingId: string) => Promise<boolean>;
  downloadPatch: (projectId: string, repositoryId: string, findingId: string) => Promise<void>;
  downloadAllPatches: (projectId: string, repositoryId: string) => Promise<void>;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  reviewData: null,
  selectedFindingId: null,
  severityFilter: "all",
  categoryFilter: "all",
  searchQuery: "",
  diffViewMode: "side-by-side",
  checklistStates: {},
  isScanning: false,
  isApplyingPatch: false,
  appliedPatchIds: [],
  error: null,

  setSelectedFindingId: (id) => set({ selectedFindingId: id }),
  setSeverityFilter: (tab) => set({ severityFilter: tab }),
  setCategoryFilter: (cat) => set({ categoryFilter: cat }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setDiffViewMode: (mode) => set({ diffViewMode: mode }),
  toggleChecklistItem: (itemId) => {
    set((state) => ({
      checklistStates: {
        ...state.checklistStates,
        [itemId]: !state.checklistStates[itemId],
      },
    }));
  },
  clearError: () => set({ error: null }),

  fetchReview: async (projectId, repositoryId) => {
    set({ isScanning: true, error: null });
    try {
      const pId = projectId || "default-project";
      const rId = repositoryId || "default-repo";
      const res = await apiClient.get<any>(
        `/projects/${pId}/repositories/${rId}/review`
      );

      const data: CodeReviewResponse = res.data?.data || res.data;
      const initialChecks: Record<string, boolean> = {};
      if (data.checklist) {
        data.checklist.forEach((item) => {
          initialChecks[item.id] = item.checked;
        });
      }

      const defaultFindingId = data.findings && data.findings.length > 0 ? data.findings[0].id : null;

      set({
        reviewData: data,
        selectedFindingId: defaultFindingId,
        checklistStates: initialChecks,
        isScanning: false,
      });
      return data;
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to fetch code review audit";
      set({ error: msg, isScanning: false });
      return null;
    }
  },

  triggerScan: async (projectId, repositoryId) => {
    set({ isScanning: true, error: null });
    try {
      const pId = projectId || "default-project";
      const rId = repositoryId || "default-repo";
      const res = await apiClient.post<any>(
        `/projects/${pId}/repositories/${rId}/review/scan`
      );

      const data: CodeReviewResponse = res.data?.data || res.data;
      const initialChecks: Record<string, boolean> = {};
      if (data.checklist) {
        data.checklist.forEach((item) => {
          initialChecks[item.id] = item.checked;
        });
      }

      set({
        reviewData: data,
        selectedFindingId: data.findings?.[0]?.id || null,
        checklistStates: initialChecks,
        isScanning: false,
      });
      return data;
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to execute review audit scan";
      set({ error: msg, isScanning: false });
      return null;
    }
  },

  applyPatch: async (findingId: string) => {
    set({ isApplyingPatch: true });
    // Simulate instantaneous branch patching with visual feedback
    await new Promise((resolve) => setTimeout(resolve, 600));
    set((state) => ({
      isApplyingPatch: false,
      appliedPatchIds: Array.from(new Set([...state.appliedPatchIds, findingId])),
    }));
    return true;
  },

  downloadPatch: async (projectId, repositoryId, findingId) => {
    try {
      const pId = projectId || "default-project";
      const rId = repositoryId || "default-repo";
      const res = await apiClient.get(
        `/projects/${pId}/repositories/${rId}/review/patch/${findingId}`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${findingId}.patch`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download patch:", err);
    }
  },

  downloadAllPatches: async (_projectId, _repositoryId) => {
    const { reviewData } = get();
    if (!reviewData || !reviewData.findings) return;

    let combined = `# CodeLens AI Combined Remediation Patch Archive\n# Run: ${reviewData.run_id}\n# Target Branch: ${reviewData.target_branch}\n\n`;
    for (const f of reviewData.findings) {
      if (f.diff_block?.patch_content) {
        combined += `# Finding: ${f.title} (${f.id}) - ${f.severity.toUpperCase()}\n`;
        combined += f.diff_block.patch_content + "\n\n";
      }
    }

    const blob = new Blob([combined], { type: "text/x-diff;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `codelens-audit-${reviewData.run_id}.patch`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
}));
