import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import type { AnalysisJob, RepositoryAnalysis } from "../types/analysis";

interface AnalysisState {
  latestAnalysis: RepositoryAnalysis | null;
  activeJob: AnalysisJob | null;
  isLoading: boolean;
  isAnalyzing: boolean;
  error: string | null;

  fetchLatestAnalysis: (repositoryId: string) => Promise<RepositoryAnalysis | null>;
  triggerAnalysis: (repositoryId: string) => Promise<AnalysisJob>;
  clearError: () => void;
  resetAnalysis: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  latestAnalysis: null,
  activeJob: null,
  isLoading: false,
  isAnalyzing: false,
  error: null,

  clearError: () => set({ error: null }),
  resetAnalysis: () => set({ latestAnalysis: null, activeJob: null, error: null }),

  fetchLatestAnalysis: async (repositoryId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.get<{ success: boolean; data: RepositoryAnalysis | null }>(
        `/repositories/${repositoryId}/analysis/latest`
      );
      set({ latestAnalysis: res.data.data, isLoading: false });
      return res.data.data;
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Failed to fetch repository analysis.";
      set({ error: msg, isLoading: false });
      return null;
    }
  },

  triggerAnalysis: async (repositoryId: string) => {
    set({ isAnalyzing: true, error: null });
    try {
      const res = await apiClient.post<{ success: boolean; data: AnalysisJob }>(
        `/repositories/${repositoryId}/analyze`
      );
      const job = res.data.data;
      set({ activeJob: job });

      // Poll until analysis completes
      const intervalId = setInterval(async () => {
        try {
          const checkRes = await apiClient.get<{ success: boolean; data: RepositoryAnalysis | null }>(
            `/repositories/${repositoryId}/analysis/latest`
          );
          if (checkRes.data.data) {
            clearInterval(intervalId);
            set({
              latestAnalysis: checkRes.data.data,
              isAnalyzing: false,
            });
          }
        } catch {
          // Continue polling
        }
      }, 1500);

      // Auto-clear interval after 30 seconds as safeguard
      setTimeout(() => {
        clearInterval(intervalId);
        set({ isAnalyzing: false });
      }, 30000);

      return job;
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Failed to trigger repository analysis.";
      set({ error: msg, isAnalyzing: false });
      throw new Error(msg);
    }
  },
}));
