from typing import List
from fastapi import APIRouter, Depends, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user, get_db
from app.core.errors import success_response
from app.models.repository import RepositoryCreateGitHub, RepositoryResponse
from app.models.user import UserResponse
from app.modules.repository import service as repo_service

router = APIRouter(tags=["Repositories"])


@router.post(
    "/projects/{project_id}/repositories/github",
    status_code=status.HTTP_201_CREATED,
    summary="Import GitHub repository into project workspace",
)
async def import_github_repository(
    project_id: str,
    payload: RepositoryCreateGitHub,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Import and shallow-clone a public or private GitHub repository into a project workspace."""
    repo = await repo_service.create_github_repository(
        db=db,
        owner_id=current_user.id,
        project_id=project_id,
        payload=payload,
    )
    return success_response(
        data=repo.model_dump(mode="json"),
        message="Repository ingestion initiated.",
    )


@router.get(
    "/projects/{project_id}/repositories",
    summary="List all repositories in a project workspace",
)
async def list_project_repositories(
    project_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List all active repositories belonging to the specified project."""
    repos = await repo_service.list_project_repositories(
        db=db,
        owner_id=current_user.id,
        project_id=project_id,
    )
    return success_response(
        data=[r.model_dump(mode="json") for r in repos],
    )


@router.get(
    "/repositories/{repository_id}",
    summary="Get repository metadata and ingestion status",
)
async def get_repository(
    repository_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get repository details ensuring tenant ownership."""
    repo = await repo_service.get_repository(
        db=db,
        owner_id=current_user.id,
        repository_id=repository_id,
    )
    return success_response(
        data=repo.model_dump(mode="json"),
    )


@router.delete(
    "/repositories/{repository_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft delete a repository",
)
async def delete_repository(
    repository_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Soft-delete repository from workspace."""
    await repo_service.delete_repository(
        db=db,
        owner_id=current_user.id,
        repository_id=repository_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
