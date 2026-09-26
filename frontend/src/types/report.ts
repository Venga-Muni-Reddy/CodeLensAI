export type ReportPreset = 'executive' | 'security' | 'complete';
export type ExportFormat = 'pdf' | 'markdown' | 'docx';
export type WatermarkClassification =
  | 'CONFIDENTIAL - INTERNAL USE ONLY'
  | 'PROPRIETARY & STRICTLY PRIVATE'
  | 'EXECUTIVE CTO BRIEFING'
  | 'PUBLIC AUDIT DISCLOSURE';

export interface ReportTierItem {
  tier_number: string;
  name: string;
  framework: string;
  file_count: number;
  percentage: number;
  color: string;
}

export interface ReportFlowStep {
  step_number: number;
  step_type: string;
  symbol: string;
  detail: string;
}

export interface ReportFindingRow {
  rule_id: string;
  title: string;
  file_citation: string;
  cvss_score: number;
  severity_label: string;
  remediation_status: string;
}

export interface ReportKpiMetrics {
  health_score: number;
  health_label: string;
  critical_vulnerabilities: number;
  warning_vulnerabilities: number;
  martin_instability: number;
  martin_label: string;
  blast_radius_exposure: string;
  compliance_grade: string;
  ast_symbols_evaluated: number;
  audited_files_count: number;
}

export interface ReportSectionsConfig {
  executive_summary: boolean;
  architecture_tiers: boolean;
  dependency_coupling: boolean;
  business_flows: boolean;
  security_matrix: boolean;
  remediation_patches: boolean;
  ast_raw_dump: boolean;
  git_blame_heatmap: boolean;
}

export interface ReportDataResponse {
  dossier_id: string;
  project_id: string;
  repository_id: string;
  repository_name: string;
  target_branch: string;
  commit_sha: string;
  created_at: string;
  classification: string;
  preset_profile: string;
  author: string;
  metrics: ReportKpiMetrics;
  tiers: ReportTierItem[];
  critical_flow: ReportFlowStep[];
  findings: ReportFindingRow[];
  remediation_patch_snippet: string;
  sections_config: ReportSectionsConfig;
}
