import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import type { User, LoginPayload, RegisterPayload, AuthResponseData } from "../types/auth";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  clearError: () => void;
}

const TOKEN_STORAGE_KEY = "codelens_access_token";

export const useAuthStore = create<AuthState>((set, get) => {
  // Attach token interceptor to apiClient
  apiClient.interceptors.request.use((config) => {
    const token = get().token || localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return {
    user: null,
    token: localStorage.getItem(TOKEN_STORAGE_KEY),
    isAuthenticated: !!localStorage.getItem(TOKEN_STORAGE_KEY),
    isLoading: false,
    error: null,

    clearError: () => set({ error: null }),

    login: async (payload: LoginPayload) => {
      set({ isLoading: true, error: null });
      try {
        const response = await apiClient.post<{ success: boolean; data: AuthResponseData }>(
          "/auth/login",
          payload
        );
        const data = response.data.data;
        localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
        set({
          user: data.user,
          token: data.access_token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } catch (err: any) {
        const message =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          "Authentication failed. Please check your credentials.";
        set({ error: message, isLoading: false });
        throw new Error(message);
      }
    },

    register: async (payload: RegisterPayload) => {
      set({ isLoading: true, error: null });
      try {
        await apiClient.post("/auth/register", payload);
        // Automatically login after successful registration
        await get().login({ email: payload.email, password: payload.password });
      } catch (err: any) {
        const message =
          err.response?.data?.error?.message ||
          err.response?.data?.detail?.[0]?.msg ||
          "Registration failed. Please try again.";
        set({ error: message, isLoading: false });
        throw new Error(message);
      }
    },

    logout: async () => {
      try {
        await apiClient.post("/auth/logout").catch(() => {});
      } finally {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      }
    },

    fetchMe: async () => {
      const token = get().token || localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!token) return;

      set({ isLoading: true });
      try {
        const response = await apiClient.get<{ success: boolean; data: User }>("/auth/me");
        set({
          user: response.data.data,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (err: any) {
        // Token expired or invalid
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    },
  };
});
