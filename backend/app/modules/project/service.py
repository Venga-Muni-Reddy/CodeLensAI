from datetime import datetime, timezone
import logging
from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.errors import APIError
from app.models.project import ProjectCreate, ProjectUpdate, ProjectResponse

logger = logging.getLogger(__name__)


def project_doc_to_response(doc: dict) -> ProjectResponse:
    """Transform MongoDB project document to Pydantic ProjectResponse."""
    return ProjectResponse(
        id=str(doc["_id"]),
        owner_id=str(doc.get("owner_id", "")),
        name=doc.get("name", ""),
        description=doc.get("description"),
        repository_count=doc.get("repository_count", 0),
        is_deleted=doc.get("is_deleted", False),
        created_at=doc.get("created_at", datetime.now(timezone.utc)),
        updated_at=doc.get("updated_at", datetime.now(timezone.utc)),
    )


async def create_project(
    db: AsyncIOMotorDatabase,
    owner_id: str,
    project_in: ProjectCreate,
) -> ProjectResponse:
    """Create a new project isolated to the authenticated user."""
    try:
        owner_oid = ObjectId(owner_id)
    except Exception:
        raise APIError(status_code=400, code="INVALID_USER_ID", message="Invalid user ID format.")

    now = datetime.now(timezone.utc)
    project_doc = {
        "owner_id": owner_oid,
        "name": project_in.name.strip(),
        "description": project_in.description.strip() if project_in.description else None,
        "repository_count": 0,
        "is_deleted": False,
        "deleted_at": None,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.projects.insert_one(project_doc)
    project_doc["_id"] = result.inserted_id
    logger.info("Project created: id=%s name=%s owner_id=%s", result.inserted_id, project_in.name, owner_id)
    return project_doc_to_response(project_doc)


async def list_user_projects(
    db: AsyncIOMotorDatabase,
    owner_id: str,
) -> List[ProjectResponse]:
    """List all active (non-deleted) projects for the authenticated user."""
    try:
        owner_oid = ObjectId(owner_id)
    except Exception:
        raise APIError(status_code=400, code="INVALID_USER_ID", message="Invalid user ID format.")

    cursor = db.projects.find({
        "owner_id": owner_oid,
        "is_deleted": False,
    }).sort("created_at", -1)

    projects = []
    async for doc in cursor:
        projects.append(project_doc_to_response(doc))
    return projects


async def get_project(
    db: AsyncIOMotorDatabase,
    project_id: str,
    owner_id: str,
) -> ProjectResponse:
    """Fetch a single project ensuring tenant ownership and non-deleted status."""
    try:
        p_oid = ObjectId(project_id)
        o_oid = ObjectId(owner_id)
    except Exception:
        raise APIError(status_code=400, code="INVALID_ID_FORMAT", message="Invalid project or user ID format.")

    doc = await db.projects.find_one({
        "_id": p_oid,
        "owner_id": o_oid,
        "is_deleted": False,
    })

    if not doc:
        raise APIError(status_code=404, code="PROJECT_NOT_FOUND", message="Project not found or access denied.")

    return project_doc_to_response(doc)


async def update_project(
    db: AsyncIOMotorDatabase,
    project_id: str,
    owner_id: str,
    project_in: ProjectUpdate,
) -> ProjectResponse:
    """Update project name and/or description with tenant verification."""
    try:
        p_oid = ObjectId(project_id)
        o_oid = ObjectId(owner_id)
    except Exception:
        raise APIError(status_code=400, code="INVALID_ID_FORMAT", message="Invalid project or user ID format.")

    update_fields = {}
    if project_in.name is not None:
        name_clean = project_in.name.strip()
        if not name_clean:
            raise APIError(status_code=422, code="VALIDATION_ERROR", message="Project name cannot be blank.")
        update_fields["name"] = name_clean

    if project_in.description is not None:
        update_fields["description"] = project_in.description.strip() if project_in.description else None

    if not update_fields:
        return await get_project(db, project_id, owner_id)

    update_fields["updated_at"] = datetime.now(timezone.utc)

    doc = await db.projects.find_one_and_update(
        {
            "_id": p_oid,
            "owner_id": o_oid,
            "is_deleted": False,
        },
        {"$set": update_fields},
        return_document=True,
    )

    if not doc:
        raise APIError(status_code=404, code="PROJECT_NOT_FOUND", message="Project not found or access denied.")

    logger.info("Project updated: id=%s owner_id=%s", project_id, owner_id)
    return project_doc_to_response(doc)


async def delete_project(
    db: AsyncIOMotorDatabase,
    project_id: str,
    owner_id: str,
) -> None:
    """Soft-delete a project ensuring tenant isolation."""
    try:
        p_oid = ObjectId(project_id)
        o_oid = ObjectId(owner_id)
    except Exception:
        raise APIError(status_code=400, code="INVALID_ID_FORMAT", message="Invalid project or user ID format.")

    now = datetime.now(timezone.utc)
    result = await db.projects.update_one(
        {
            "_id": p_oid,
            "owner_id": o_oid,
            "is_deleted": False,
        },
        {
            "$set": {
                "is_deleted": True,
                "deleted_at": now,
                "updated_at": now,
            }
        },
    )

    if result.matched_count == 0:
        raise APIError(status_code=404, code="PROJECT_NOT_FOUND", message="Project not found or access denied.")

    logger.info("Project soft-deleted: id=%s owner_id=%s", project_id, owner_id)
