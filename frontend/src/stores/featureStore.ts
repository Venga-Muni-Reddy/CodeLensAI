import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import type { DiscoveredFeature, FeatureDiscoveryResponse } from "../types/feature";

interface FeatureState {
  features: DiscoveredFeature[];
  selectedFeature: DiscoveredFeature | null;
  activeCategory: string;
  searchQuery: string;
  activeInspectorTab: "code" | "schema" | "security" | "deps";
  syncedSymbols: number;
  routesCount: number;
  isLoading: boolean;
  isRescanning: boolean;
  error: string | null;

  fetchFeatures: (repositoryId: string, projectId?: string, query?: string) => Promise<DiscoveredFeature[]>;
  discoverFeatures: (repositoryId: string, query: string, projectId?: string) => Promise<DiscoveredFeature[]>;
  rescanFeatures: (repositoryId: string, projectId: string) => Promise<boolean>;
  selectFeature: (feature: DiscoveredFeature | null) => void;
  setActiveCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  setActiveInspectorTab: (tab: "code" | "schema" | "security" | "deps") => void;
  clearError: () => void;
}

export const useFeatureStore = create<FeatureState>((set) => ({
  features: [],
  selectedFeature: null,
  activeCategory: "all",
  searchQuery: "How does user login and JWT rotation work across persistence layers?",
  activeInspectorTab: "code",
  syncedSymbols: 1204,
  routesCount: 48,
  isLoading: false,
  isRescanning: false,
  error: null,

  clearError: () => set({ error: null }),
  selectFeature: (feature) => set({ selectedFeature: feature }),
  setActiveCategory: (category) => set({ activeCategory: category }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveInspectorTab: (tab) => set({ activeInspectorTab: tab }),

  fetchFeatures: async (repositoryId: string, projectId?: string, query?: string) => {
    set({ isLoading: true, error: null });
    try {
      const url = projectId
        ? `/projects/${projectId}/repositories/${repositoryId}/features`
        : `/repositories/${repositoryId}/features`;
      
      const params: Record<string, string> = {};
      if (query && query.trim()) params.query = query.trim();

      const res = await apiClient.get<{ success: boolean; data: FeatureDiscoveryResponse }>(url, { params });
      const data = res.data.data;
      const feats = data.features || [];
      set({
        features: feats,
        syncedSymbols: data.synced_symbols || 1204,
        routesCount: data.routes_count || 48,
        selectedFeature: feats.length > 0 ? feats[0] : null,
        isLoading: false,
      });
      return feats;
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to retrieve repository features.";
      set({ error: msg, isLoading: false });
      return [];
    }
  },

  discoverFeatures: async (repositoryId: string, query: string, projectId?: string) => {
    set({ isLoading: true, error: null, searchQuery: query });
    try {
      const url = projectId
        ? `/projects/${projectId}/repositories/${repositoryId}/features/discover`
        : `/repositories/${repositoryId}/features/discover`;

      const res = await apiClient.post<{ success: boolean; data: FeatureDiscoveryResponse }>(url, { query });
      const data = res.data.data;
      const feats = data.features || [];
      set({
        features: feats,
        selectedFeature: feats.length > 0 ? feats[0] : null,
        isLoading: false,
      });
      return feats;
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to search features.";
      set({ error: msg, isLoading: false });
      return [];
    }
  },

  rescanFeatures: async (repositoryId: string, projectId: string) => {
    set({ isRescanning: true, error: null });
    try {
      const url = `/projects/${projectId}/repositories/${repositoryId}/features/rescan`;
      const res = await apiClient.post<{ success: boolean; data: FeatureDiscoveryResponse }>(url);
      const data = res.data.data;
      const feats = data.features || [];
      set({
        features: feats,
        selectedFeature: feats.length > 0 ? feats[0] : null,
        isRescanning: false,
      });
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to rescan semantic index.";
      set({ error: msg, isRescanning: false });
      return false;
    }
  },
}));
