import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import type { Project, ProjectCreatePayload, ProjectUpdatePayload } from "../types/project";

interface ProjectState {
  projects: Project[];
  activeProject: Project | null;
  isLoading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  createProject: (payload: ProjectCreatePayload) => Promise<Project>;
  updateProject: (id: string, payload: ProjectUpdatePayload) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  setActiveProject: (project: Project | null) => void;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProject: null,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get<{ success: boolean; data: Project[] }>("/projects");
      const list = response.data.data;
      set({
        projects: list,
        isLoading: false,
        activeProject: get().activeProject || (list.length > 0 ? list[0] : null),
      });
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Failed to fetch projects.";
      set({ error: message, isLoading: false });
    }
  },

  createProject: async (payload: ProjectCreatePayload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post<{ success: boolean; data: Project }>("/projects", payload);
      const newProj = response.data.data;
      const updated = [newProj, ...get().projects];
      set({
        projects: updated,
        activeProject: newProj,
        isLoading: false,
      });
      return newProj;
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Failed to create project.";
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  updateProject: async (id: string, payload: ProjectUpdatePayload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.patch<{ success: boolean; data: Project }>(`/projects/${id}`, payload);
      const updatedProj = response.data.data;
      const updatedList = get().projects.map((p) => (p.id === id ? updatedProj : p));
      set({
        projects: updatedList,
        activeProject: get().activeProject?.id === id ? updatedProj : get().activeProject,
        isLoading: false,
      });
      return updatedProj;
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Failed to update project.";
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  deleteProject: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.delete(`/projects/${id}`);
      const updatedList = get().projects.filter((p) => p.id !== id);
      const currentActive = get().activeProject;
      set({
        projects: updatedList,
        activeProject: currentActive?.id === id ? (updatedList.length > 0 ? updatedList[0] : null) : currentActive,
        isLoading: false,
      });
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Failed to delete project.";
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  setActiveProject: (project: Project | null) => {
    set({ activeProject: project });
  },
}));
