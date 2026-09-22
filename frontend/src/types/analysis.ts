export interface LanguageStat {
  name: string;
  color: string;
  share_pct: number;
  total_lines: number;
  code_lines: number;
  comment_lines: number;
  file_count: number;
}

export interface FrameworkBadge {
  name: string;
  version?: string | null;
  category: "core" | "data_state" | "testing_tooling";
}

export interface FileMetric {
  relative_path: string;
  language: string;
  sloc: number;
  size_bytes: number;
  comment_ratio: number;
  ast_status: string;
}

export interface AnalysisSummary {
  total_files: number;
  total_lines: number;
  total_sloc: number;
  total_comments: number;
  total_blanks: number;
  comment_ratio: number;
  maintainability_grade: string;
  primary_tech_stack: string;
  architecture_pattern: string;
  architecture_tags: string[];
}

export interface RepositoryAnalysis {
  id: string;
  repository_id: string;
  owner_id: string;
  project_id: string;
  summary: AnalysisSummary;
  languages: LanguageStat[];
  frameworks: FrameworkBadge[];
  file_inventory: FileMetric[];
  created_at: string;
  updated_at: string;
}

export interface AnalysisJob {
  id: string;
  repository_id: string;
  owner_id: string;
  project_id: string;
  status: "queued" | "analyzing" | "completed" | "failed";
  stage: "crawler" | "tokenizer" | "manifest_parser" | "completed";
  progress_pct: number;
  latency_seconds?: number | null;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}
