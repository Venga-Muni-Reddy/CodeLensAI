from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, Response, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user, get_db
from app.core.errors import APIError, success_response
from app.models.repository import RepositoryCreateGitHub, RepositoryResponse
from app.models.user import UserResponse
from app.modules.repository import service as repo_service

router = APIRouter(tags=["Repositories"])

MAX_ZIP_UPLOAD_SIZE = 100 * 1024 * 1024  # 100 MB


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


@router.post(
    "/projects/{project_id}/repositories/zip",
    status_code=status.HTTP_201_CREATED,
    summary="Upload and unpack local ZIP repository archive",
)
async def import_zip_repository(
    project_id: str,
    file: UploadFile = File(..., description="Project repository .zip archive"),
    name: Optional[str] = Form(None, description="Repository identifier slug"),
    branch: Optional[str] = Form("archive-main", description="Branch / snapshot label"),
    exclude_dependencies: bool = Form(True, description="Filter out node_modules, .venv, etc."),
    exclude_binaries: bool = Form(True, description="Filter out large media and binary executables"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Upload and decompress local codebase archive into isolated multi-tenant storage."""
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise APIError(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_FILE_TYPE",
            message="Uploaded file must be a .zip archive.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_ZIP_UPLOAD_SIZE:
        raise APIError(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="ARCHIVE_TOO_LARGE",
            message="Archive size exceeds the 100 MB limit.",
        )
    if len(file_bytes) == 0:
        raise APIError(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="EMPTY_ARCHIVE",
            message="The uploaded ZIP file is empty.",
        )

    repo = await repo_service.import_zip_repository(
        db=db,
        owner_id=current_user.id,
        project_id=project_id,
        file_bytes=file_bytes,
        filename=file.filename,
        repo_name=name,
        branch=branch,
        exclude_dependencies=exclude_dependencies,
        exclude_binaries=exclude_binaries,
    )
    return success_response(
        data=repo.model_dump(mode="json"),
        message="ZIP repository archive uploaded and extracted successfully.",
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
