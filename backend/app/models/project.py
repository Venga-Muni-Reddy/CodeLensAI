from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Project name")
    description: Optional[str] = Field(None, max_length=500, description="Brief project description")


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Updated project name")
    description: Optional[str] = Field(None, max_length=500, description="Updated project description")


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Unique project ID")
    owner_id: str = Field(..., description="User ID of the project owner")
    name: str
    description: Optional[str] = None
    repository_count: int = 0
    is_deleted: bool = False
    created_at: datetime
    updated_at: datetime
