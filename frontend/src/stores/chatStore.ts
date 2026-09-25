import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import type { Conversation, ChatMessage, Citation } from "../types/chat";

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  activeCitation: Citation | null;
  deepRagEnabled: boolean;
  preferredProvider: string;
  attachedFiles: string[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;

  fetchConversations: (repositoryId: string, projectId?: string) => Promise<Conversation[]>;
  selectConversation: (conversationId: string) => void;
  createConversation: (repositoryId: string, projectId?: string, title?: string) => Promise<Conversation | null>;
  renameConversation: (repositoryId: string, conversationId: string, newTitle: string, projectId?: string) => Promise<boolean>;
  deleteConversation: (repositoryId: string, conversationId: string, projectId?: string) => Promise<boolean>;
  sendMessage: (repositoryId: string, text: string, projectId?: string) => Promise<ChatMessage | null>;
  submitFeedback: (repositoryId: string, conversationId: string, messageId: string, feedback: "helpful" | "reported", projectId?: string) => Promise<void>;
  toggleAttachedFile: (filePath: string) => void;
  setDeepRag: (enabled: boolean) => void;
  setPreferredProvider: (provider: string) => void;
  setActiveCitation: (citation: Citation | null) => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  activeCitation: null,
  deepRagEnabled: true,
  preferredProvider: "auto",
  attachedFiles: ["api/v1/auth.py", "services/auth_service.py", "repositories/user_repo.py", "core/security.py"],
  isLoading: false,
  isSending: false,
  error: null,

  clearError: () => set({ error: null }),
  setActiveCitation: (citation) => set({ activeCitation: citation }),
  setDeepRag: (enabled) => set({ deepRagEnabled: enabled }),
  setPreferredProvider: (provider) => set({ preferredProvider: provider }),

  toggleAttachedFile: (filePath: string) => {
    const current = get().attachedFiles;
    if (current.includes(filePath)) {
      set({ attachedFiles: current.filter((f) => f !== filePath) });
    } else {
      set({ attachedFiles: [...current, filePath] });
    }
  },

  selectConversation: (conversationId: string) => {
    const conv = get().conversations.find((c) => c.id === conversationId);
    if (conv) {
      set({ activeConversation: conv });
      // Set first citation as active citation if available
      const lastAiMsg = [...conv.messages].reverse().find((m) => m.role === "assistant" && m.citations?.length > 0);
      if (lastAiMsg && lastAiMsg.citations.length > 0) {
        set({ activeCitation: lastAiMsg.citations[0] });
      }
    }
  },

  fetchConversations: async (repositoryId: string, projectId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const url = projectId
        ? `/projects/${projectId}/repositories/${repositoryId}/chat/conversations`
        : `/repositories/${repositoryId}/chat/conversations`;

      const res = await apiClient.get<{ success: boolean; data: Conversation[] }>(url);
      const convs = res.data.data || [];
      const currentActive = get().activeConversation;
      
      let nextActive = convs.length > 0 ? convs[0] : null;
      if (currentActive) {
        const found = convs.find((c) => c.id === currentActive.id);
        if (found) nextActive = found;
      }

      set({
        conversations: convs,
        activeConversation: nextActive,
        isLoading: false,
      });

      if (nextActive) {
        const lastAiMsg = [...nextActive.messages].reverse().find((m) => m.role === "assistant" && m.citations?.length > 0);
        if (lastAiMsg && lastAiMsg.citations.length > 0) {
          set({ activeCitation: lastAiMsg.citations[0] });
        }
      }

      return convs;
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to load chat conversations.";
      set({ error: msg, isLoading: false });
      return [];
    }
  },

  createConversation: async (repositoryId: string, projectId?: string, title?: string) => {
    set({ isSending: true, error: null });
    try {
      const url = projectId
        ? `/projects/${projectId}/repositories/${repositoryId}/chat/conversations`
        : `/repositories/${repositoryId}/chat/conversations`;

      const res = await apiClient.post<{ success: boolean; data: Conversation }>(url, {
        title: title || "New Chat Thread",
        tags: ["AST Ingested"],
      });
      const newConv = res.data.data;
      set((state) => ({
        conversations: [newConv, ...state.conversations],
        activeConversation: newConv,
        activeCitation: null,
        isSending: false,
      }));
      return newConv;
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to create conversation.";
      set({ error: msg, isSending: false });
      return null;
    }
  },

  renameConversation: async (repositoryId: string, conversationId: string, newTitle: string, projectId?: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return false;
    try {
      const url = projectId
        ? `/projects/${projectId}/repositories/${repositoryId}/chat/conversations/${conversationId}`
        : `/repositories/${repositoryId}/chat/conversations/${conversationId}`;

      const res = await apiClient.patch<{ success: boolean; data: Conversation }>(url, { title: trimmed });
      const updated = res.data.data;

      set((state) => ({
        conversations: state.conversations.map((c) => (c.id === conversationId ? updated : c)),
        activeConversation: state.activeConversation?.id === conversationId ? updated : state.activeConversation,
      }));
      return true;
    } catch {
      // Optimistically update in memory if network or mock
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, title: trimmed, updated_at: new Date().toISOString() } : c
        ),
        activeConversation:
          state.activeConversation?.id === conversationId
            ? { ...state.activeConversation, title: trimmed, updated_at: new Date().toISOString() }
            : state.activeConversation,
      }));
      return true;
    }
  },

  deleteConversation: async (repositoryId: string, conversationId: string, projectId?: string) => {
    try {
      const url = projectId
        ? `/projects/${projectId}/repositories/${repositoryId}/chat/conversations/${conversationId}`
        : `/repositories/${repositoryId}/chat/conversations/${conversationId}`;

      await apiClient.delete(url);
      set((state) => {
        const filtered = state.conversations.filter((c) => c.id !== conversationId);
        return {
          conversations: filtered,
          activeConversation: state.activeConversation?.id === conversationId ? (filtered[0] || null) : state.activeConversation,
        };
      });
      return true;
    } catch {
      return false;
    }
  },

  sendMessage: async (repositoryId: string, text: string, projectId?: string) => {
    if (!text.trim()) return null;

    const { activeConversation, attachedFiles, deepRagEnabled, preferredProvider } = get();
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
      citations: [],
    };

    // Optimistically append user message
    if (activeConversation) {
      const updatedMessages = [...activeConversation.messages, tempUserMsg];
      set({
        isSending: true,
        activeConversation: {
          ...activeConversation,
          messages: updatedMessages,
          message_count: updatedMessages.length,
        },
      });
    } else {
      set({ isSending: true });
    }

    try {
      const url = projectId
        ? `/projects/${projectId}/repositories/${repositoryId}/chat/message`
        : `/repositories/${repositoryId}/chat/message`;

      const payload = {
        message: text,
        conversation_id: activeConversation?.id,
        context_files: attachedFiles,
        preferred_provider: preferredProvider === "auto" ? "openrouter" : preferredProvider,
        deep_rag: deepRagEnabled,
      };

      const res = await apiClient.post<{
        success: boolean;
        data: { conversation: Conversation; message: ChatMessage };
      }>(url, payload);

      const { conversation: updatedConv, message: aiMsg } = res.data.data;

      set((state) => {
        const nextConvs = state.conversations.map((c) => (c.id === updatedConv.id ? updatedConv : c));
        if (!nextConvs.some((c) => c.id === updatedConv.id)) {
          nextConvs.unshift(updatedConv);
        }
        return {
          conversations: nextConvs,
          activeConversation: updatedConv,
          activeCitation: aiMsg.citations && aiMsg.citations.length > 0 ? aiMsg.citations[0] : state.activeCitation,
          isSending: false,
        };
      });

      return aiMsg;
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to process AI response.";
      set({ error: msg, isSending: false });
      return null;
    }
  },

  submitFeedback: async (
    repositoryId: string,
    conversationId: string,
    messageId: string,
    feedback: "helpful" | "reported",
    projectId?: string
  ) => {
    try {
      const url = projectId
        ? `/projects/${projectId}/repositories/${repositoryId}/chat/conversations/${conversationId}/messages/${messageId}/feedback`
        : `/repositories/${repositoryId}/chat/conversations/${conversationId}/messages/${messageId}/feedback`;

      await apiClient.post(url, { feedback });

      set((state) => {
        if (!state.activeConversation) return state;
        const msgs = state.activeConversation.messages.map((m) =>
          m.id === messageId ? { ...m, feedback } : m
        );
        return {
          activeConversation: {
            ...state.activeConversation,
            messages: msgs,
          },
        };
      });
    } catch (err) {
      console.warn("Error submitting feedback:", err);
    }
  },
}));
