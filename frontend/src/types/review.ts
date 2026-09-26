export interface CodeDiffBlock {
  file_path: string;
  start_line: number;
  end_line: number;
  old_code: string;
  new_code: string;
  language: string;
  patch_content: string;
}

export interface ReviewChecklistItem {
  id: string;
  text: string;
  subtext: string;
  checked: boolean;
  required_human: boolean;
}

export type ReviewSeverity = 'critical' | 'warning' | 'info';
export type ReviewCategory = 'security' | 'performance' | 'smell' | 'bug';

export interface ReviewFinding {
  id: string;
  title: string;
  rule_id: string;
  cwe_id?: string;
  severity: ReviewSeverity;
  category: ReviewCategory;
  file_path: string;
  line_number: number;
  description: string;
  cvss_score?: number;
  affected_callers_count: number;
  ai_diff_ready: boolean;
  diff_block: CodeDiffBlock;
  ai_explanation: string;
  confidence_pct: number;
  remediation_estimate: string;
  impact_horizon: string;
}

export interface ReviewSummaryMetrics {
  health_score: number;
  health_label: string;
  total_issues: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  security_count: number;
  performance_count: number;
  smell_count: number;
  bug_count: number;
  patches_ready_count: number;
  execution_time_ms: number;
  audited_files_count: number;
  scanner_engine: string;
}

export interface CodeReviewResponse {
  run_id: string;
  repository_id: string;
  project_id: string;
  metrics: ReviewSummaryMetrics;
  findings: ReviewFinding[];
  checklist: ReviewChecklistItem[];
  target_branch: string;
  compliance_summary: {
    owasp_top_10: string;
    eslint_pep8: string;
    clean_code_index: string;
    [key: string]: string;
  };
}

export type SeverityTab = 'all' | 'critical' | 'warning' | 'info';
export type CategoryFilter = 'all' | 'security' | 'performance' | 'smell' | 'bug';
export type DiffViewMode = 'side-by-side' | 'unified';
