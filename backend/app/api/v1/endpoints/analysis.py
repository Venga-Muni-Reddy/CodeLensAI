from typing import List, Optional
from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user, get_db
from app.core.errors import success_response
from app.models.analysis import AnalysisJobResponse, RepositoryAnalysisResponse
from app.models.user import UserResponse
from app.modules.analysis import service as analysis_service

router = APIRouter(tags=["Analysis Pipeline"])


@router.post(
    "/repositories/{repository_id}/analyze",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger repository analysis pipeline",
)
async def trigger_analysis(
    repository_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Initiates the asynchronous code intelligence analysis pipeline."""
    job = await analysis_service.trigger_repository_analysis(
        db=db,
        owner_id=current_user.id,
        repository_id=repository_id,
    )
    return success_response(
        data=job.model_dump(mode="json"),
        message="Analysis pipeline initiated.",
    )


@router.get(
    "/repositories/{repository_id}/analysis/latest",
    summary="Get latest repository analysis intelligence",
)
async def get_latest_analysis(
    repository_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve the most recent completed analysis document for a repository."""
    analysis = await analysis_service.get_latest_repository_analysis(
        db=db,
        owner_id=current_user.id,
        repository_id=repository_id,
    )
    return success_response(
        data=analysis.model_dump(mode="json") if analysis else None,
        message="Latest analysis fetched successfully.",
    )


@router.get(
    "/repositories/{repository_id}/analysis/jobs",
    summary="List analysis jobs history for a repository",
)
async def list_analysis_jobs(
    repository_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List recent analysis job executions and status history."""
    jobs = await analysis_service.list_repository_jobs(
        db=db,
        owner_id=current_user.id,
        repository_id=repository_id,
    )
    return success_response(
        data=[j.model_dump(mode="json") for j in jobs],
    )
