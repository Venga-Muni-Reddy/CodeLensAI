from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.api.deps import get_current_user, get_db
from app.core.errors import APIError, success_response
from app.models.graph import RepositoryGraphResponse
from app.models.user import UserResponse
from app.modules.graph import service as graph_service

router = APIRouter(tags=["Dependency Graph & Architecture"])


@router.get(
    "/projects/{project_id}/repositories/{repository_id}/graph",
    summary="Get repository dependency graph and architecture map",
)
@router.get(
    "/repositories/{repository_id}/graph",
    summary="Get repository dependency graph (direct lookup)",
)
async def get_repository_graph(
    repository_id: str,
    project_id: Optional[str] = None,
    force_rescan: bool = Query(False, description="Force re-scan from disk AST"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Retrieves the complete AST dependency graph (file-level & module-level)
    along with architecture layer categorization and circular dependency telemetry.
    """
    # If project_id not provided in URL, look up from repo
    if not project_id:
        repo = await db.repositories.find_one({
            "_id": ObjectId(repository_id),
            "owner_id": ObjectId(current_user.id),
            "is_deleted": False,
        })
        if not repo:
            raise APIError(status_code=404, error_code="REPOSITORY_NOT_FOUND", message="Repository not found")
        project_id = str(repo["project_id"])

    graph_res = await graph_service.get_or_generate_repository_graph(
        db=db,
        owner_id=current_user.id,
        project_id=project_id,
        repo_id=repository_id,
        force_rescan=force_rescan,
    )

    return success_response(
        data=graph_res.model_dump(mode="json"),
        message="Repository dependency graph fetched successfully.",
    )


@router.post(
    "/projects/{project_id}/repositories/{repository_id}/graph/rescan",
    summary="Force re-scan and compute fresh dependency graph",
)
@router.post(
    "/repositories/{repository_id}/graph/rescan",
    summary="Force re-scan and compute fresh dependency graph (direct lookup)",
)
async def rescan_repository_graph(
    repository_id: str,
    project_id: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Triggers an immediate AST rescan of the repository's files on disk."""
    if not project_id:
        repo = await db.repositories.find_one({
            "_id": ObjectId(repository_id),
            "owner_id": ObjectId(current_user.id),
            "is_deleted": False,
        })
        if not repo:
            raise APIError(status_code=404, error_code="REPOSITORY_NOT_FOUND", message="Repository not found")
        project_id = str(repo["project_id"])

    graph_res = await graph_service.get_or_generate_repository_graph(
        db=db,
        owner_id=current_user.id,
        project_id=project_id,
        repo_id=repository_id,
        force_rescan=True,
    )

    return success_response(
        data=graph_res.model_dump(mode="json"),
        message="Repository dependency graph re-scanned and synchronized successfully.",
    )
