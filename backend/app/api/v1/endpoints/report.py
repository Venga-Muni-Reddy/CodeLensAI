import logging
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import PlainTextResponse, Response
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user, get_db
from app.core.errors import success_response
from app.models.report import ReportDataResponse, ReportSectionsConfig
from app.models.user import UserResponse
from app.modules.report.service import ReportGenerationService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Repository Intelligence Reports Export"])


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
    "/projects/{project_id}/repositories/{repository_id}/report",
    summary="Get synthesized intelligence dossier and report dataset",
)
async def get_repository_report(
    project_id: str,
    repository_id: str,
    preset: str = Query("complete", description="executive | security | complete"),
    classification: str = Query("CONFIDENTIAL - INTERNAL USE ONLY"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Returns the synthesized multi-domain architecture, dependency, and vulnerability intelligence dossier.
    """
    await _verify_repo_access(repository_id, current_user, db, project_id)

    report = await ReportGenerationService.compile_report(
        db=db,
        repository_id=repository_id,
        project_id=project_id,
        preset_profile=preset,
        classification=classification,
    )
    return success_response(
        data=report.model_dump(),
        message="Intelligence report compiled successfully",
    )


@router.post(
    "/projects/{project_id}/repositories/{repository_id}/report/compile",
    summary="Compile custom intelligence report with custom sections config",
)
async def compile_custom_report(
    project_id: str,
    repository_id: str,
    config: ReportSectionsConfig,
    preset: str = Query("complete"),
    classification: str = Query("CONFIDENTIAL - INTERNAL USE ONLY"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    On-demand compilation of a report with customized section inclusions.
    """
    await _verify_repo_access(repository_id, current_user, db, project_id)

    report = await ReportGenerationService.compile_report(
        db=db,
        repository_id=repository_id,
        project_id=project_id,
        preset_profile=preset,
        classification=classification,
        sections_config=config,
    )
    return success_response(
        data=report.model_dump(),
        message="Custom report re-synthesized successfully",
    )


@router.get(
    "/projects/{project_id}/repositories/{repository_id}/report/download/markdown",
    summary="Download synthesized report as GitHub-flavored Markdown file",
)
async def download_report_markdown(
    project_id: str,
    repository_id: str,
    preset: str = Query("complete"),
    classification: str = Query("CONFIDENTIAL - INTERNAL USE ONLY"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Exports a downloadable .md document with Mermaid architecture diagrams.
    """
    await _verify_repo_access(repository_id, current_user, db, project_id)

    report = await ReportGenerationService.compile_report(
        db=db,
        repository_id=repository_id,
        project_id=project_id,
        preset_profile=preset,
        classification=classification,
    )
    md_content = ReportGenerationService.generate_markdown(report)
    filename = f"codelens-dossier-{report.dossier_id}.md"
    headers = {
        "Content-Disposition": f"attachment; filename={filename}",
        "Content-Type": "text/markdown; charset=utf-8",
    }
    return PlainTextResponse(content=md_content, headers=headers)


@router.get(
    "/projects/{project_id}/repositories/{repository_id}/report/download/json",
    summary="Download synthesized report as machine-readable JSON dossier",
)
async def download_report_json(
    project_id: str,
    repository_id: str,
    preset: str = Query("complete"),
    classification: str = Query("CONFIDENTIAL - INTERNAL USE ONLY"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Exports a downloadable .json telemetry payload for CI/CD pipelines.
    """
    await _verify_repo_access(repository_id, current_user, db, project_id)

    report = await ReportGenerationService.compile_report(
        db=db,
        repository_id=repository_id,
        project_id=project_id,
        preset_profile=preset,
        classification=classification,
    )
    json_content = ReportGenerationService.generate_json(report)
    filename = f"codelens-dossier-{report.dossier_id}.json"
    headers = {
        "Content-Disposition": f"attachment; filename={filename}",
        "Content-Type": "application/json; charset=utf-8",
    }
    return Response(content=json_content, media_type="application/json", headers=headers)
