from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

class ImpactTarget(BaseModel):
    id: str = Field(..., description="Target symbol identifier e.g. PaymentService.processPayment()")
    name: str = Field(..., description="Display name of the symbol")
    target_type: str = Field("fn", description="Symbol type: fn | class | endpoint | file")
    file_path: str = Field(..., description="Source file path")
    line_number: Optional[int] = Field(None, description="Line number of declaration")
    layer: str = Field("service", description="routing | service | persistence | infra")

class ImpactNode(BaseModel):
    id: str = Field(..., description="Unique node key e.g. CheckoutController")
    label: str = Field(..., description="Display label e.g. CheckoutController.processOrder()")
    file_path: str = Field(..., description="File path of node")
    line_number: Optional[int] = Field(None, description="Line number")
    node_type: str = Field("caller", description="epicenter | caller | transitive | endpoint | test | service | controller | worker")
    ring: int = Field(1, description="Orbit ring: 0=Epicenter, 1=Direct, 2=Transitive, 3=Outer Perimeter")
    layer: str = Field("service", description="routing | service | persistence | infra | test")
    risk_level: str = Field("moderate", description="critical | high | moderate | low | safe")
    coupling_instability: float = Field(0.5, description="Instability metric 0.0 - 1.0")
    incoming_count: int = Field(0, description="Incoming caller count")
    outgoing_count: int = Field(0, description="Outgoing dependency count")
    blast_weight_pct: float = Field(5.0, description="Relative blast weight percentage")
    impact_reason: Optional[str] = Field(None, description="Why this node is affected")
    cyclomatic_complexity: int = Field(5, description="Cyclomatic complexity estimate")

class ImpactEdge(BaseModel):
    id: str = Field(..., description="Edge ID e.g. source->target")
    source: str = Field(..., description="Source node id")
    target: str = Field(..., description="Target node id")
    hop: int = Field(1, description="Hop distance 1-4")
    edge_type: str = Field("direct_call", description="direct_call | transitive_consumer | api_exposure | test_assertion")
    is_breaking: bool = Field(False, description="True if contract breaking")

class DirectAffectedItem(BaseModel):
    symbol_name: str
    file_path: str
    line_number: int
    caller_index: int
    issue_type: str = Field("Param Mismatch", description="Param Mismatch | Return Type | Signature Divergence | Async Await")
    description: str
    severity: str = Field("critical", description="critical | high | moderate")

class TransitiveAffectedItem(BaseModel):
    symbol_name: str
    file_path: str
    hops: int = 2
    tag: str = Field("Async Retry", description="Async Retry | SDK Schema | State Mutation | Cache Invalidation")
    description: str

class ExposedTestSuiteItem(BaseModel):
    test_file: str
    test_type: str = Field("unit", description="unit | e2e | integration")
    failure_prediction: str
    test_cases_count: int = 1
    status: str = Field("at_risk", description="at_risk | breaking_mock | warning")

class CodeDiffSnippet(BaseModel):
    file_path: str
    lines_range: str
    old_snippet: str
    new_snippet: str

class AIRefactoringAdvice(BaseModel):
    synthesis: str
    contract_violations_count: int = 0
    checklist: List[Dict[str, Any]] = Field(default_factory=list)
    recommended_wrapper_snippet: Optional[str] = None

class ImpactSummaryMetrics(BaseModel):
    blast_radius_score: int = Field(74, description="Blast score 0-100")
    risk_label: str = Field("HIGH RISK", description="CRITICAL RISK | HIGH RISK | MODERATE RISK | LOW RISK")
    instability_index: float = Field(0.78, description="Coupling instability 0.0 - 1.0")
    total_nodes_affected: int = Field(25, description="Total nodes impacted")
    directly_affected_count: int = Field(6, description="Direct callers affected")
    directly_affected_breakdown: Dict[str, int] = Field(default_factory=lambda: {"controllers": 3, "services": 2, "webhooks": 1})
    transitive_dependents_count: int = Field(19, description="Transitive modules impacted")
    architectural_layers_spanned: List[str] = Field(default_factory=lambda: ["Routing", "Domain", "Data", "Infra"])
    test_suites_count: int = Field(8, description="Exposed test suites")
    test_cases_count: int = Field(34, description="Exposed test cases")
    exposed_public_endpoints_count: int = Field(3, description="Exposed public endpoints")
    contract_breaks_detected: int = Field(2, description="Number of breaking changes detected")
    execution_time_ms: int = Field(84, description="Analysis execution duration in ms")
    ast_engine: str = Field("Tree-Sitter AST v3.1", description="AST engine used")

class ImpactAnalysisRequest(BaseModel):
    target_symbol: Optional[str] = Field(None, description="Specific symbol or function to analyze")
    target_type: str = Field("fn", description="fn | class | endpoint | file")
    depth: int = Field(3, description="Analysis depth hops 1 to 4")
    proposed_diff: Optional[str] = Field(None, description="Optional proposed code change diff")

class ImpactAnalysisResponse(BaseModel):
    run_id: str = Field("IR-4092", description="Execution run identifier")
    repository_id: str
    target: ImpactTarget
    depth: int
    metrics: ImpactSummaryMetrics
    concentric_nodes: List[ImpactNode] = Field(default_factory=list)
    concentric_edges: List[ImpactEdge] = Field(default_factory=list)
    direct_impact: List[DirectAffectedItem] = Field(default_factory=list)
    transitive_impact: List[TransitiveAffectedItem] = Field(default_factory=list)
    exposed_tests: List[ExposedTestSuiteItem] = Field(default_factory=list)
    diff_preview: Optional[CodeDiffSnippet] = None
    ai_advisor: AIRefactoringAdvice
    available_symbols: List[Dict[str, Any]] = Field(default_factory=list)
