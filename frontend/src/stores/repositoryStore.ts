import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import type { Repository, RepositoryCreateGitHubPayload, RepositoryCreateZipPayload } from "../types/repository";

interface RepositoryState {
  repositories: Repository[];
  activeRepository: Repository | null;
  isLoading: boolean;
  isIngesting: boolean;
  error: string | null;

  fetchRepositories: (projectId: string) => Promise<void>;
  importGitHubRepository: (projectId: string, payload: RepositoryCreateGitHubPayload) => Promise<Repository>;
  importZipRepository: (projectId: string, payload: RepositoryCreateZipPayload) => Promise<Repository>;
  deleteRepository: (repositoryId: string) => Promise<void>;
  pollRepositoryStatus: (repositoryId: string) => Promise<Repository>;
  setActiveRepository: (repo: Repository | null) => void;
  clearError: () => void;
}

export const useRepositoryStore = create<RepositoryState>((set, get) => ({
  repositories: [],
  activeRepository: null,
  isLoading: false,
  isIngesting: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchRepositories: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get<{ success: boolean; data: Repository[] }>(
        `/projects/${projectId}/repositories`
      );
      set({
        repositories: response.data.data,
        isLoading: false,
      });
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Failed to fetch repositories.";
      set({ error: message, isLoading: false });
    }
  },

  importGitHubRepository: async (projectId: string, payload: RepositoryCreateGitHubPayload) => {
    set({ isIngesting: true, error: null });
    try {
      const response = await apiClient.post<{ success: boolean; data: Repository }>(
        `/projects/${projectId}/repositories/github`,
        payload
      );
      const newRepo = response.data.data;
      set({
        repositories: [newRepo, ...get().repositories],
        activeRepository: newRepo,
        isIngesting: false,
      });
      return newRepo;
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Failed to import GitHub repository.";
      set({ error: message, isIngesting: false });
      throw new Error(message);
    }
  },

  importZipRepository: async (projectId: string, payload: RepositoryCreateZipPayload) => {
    set({ isIngesting: true, error: null });
    try {
      const formData = new FormData();
      formData.append("file", payload.file);
      if (payload.name) formData.append("name", payload.name);
      if (payload.branch) formData.append("branch", payload.branch);
      formData.append("exclude_dependencies", String(payload.exclude_dependencies ?? true));
      formData.append("exclude_binaries", String(payload.exclude_binaries ?? true));

      const response = await apiClient.post<{ success: boolean; data: Repository }>(
        `/projects/${projectId}/repositories/zip`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      const newRepo = response.data.data;
      set({
        repositories: [newRepo, ...get().repositories],
        activeRepository: newRepo,
        isIngesting: false,
      });
      return newRepo;
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Failed to upload ZIP repository.";
      set({ error: message, isIngesting: false });
      throw new Error(message);
    }
  },

  pollRepositoryStatus: async (repositoryId: string) => {
    try {
      const response = await apiClient.get<{ success: boolean; data: Repository }>(
        `/repositories/${repositoryId}`
      );
      const updated = response.data.data;
      set({
        repositories: get().repositories.map((r) => (r.id === repositoryId ? updated : r)),
        activeRepository: get().activeRepository?.id === repositoryId ? updated : get().activeRepository,
      });
      return updated;
    } catch (err: any) {
      throw err;
    }
  },

  deleteRepository: async (repositoryId: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.delete(`/repositories/${repositoryId}`);
      const updatedList = get().repositories.filter((r) => r.id !== repositoryId);
      set({
        repositories: updatedList,
        activeRepository: get().activeRepository?.id === repositoryId ? null : get().activeRepository,
        isLoading: false,
      });
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Failed to delete repository.";
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  setActiveRepository: (repo: Repository | null) => {
    set({ activeRepository: repo });
  },
}));
