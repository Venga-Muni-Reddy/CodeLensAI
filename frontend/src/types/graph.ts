export interface CouplingMetric {
  ca: number; // Afferent coupling (incoming callers)
  ce: number; // Efferent coupling (outgoing deps)
  instability: number; // Ce / (Ca + Ce)
  evaluation: string; // e.g. "Loose / Healthy"
}

export interface GraphNode {
  id: string; // File path e.g. "services/payment_processor.ts"
  label: string; // File basename
  path: string;
  language: string;
  layer: "routing" | "service" | "persistence" | "infra" | string;
  layer_name: string; // e.g. "[02] DOMAIN & SERVICES"
  sloc: number;
  complexity: number;
  complexity_grade: string; // e.g. "M (14)"
  in_degree: number;
  out_degree: number;
  in_callers: string[];
  out_dependencies: string[];
  coupling: CouplingMetric;
  blast_radius_pct: number;
  downstream_affected: number;
  risk_index: "Low" | "Moderate" | "High" | "Critical" | string;
  is_in_cycle: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: "import" | "call" | "inheritance" | string;
  is_cycle: boolean;
}

export interface ArchitectureLayer {
  key: string;
  name: string;
  description: string;
  file_count: number;
  sample_files: string[];
  color: string;
}

export interface ArchitectureClassification {
  pattern_name: string;
  confidence: number;
  confidence_display: string;
  description: string;
  layers: ArchitectureLayer[];
}

export interface GraphSummaryMetrics {
  total_nodes: number;
  total_edges: number;
  avg_fan_out: number;
  modularity_index: number;
  modularity_evaluation: string;
  cycle_count: number;
}

export interface DependencyGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  cycles: string[][];
  metrics: GraphSummaryMetrics;
}

export interface RepositoryGraphResponse {
  id: string;
  repository_id: string;
  owner_id: string;
  project_id: string;
  ast_engine: string;
  ast_status: string;
  architecture: ArchitectureClassification;
  file_graph: DependencyGraphData;
  module_graph: DependencyGraphData;
  created_at: string;
  updated_at: string;
}
