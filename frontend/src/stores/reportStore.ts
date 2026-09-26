import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import type {
  ReportDataResponse,
  ReportPreset,
  ExportFormat,
  WatermarkClassification,
  ReportSectionsConfig,
} from "../types/report";

const DEFAULT_SECTIONS: ReportSectionsConfig = {
  executive_summary: true,
  architecture_tiers: true,
  dependency_coupling: true,
  business_flows: true,
  security_matrix: true,
  remediation_patches: true,
  ast_raw_dump: false,
  git_blame_heatmap: false,
};

interface ReportState {
  reportData: ReportDataResponse | null;
  activePreset: ReportPreset;
  classification: WatermarkClassification;
  sectionsConfig: ReportSectionsConfig;
  exportFormat: ExportFormat;
  isCompiling: boolean;
  error: string | null;
  zoomLevel: number;
  pageViewMode: "single" | "dual";

  // Actions
  setActivePreset: (preset: ReportPreset) => void;
  setClassification: (classification: WatermarkClassification) => void;
  toggleSection: (sectionKey: keyof ReportSectionsConfig) => void;
  setExportFormat: (format: ExportFormat) => void;
  setZoomLevel: (zoom: number) => void;
  setPageViewMode: (mode: "single" | "dual") => void;
  clearError: () => void;

  fetchReport: (projectId: string, repositoryId: string) => Promise<ReportDataResponse | null>;
  recompileReport: (projectId: string, repositoryId: string) => Promise<ReportDataResponse | null>;
  downloadMarkdown: (projectId: string, repositoryId: string) => Promise<void>;
  downloadJson: (projectId: string, repositoryId: string) => Promise<void>;
}

export const useReportStore = create<ReportState>((set, get) => ({
  reportData: null,
  activePreset: "complete",
  classification: "CONFIDENTIAL - INTERNAL USE ONLY",
  sectionsConfig: DEFAULT_SECTIONS,
  exportFormat: "pdf",
  isCompiling: false,
  error: null,
  zoomLevel: 100,
  pageViewMode: "single",

  setActivePreset: (preset) => {
    // Presets can adjust the default active sections
    const current = { ...get().sectionsConfig };
    if (preset === "executive") {
      current.executive_summary = true;
      current.architecture_tiers = true;
      current.dependency_coupling = true;
      current.business_flows = false;
      current.security_matrix = false;
      current.remediation_patches = false;
    } else if (preset === "security") {
      current.executive_summary = true;
      current.architecture_tiers = false;
      current.dependency_coupling = false;
      current.business_flows = false;
      current.security_matrix = true;
      current.remediation_patches = true;
    } else {
      // complete
      current.executive_summary = true;
      current.architecture_tiers = true;
      current.dependency_coupling = true;
      current.business_flows = true;
      current.security_matrix = true;
      current.remediation_patches = true;
    }
    set({ activePreset: preset, sectionsConfig: current });
  },

  setClassification: (classification) => set({ classification }),

  toggleSection: (sectionKey) => {
    set((state) => ({
      sectionsConfig: {
        ...state.sectionsConfig,
        [sectionKey]: !state.sectionsConfig[sectionKey],
      },
    }));
  },

  setExportFormat: (format) => set({ exportFormat: format }),
  setZoomLevel: (zoom) => set({ zoomLevel: zoom }),
  setPageViewMode: (mode) => set({ pageViewMode: mode }),
  clearError: () => set({ error: null }),

  fetchReport: async (projectId, repositoryId) => {
    set({ isCompiling: true, error: null });
    try {
      const pId = projectId || "default-project";
      const rId = repositoryId || "default-repo";
      const preset = get().activePreset;
      const classification = get().classification;

      const res = await apiClient.get<any>(
        `/projects/${pId}/repositories/${rId}/report`,
        { params: { preset, classification } }
      );
      const data: ReportDataResponse = res.data?.data || res.data;
      set({ reportData: data, isCompiling: false });
      return data;
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to compile report";
      set({ error: msg, isCompiling: false });
      return null;
    }
  },

  recompileReport: async (projectId, repositoryId) => {
    set({ isCompiling: true, error: null });
    try {
      const pId = projectId || "default-project";
      const rId = repositoryId || "default-repo";
      const preset = get().activePreset;
      const classification = get().classification;
      const config = get().sectionsConfig;

      const res = await apiClient.post<any>(
        `/projects/${pId}/repositories/${rId}/report/compile`,
        config,
        { params: { preset, classification } }
      );
      const data: ReportDataResponse = res.data?.data || res.data;
      set({ reportData: data, isCompiling: false });
      return data;
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to re-compile report";
      set({ error: msg, isCompiling: false });
      return null;
    }
  },

  downloadMarkdown: async (projectId, repositoryId) => {
    try {
      const pId = projectId || "default-project";
      const rId = repositoryId || "default-repo";
      const preset = get().activePreset;
      const classification = get().classification;

      const res = await apiClient.get(
        `/projects/${pId}/repositories/${rId}/report/download/markdown`,
        {
          params: { preset, classification },
          responseType: "blob",
        }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `codelens-dossier-${repositoryId}.md`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download markdown report:", err);
    }
  },

  downloadJson: async (projectId, repositoryId) => {
    try {
      const pId = projectId || "default-project";
      const rId = repositoryId || "default-repo";
      const preset = get().activePreset;
      const classification = get().classification;

      const res = await apiClient.get(
        `/projects/${pId}/repositories/${rId}/report/download/json`,
        {
          params: { preset, classification },
          responseType: "blob",
        }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `codelens-dossier-${repositoryId}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download json dossier:", err);
    }
  },
}));
