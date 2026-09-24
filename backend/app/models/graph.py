from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CouplingMetric(BaseModel):
    ca: int = Field(0, description="Afferent coupling (incoming callers / dependents)")
    ce: int = Field(0, description="Efferent coupling (outgoing dependencies)")
    instability: float = Field(0.0, description="Instability metric Ce / (Ca + Ce), range 0.0 to 1.0")
    evaluation: str = Field("Balanced", description="Loose / Healthy | Stable | Unstable")


class GraphNode(BaseModel):
    id: str = Field(..., description="Unique node identifier (relative normalized path or module key)")
    label: str = Field(..., description="Display label (filename e.g. payment_processor.ts)")
    path: str = Field(..., description="Full relative file path")
    language: str = Field("Other", description="Detected language")
    layer: str = Field("infra", description="routing | service | persistence | infra | util")
    layer_name: str = Field("Infrastructure & Core", description="Human-friendly layer title")
    sloc: int = Field(0, description="Source lines of code")
    complexity: int = Field(1, description="Estimated cyclomatic complexity")
    complexity_grade: str = Field("L (1)", description="Complexity grade e.g. L (5), M (14), H (25)")
    in_degree: int = Field(0, description="Number of incoming caller files")
    out_degree: int = Field(0, description="Number of outgoing dependency modules")
    in_callers: List[str] = Field(default_factory=list, description="List of incoming file paths")
    out_dependencies: List[str] = Field(default_factory=list, description="List of outgoing file paths")
    coupling: CouplingMetric = Field(default_factory=CouplingMetric, description="Coupling metrics")
    blast_radius_pct: float = Field(0.0, description="Estimated blast radius percentage of codebase")
    downstream_affected: int = Field(0, description="Number of downstream reachable files")
    risk_index: str = Field("Low", description="Low | Moderate | High | Critical")
    is_in_cycle: bool = Field(False, description="True if involved in a circular dependency")


class GraphEdge(BaseModel):
    id: str = Field(..., description="Unique edge identifier e.g. source->target")
    source: str = Field(..., description="Source node id")
    target: str = Field(..., description="Target node id")
    type: str = Field("import", description="import | call | inheritance")
    is_cycle: bool = Field(False, description="True if edge participates in a detected circular loop")


class ArchitectureLayer(BaseModel):
    key: str = Field(..., description="routing | service | persistence | infra")
    name: str = Field(..., description="Layer display name e.g. [01] ROUTING")
    description: str = Field(..., description="Layer purpose and scope")
    file_count: int = Field(0, description="Count of files in this layer")
    sample_files: List[str] = Field(default_factory=list, description="Representative file paths")
    color: str = Field("#6366f1", description="UI accent color for this layer")


class ArchitectureClassification(BaseModel):
    pattern_name: str = Field("Layered / Clean Architecture", description="Detected architecture pattern archetype")
    confidence: float = Field(0.94, description="Pattern detection confidence (0.0 - 1.0)")
    confidence_display: str = Field("94% Confidence", description="Formatted confidence label")
    description: str = Field("", description="Architectural summary and rationale")
    layers: List[ArchitectureLayer] = Field(default_factory=list, description="Discovered architectural tiers")


class GraphSummaryMetrics(BaseModel):
    total_nodes: int = Field(0, description="Total files or modules in graph")
    total_edges: int = Field(0, description="Total inter-file dependency linkages")
    avg_fan_out: float = Field(0.0, description="Average outgoing dependencies per node")
    modularity_index: float = Field(0.80, description="Modularity score 0.0 - 1.0")
    modularity_evaluation: str = Field("Healthy", description="Healthy | Moderate | Tightly Coupled")
    cycle_count: int = Field(0, description="Number of circular dependency cycles detected")


class DependencyGraphData(BaseModel):
    nodes: List[GraphNode] = Field(default_factory=list, description="Graph nodes")
    edges: List[GraphEdge] = Field(default_factory=list, description="Graph directed edges")
    cycles: List[List[str]] = Field(default_factory=list, description="List of circular import chains")
    metrics: GraphSummaryMetrics = Field(default_factory=GraphSummaryMetrics, description="Graph aggregate metrics")


class RepositoryGraphResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Graph record ID")
    repository_id: str = Field(..., description="Target repository ID")
    owner_id: str = Field(..., description="Owner user ID")
    project_id: str = Field(..., description="Parent project ID")
    ast_engine: str = Field("Tree-Sitter AST v3.1", description="AST engine version")
    ast_status: str = Field("Synchronized", description="AST synchronization state")
    architecture: ArchitectureClassification = Field(..., description="Detected architecture and layers")
    file_graph: DependencyGraphData = Field(..., description="Granular file-to-file dependency graph")
    module_graph: DependencyGraphData = Field(..., description="Aggregated module/package dependency graph")
    created_at: datetime
    updated_at: datetime
