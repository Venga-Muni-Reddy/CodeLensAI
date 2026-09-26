from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CodeDiffBlock(BaseModel):
    file_path: str
    start_line: int
    end_line: int
    old_code: str
    new_code: str
    language: str = Field("python", description="Language for syntax highlighting")
    patch_content: str = Field("", description="Unified diff patch representation")


class ReviewChecklistItem(BaseModel):
    id: str
    text: str
    subtext: str
    checked: bool = True
    required_human: bool = False


class ReviewFinding(BaseModel):
    id: str
    title: str
    rule_id: str
    cwe_id: Optional[str] = None
    severity: str = Field("critical", description="critical | warning | info")
    category: str = Field("security", description="security | performance | smell | bug")
    file_path: str
    line_number: int
    description: str
    cvss_score: Optional[float] = None
    affected_callers_count: int = 0
    ai_diff_ready: bool = True
    diff_block: CodeDiffBlock
    ai_explanation: str
    confidence_pct: float = 98.5
    remediation_estimate: str = "~5 minutes"
    impact_horizon: str = "Production API Security"


class ReviewSummaryMetrics(BaseModel):
    health_score: int = Field(78, description="Overall repository health score 0 - 100")
    health_label: str = Field("Moderate Health", description="Health classification")
    total_issues: int = Field(18, description="Total detected issues")
    critical_count: int = Field(3, description="Critical severity issues")
    warning_count: int = Field(9, description="Warning severity issues")
    info_count: int = Field(6, description="Info/Code smell issues")
    security_count: int = Field(4, description="Security vulnerability count")
    performance_count: int = Field(5, description="Performance anti-pattern count")
    smell_count: int = Field(6, description="Code smell / complexity count")
    bug_count: int = Field(3, description="Bug hazard count")
    patches_ready_count: int = Field(14, description="Count of findings with verified auto-patches")
    execution_time_ms: int = Field(380, description="Audit execution duration in ms")
    audited_files_count: int = Field(142, description="Total source files audited")
    scanner_engine: str = Field("SemGrep AST v1.8 + Neural Heuristics", description="Audit scanner engine")


class CodeReviewResponse(BaseModel):
    run_id: str = Field("REV-2026-9041", description="Audit execution run identifier")
    repository_id: str
    project_id: str
    metrics: ReviewSummaryMetrics
    findings: List[ReviewFinding]
    checklist: List[ReviewChecklistItem]
    target_branch: str = Field("main", description="Target git branch audited")
    compliance_summary: Dict[str, Any] = Field(default_factory=lambda: {
        "owasp_top_10": "3 Violations",
        "eslint_pep8": "Enforced",
        "clean_code_index": "84%"
    })
