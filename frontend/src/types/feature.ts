export interface FeatureStep {
  step_number: number;
  layer: "routing" | "service" | "persistence" | "infra";
  layer_title: string;
  file_path: string;
  symbol_name: string;
  action_type: string;
  lines_range: string;
  snippet: string;
}

export interface DiscoveredFeature {
  id: string;
  title: string;
  description: string;
  category: "auth" | "billing" | "rbac" | "domain" | "async";
  confidence_score: number;
  confidence_label: string;
  entrypoint_route?: string;
  http_method?: string;
  layers_count: number;
  files_count: number;
  sloc: number;
  is_deterministic: boolean;
  language_framework: string;
  domain_context: string;
  steps: FeatureStep[];
  schema_info: Record<string, any>;
  security_guardrails: string[];
  dependencies: string[];
}

export interface FeatureDiscoveryResponse {
  repository_id: string;
  features: DiscoveredFeature[];
  total_discovered: number;
  synced_symbols: number;
  routes_count: number;
}
