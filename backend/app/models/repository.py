from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class RepositoryCreateGitHub(BaseModel):
    source_url: str = Field(..., description="GitHub repository HTTPS URL")
    default_branch: Optional[str] = Field("main", min_length=1, max_length=100, description="Branch to clone")
    auth_token: Optional[str] = Field(None, description="Optional GitHub PAT for private repositories")
    shallow_clone: bool = Field(True, description="Perform shallow clone (--depth 1)")
    exclude_binaries: bool = Field(True, description="Filter out binary files and large media")


class RepositoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Unique repository ID")
    project_id: str = Field(..., description="Parent project workspace ID")
    owner_id: str = Field(..., description="User ID of repository owner")
    name: str = Field(..., description="Repository name")
    source_type: str = Field("github", description="Source type: github or zip")
    source_url: Optional[str] = Field(None, description="Remote repository URL")
    default_branch: Optional[str] = Field("main", description="Active or default branch")
    commit_sha: Optional[str] = Field(None, description="HEAD commit SHA")
    size_bytes: int = Field(0, description="Total size in bytes")
    file_count: int = Field(0, description="Total source files count")
    status: str = Field("queued", description="Status: queued | cloning | ready | failed")
    storage_key: str = Field(..., description="Logical relative path to stored code")
    error_message: Optional[str] = Field(None, description="Error details if cloning failed")
    is_deleted: bool = Field(False, description="Soft deletion status")
    created_at: datetime
    updated_at: datetime
