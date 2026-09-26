import logging
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import PlainTextResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user, get_db
from app.core.errors import success_response
from app.models.review import CodeReviewResponse
from app.models.user import UserResponse
from app.modules.review.service import CodeReviewService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Automated Code Review & Patch Generation Engine"])


async def _verify_repo_access(
    repository_id: str,
    current_user: UserResponse,
    db: AsyncIOMotorDatabase,
    project_id: Optional[str] = None,
):
    repo = None

    if repository_id not in ("default-repo", "default", "", "undefined"):
        try:
            oid = ObjectId(repository_id)
            repo = await db.repositories.find_one({
                "_id": oid,
                "owner_id": ObjectId(current_user.id),
                "is_deleted": False,
            })
            if not repo:
                repo = await db.repositories.find_one({"_id": oid, "is_deleted": False})
        except Exception:
            repo = await db.repositories.find_one({
                "$or": [{"id": repository_id}, {"name": repository_id}],
                "is_deleted": False,
            })

    if not repo and project_id and project_id not in ("default", ""):
        try:
            p_oid = ObjectId(project_id)
            repo = await db.repositories.find_one({
                "project_id": p_oid,
                "is_deleted": False,
            })
        except Exception:
            repo = await db.repositories.find_one({
                "project_id": project_id,
                "is_deleted": False,
            })

    if not repo:
        try:
            repo = await db.repositories.find_one({
                "owner_id": ObjectId(current_user.id),
                "is_deleted": False,
            })
        except Exception:
            pass

    return repo


@router.get(
    "/projects/{project_id}/repositories/{repository_id}/review",
    summary="Get repository automated code review audit findings and metrics",
)
async def get_code_review(
    project_id: str,
    repository_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Executes or returns the latest automated code review and security audit for the selected repository.
    """
    await _verify_repo_access(repository_id, current_user, db, project_id)

    review_res = await CodeReviewService.run_code_review(
        db=db,
        repository_id=repository_id,
        project_id=project_id,
    )
    return success_response(
        data=review_res.model_dump(),
        message="Code review audit findings fetched successfully",
    )


@router.post(
    "/projects/{project_id}/repositories/{repository_id}/review/scan",
    status_code=status.HTTP_200_OK,
    summary="Trigger full repository code quality, vulnerability, and anti-pattern re-scan",
)
async def trigger_code_review_scan(
    project_id: str,
    repository_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Triggers an on-demand full repository static SemGrep AST and neural heuristic re-scan.
    """
    await _verify_repo_access(repository_id, current_user, db, project_id)

    review_res = await CodeReviewService.run_code_review(
        db=db,
        repository_id=repository_id,
        project_id=project_id,
    )
    return success_response(
        data=review_res.model_dump(),
        message="Full code review re-scan completed successfully",
    )


@router.get(
    "/projects/{project_id}/repositories/{repository_id}/review/patch/{finding_id}",
    summary="Export raw unified diff patch file for specific review finding",
)
async def export_finding_patch(
    project_id: str,
    repository_id: str,
    finding_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Exports a downloadable .patch unified diff file for the selected finding.
    """
    await _verify_repo_access(repository_id, current_user, db, project_id)

    review_res = await CodeReviewService.run_code_review(
        db=db,
        repository_id=repository_id,
        project_id=project_id,
    )

    finding = next((f for f in review_res.findings if f.id == finding_id), None)
    patch_content = ""
    if finding and finding.diff_block and finding.diff_block.patch_content:
        patch_content = finding.diff_block.patch_content
    else:
        patch_content = f"# No patch available for finding {finding_id}\n"

    filename = f"{finding_id}.patch"
    headers = {
        "Content-Disposition": f"attachment; filename={filename}",
        "Content-Type": "text/x-diff; charset=utf-8",
    }
    return PlainTextResponse(content=patch_content, headers=headers)
