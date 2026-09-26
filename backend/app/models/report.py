from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ReportTierItem(BaseModel):
    tier_number: str
    name: str
    framework: str
    file_count: int
    percentage: int
    color: str = "#38bdf8"


class ReportFlowStep(BaseModel):
    step_number: int
    step_type: str
    symbol: str
    detail: str


class ReportFindingRow(BaseModel):
    rule_id: str
    title: str
    file_citation: str
    cvss_score: float
    severity_label: str
    remediation_status: str


class ReportKpiMetrics(BaseModel):
    health_score: int = Field(94, description="0-100 overall score")
    health_label: str = Field("Optimal Modularity", description="Health badge")
    critical_vulnerabilities: int = 0
    warning_vulnerabilities: int = 1
    martin_instability: float = 0.32
    martin_label: str = "Balanced"
    blast_radius_exposure: str = "<15%"
    compliance_grade: str = "GRADE A (94/100)"
    ast_symbols_evaluated: int = 1204
    audited_files_count: int = 89


class ReportSectionsConfig(BaseModel):
    executive_summary: bool = True
    architecture_tiers: bool = True
    dependency_coupling: bool = True
    business_flows: bool = True
    security_matrix: bool = True
    remediation_patches: bool = True
    ast_raw_dump: bool = False
    git_blame_heatmap: bool = False


class ReportDataResponse(BaseModel):
    dossier_id: str = "RPT-2026-8812"
    project_id: str
    repository_id: str
    repository_name: str
    target_branch: str = "main"
    commit_sha: str = "5db7517c29"
    created_at: str
    classification: str = "CONFIDENTIAL - INTERNAL USE ONLY"
    preset_profile: str = "complete"  # executive | security | complete
    author: str = "CodeLens AI Autonomous Engine"
    metrics: ReportKpiMetrics
    tiers: List[ReportTierItem]
    critical_flow: List[ReportFlowStep]
    findings: List[ReportFindingRow]
    remediation_patch_snippet: str
    sections_config: ReportSectionsConfig
