export interface Citation {
  id: string;
  file_path: string;
  symbol_name?: string;
  line_start?: number;
  line_end?: number;
  snippet?: string;
  match_percentage: number;
  layer: "routing" | "domain" | "persistence" | "infra";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  citations: Citation[];
  provider_used?: string;
  model_used?: string;
  latency_ms?: number;
  fallback_occurred?: boolean;
  attempts?: string[];
  feedback?: "helpful" | "reported" | null;
  suggested_inquiries?: string[];
}

export interface Conversation {
  id: string;
  project_id: string;
  repository_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
  pinned: boolean;
  tags: string[];
  message_count: number;
}

export interface SendMessagePayload {
  message: string;
  conversation_id?: string;
  context_files?: string[];
  preferred_provider?: string;
  deep_rag?: boolean;
}
