from typing import List
from fastapi import APIRouter, Depends, status, Response
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_db, get_current_user
from app.core.errors import success_response
from app.models.user import UserResponse
from app.models.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.modules.project import service as project_service

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("", status_code=status.HTTP_201_CREATED, summary="Create a new project workspace")
async def create_project(
    project_in: ProjectCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Create a new project workspace isolated to the authenticated user."""
    project = await project_service.create_project(
        db=db,
        owner_id=current_user.id,
        project_in=project_in,
    )
    return success_response(
        data=project.model_dump(mode="json"),
        message="Project workspace created successfully.",
    )


@router.get("", summary="List user's active projects")
async def list_projects(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List all non-deleted projects belonging to the current user."""
    projects = await project_service.list_user_projects(
        db=db,
        owner_id=current_user.id,
    )
    return success_response(
        data=[p.model_dump(mode="json") for p in projects],
    )


@router.get("/{project_id}", summary="Get project details")
async def get_project(
    project_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get project details by ID with tenant isolation verification."""
    project = await project_service.get_project(
        db=db,
        project_id=project_id,
        owner_id=current_user.id,
    )
    return success_response(
        data=project.model_dump(mode="json"),
    )


@router.patch("/{project_id}", summary="Update project metadata")
async def update_project(
    project_id: str,
    project_in: ProjectUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update project name or description."""
    updated = await project_service.update_project(
        db=db,
        project_id=project_id,
        owner_id=current_user.id,
        project_in=project_in,
    )
    return success_response(
        data=updated.model_dump(mode="json"),
        message="Project workspace updated successfully.",
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Soft delete project")
async def delete_project(
    project_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Soft-delete a project workspace."""
    await project_service.delete_project(
        db=db,
        project_id=project_id,
        owner_id=current_user.id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
