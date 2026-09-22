from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class LanguageStat(BaseModel):
    name: str = Field(..., description="Programming language name")
    color: str = Field("#6366f1", description="Hex color for UI visualization")
    share_pct: float = Field(0.0, description="Percentage of total code")
    total_lines: int = Field(0, description="Total physical lines")
    code_lines: int = Field(0, description="Source lines of code (SLOC)")
    comment_lines: int = Field(0, description="Comment lines")
    file_count: int = Field(0, description="Number of matching files")


class FrameworkBadge(BaseModel):
    name: str = Field(..., description="Framework or library name")
    version: Optional[str] = Field(None, description="Resolved version string")
    category: str = Field("core", description="core | data_state | testing_tooling")


class FileMetric(BaseModel):
    relative_path: str = Field(..., description="Path relative to repository root")
    language: str = Field("Other", description="Detected language")
    sloc: int = Field(0, description="Source lines of code")
    size_bytes: int = Field(0, description="File size in bytes")
    comment_ratio: float = Field(0.0, description="Ratio of comments to total lines")
    ast_status: str = Field("AST Mapped", description="AST readiness indicator")


class AnalysisSummary(BaseModel):
    total_files: int = Field(0, description="Total analyzed source files")
    total_lines: int = Field(0, description="Total lines across all files")
    total_sloc: int = Field(0, description="Total source lines of code")
    total_comments: int = Field(0, description="Total comment lines")
    total_blanks: int = Field(0, description="Total blank lines")
    comment_ratio: float = Field(0.0, description="Overall comment density percentage")
    maintainability_grade: str = Field("A+ Clean", description="Heuristic maintainability grade")
    primary_tech_stack: str = Field("General", description="Primary detected tech stack headline")
    architecture_pattern: str = Field("Modular Architecture", description="Inferred architecture style")
    architecture_tags: List[str] = Field(default_factory=list, description="Architecture style tags")


class RepositoryAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Analysis result ID")
    repository_id: str = Field(..., description="Target repository ID")
    owner_id: str = Field(..., description="Owner user ID")
    project_id: str = Field(..., description="Parent project ID")
    summary: AnalysisSummary = Field(..., description="Aggregate code metrics summary")
    languages: List[LanguageStat] = Field(default_factory=list, description="Language breakdown")
    frameworks: List[FrameworkBadge] = Field(default_factory=list, description="Detected frameworks")
    file_inventory: List[FileMetric] = Field(default_factory=list, description="Granular file metrics")
    created_at: datetime
    updated_at: datetime


class AnalysisJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Analysis job ID")
    repository_id: str = Field(..., description="Target repository ID")
    owner_id: str = Field(..., description="Owner user ID")
    project_id: str = Field(..., description="Parent project ID")
    status: str = Field("queued", description="queued | analyzing | completed | failed")
    stage: str = Field("crawler", description="crawler | tokenizer | manifest_parser | completed")
    progress_pct: int = Field(0, description="Progress 0-100")
    latency_seconds: Optional[float] = Field(None, description="Total execution duration")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
