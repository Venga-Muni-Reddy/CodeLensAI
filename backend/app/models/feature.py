from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class FeatureStep(BaseModel):
    step_number: int
    layer: str  # routing, service, persistence, infra
    layer_title: str
    file_path: str
    symbol_name: str
    action_type: str  # e.g., "Calls Svc", "Query DB", "Tokens", "Return Payload"
    lines_range: str
    snippet: str

class DiscoveredFeature(BaseModel):
    id: str
    title: str
    description: str
    category: str  # auth, billing, rbac, domain, async
    confidence_score: float = 0.95
    confidence_label: str = "98% SEMANTIC MATCH"
    entrypoint_route: Optional[str] = None
    http_method: Optional[str] = None
    layers_count: int = 4
    files_count: int = 4
    sloc: int = 320
    is_deterministic: bool = True
    language_framework: str = "Python 3.11 / FastAPI"
    domain_context: str = "Core Domain"
    steps: List[FeatureStep] = Field(default_factory=list)
    schema_info: Dict[str, Any] = Field(default_factory=dict)
    security_guardrails: List[str] = Field(default_factory=list)
    dependencies: List[str] = Field(default_factory=list)

class FeatureQueryRequest(BaseModel):
    query: str

class FeatureDiscoveryResponse(BaseModel):
    repository_id: str
    features: List[DiscoveredFeature]
    total_discovered: int
    synced_symbols: int = 1204
    routes_count: int = 48
