export type SymbolType = "fn" | "class" | "endpoint" | "file";
export type LayerType = "routing" | "service" | "persistence" | "infra" | "test";
export type RiskLevel = "critical" | "high" | "moderate" | "low" | "safe";

export interface ImpactTarget {
  id: string;
  name: string;
  target_type: SymbolType;
  file_path: string;
  line_number?: number;
  layer: LayerType;
}

export interface ImpactNode {
  id: string;
  label: string;
  file_path: string;
  line_number?: number;
  node_type: "epicenter" | "caller" | "transitive" | "endpoint" | "test" | "service" | "controller" | "worker";
  ring: number; // 0=Epicenter, 1=Direct, 2=Transitive, 3=Outer Perimeter
  layer: LayerType;
  risk_level: RiskLevel;
  coupling_instability: number;
  incoming_count: number;
  outgoing_count: number;
  blast_weight_pct: number;
  impact_reason?: string;
  cyclomatic_complexity: number;
}

export interface ImpactEdge {
  id: string;
  source: string;
  target: string;
  hop: number;
  edge_type: "direct_call" | "transitive_consumer" | "api_exposure" | "test_assertion";
  is_breaking: boolean;
}

export interface DirectAffectedItem {
  symbol_name: string;
  file_path: string;
  line_number: number;
  caller_index: number;
  issue_type: string;
  description: string;
  severity: "critical" | "high" | "moderate";
}

export interface TransitiveAffectedItem {
  symbol_name: string;
  file_path: string;
  hops: number;
  tag: string;
  description: string;
}

export interface ExposedTestSuiteItem {
  test_file: string;
  test_type: "unit" | "e2e" | "integration";
  failure_prediction: string;
  test_cases_count: number;
  status: "at_risk" | "breaking_mock" | "warning";
}

export interface CodeDiffSnippet {
  file_path: string;
  lines_range: string;
  old_snippet: string;
  new_snippet: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface AIRefactoringAdvice {
  synthesis: string;
  contract_violations_count: number;
  checklist: ChecklistItem[];
  recommended_wrapper_snippet?: string;
}

export interface ImpactSummaryMetrics {
  blast_radius_score: number;
  risk_label: string;
  instability_index: number;
  total_nodes_affected: number;
  directly_affected_count: number;
  directly_affected_breakdown: Record<string, number>;
  transitive_dependents_count: number;
  architectural_layers_spanned: string[];
  test_suites_count: number;
  test_cases_count: number;
  exposed_public_endpoints_count: number;
  contract_breaks_detected: number;
  execution_time_ms: number;
  ast_engine: string;
}

export interface CandidateSymbol {
  id: string;
  name: string;
  type: SymbolType;
  file_path: string;
  line_number?: number;
  layer?: LayerType;
}

export interface ImpactAnalysisResponse {
  run_id: string;
  repository_id: string;
  target: ImpactTarget;
  depth: number;
  metrics: ImpactSummaryMetrics;
  concentric_nodes: ImpactNode[];
  concentric_edges: ImpactEdge[];
  direct_impact: DirectAffectedItem[];
  transitive_impact: TransitiveAffectedItem[];
  exposed_tests: ExposedTestSuiteItem[];
  diff_preview?: CodeDiffSnippet;
  ai_advisor: AIRefactoringAdvice;
  available_symbols: CandidateSymbol[];
}
