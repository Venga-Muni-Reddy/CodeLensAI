import asyncio
from datetime import datetime, timezone
import io
import logging
import os
import re
import shutil
import subprocess
from typing import List, Optional, Tuple
import zipfile
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.errors import APIError
from app.models.repository import RepositoryCreateGitHub, RepositoryResponse

logger = logging.getLogger(__name__)


def extract_repo_name(url: str) -> str:
    """Extract clean repository name from GitHub URL."""
    clean_url = url.strip().rstrip("/")
    if clean_url.endswith(".git"):
        clean_url = clean_url[:-4]
    parts = clean_url.split("/")
    if len(parts) >= 2 and parts[-1]:
        return parts[-1]
    return "imported-repo"


def repo_doc_to_response(doc: dict) -> RepositoryResponse:
    """Convert MongoDB repository document to RepositoryResponse."""
    return RepositoryResponse(
        id=str(doc["_id"]),
        project_id=str(doc.get("project_id", "")),
        owner_id=str(doc.get("owner_id", "")),
        name=doc.get("name", "repository"),
        source_type=doc.get("source_type", "github"),
        source_url=doc.get("source_url"),
        default_branch=doc.get("default_branch", "main"),
        commit_sha=doc.get("commit_sha"),
        size_bytes=doc.get("size_bytes", 0),
        file_count=doc.get("file_count", 0),
        status=doc.get("status", "queued"),
        storage_key=doc.get("storage_key", ""),
        error_message=doc.get("error_message"),
        is_deleted=doc.get("is_deleted", False),
        created_at=doc.get("created_at", datetime.now(timezone.utc)),
        updated_at=doc.get("updated_at", datetime.now(timezone.utc)),
    )


def calculate_dir_metrics(directory: str) -> Tuple[int, int]:
    """Calculate file count and total size in bytes, excluding .git folder."""
    file_count = 0
    total_size = 0
    for root, dirs, files in os.walk(directory):
        if ".git" in dirs:
            dirs.remove(".git")
        for f in files:
            fp = os.path.join(root, f)
            try:
                if not os.path.islink(fp):
                    total_size += os.path.getsize(fp)
                    file_count += 1
            except OSError:
                continue
    return file_count, total_size


def _run_git_command(cmd: List[str], cwd: Optional[str] = None, timeout: int = 180) -> Tuple[int, str, str]:
    """Execute git command via subprocess in a thread pool (Windows & Linux compatible)."""
    try:
        proc = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
            shell=False,
        )
        return proc.returncode, proc.stdout or "", proc.stderr or ""
    except subprocess.TimeoutExpired:
        return 1, "", f"Git command timed out after {timeout} seconds."
    except Exception as exc:
        return 1, "", f"{type(exc).__name__}: {str(exc)}"


async def execute_git_clone(
    db: AsyncIOMotorDatabase,
    repo_id: ObjectId,
    target_dir: str,
    clone_url: str,
    branch: str,
    shallow: bool,
    exclude_binaries: bool,
) -> None:
    """Execute git clone safely in worker thread pool and update MongoDB record."""
    try:
        # Ensure parent target dir
        os.makedirs(os.path.dirname(target_dir), exist_ok=True)
        if os.path.exists(target_dir):
            shutil.rmtree(target_dir, ignore_errors=True)

        cmd = ["git", "clone"]
        if shallow:
            cmd.extend(["--depth", "1"])
        if branch:
            cmd.extend(["--branch", branch])
        cmd.extend([clone_url, target_dir])

        logger.info("Executing git clone for repo_id=%s into %s", repo_id, target_dir)
        returncode, stdout, stderr = await asyncio.to_thread(_run_git_command, cmd, None, 180)

        if returncode != 0:
            err_msg = (stderr or stdout).strip()
            # Mask any tokens in the error message
            err_msg = re.sub(r":[^@]+@github\.com", ":***@github.com", err_msg)
            logger.error("Git clone failed for repo_id=%s: %s", repo_id, err_msg)
            await db.repositories.update_one(
                {"_id": repo_id},
                {
                    "$set": {
                        "status": "failed",
                        "error_message": err_msg[:500] if err_msg else "Git clone failed with non-zero exit code.",
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
            )
            return

        # Read commit SHA
        commit_sha = None
        try:
            sha_ret, sha_out, _ = await asyncio.to_thread(
                _run_git_command, ["git", "rev-parse", "HEAD"], target_dir, 15
            )
            if sha_ret == 0:
                commit_sha = sha_out.strip()
        except Exception as e:
            logger.warning("Could not read HEAD commit SHA for repo_id=%s: %s", repo_id, e)

        # Calculate metrics
        file_count, size_bytes = await asyncio.to_thread(calculate_dir_metrics, target_dir)

        # Update status to ready
        await db.repositories.update_one(
            {"_id": repo_id},
            {
                "$set": {
                    "status": "ready",
                    "commit_sha": commit_sha,
                    "file_count": file_count,
                    "size_bytes": size_bytes,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        logger.info("Successfully cloned and indexed repo_id=%s files=%d size=%d", repo_id, file_count, size_bytes)

    except Exception as exc:
        err_detail = f"{type(exc).__name__}: {str(exc)}" if str(exc) else type(exc).__name__
        logger.exception("Unexpected error during git clone for repo_id=%s: %s", repo_id, err_detail)
        await db.repositories.update_one(
            {"_id": repo_id},
            {
                "$set": {
                    "status": "failed",
                    "error_message": f"Ingestion error: {err_detail}"[:500],
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )


async def create_github_repository(
    db: AsyncIOMotorDatabase,
    owner_id: str,
    project_id: str,
    payload: RepositoryCreateGitHub,
) -> RepositoryResponse:
    """Validate project ownership, register repository, and initiate shallow clone."""
    try:
        o_oid = ObjectId(owner_id)
        p_oid = ObjectId(project_id)
    except Exception:
        raise APIError(status_code=400, code="INVALID_ID_FORMAT", message="Invalid project or user ID format.")

    # Verify project exists, is owned by user, and is not deleted
    project = await db.projects.find_one({"_id": p_oid, "owner_id": o_oid, "is_deleted": False})
    if not project:
        raise APIError(status_code=404, code="PROJECT_NOT_FOUND", message="Project not found or access denied.")

    url_str = str(payload.source_url).strip()
    if not url_str.startswith("http://") and not url_str.startswith("https://"):
        raise APIError(status_code=422, code="INVALID_URL", message="Repository URL must be a valid HTTP(S) URL.")

    repo_name = extract_repo_name(url_str)
    now = datetime.now(timezone.utc)

    # Prepare safe storage key
    repo_oid = ObjectId()
    storage_rel_path = os.path.join(str(o_oid), str(p_oid), str(repo_oid))
    target_abs_path = os.path.abspath(os.path.join(settings.LOCAL_STORAGE_PATH, storage_rel_path))

    repo_doc = {
        "_id": repo_oid,
        "project_id": p_oid,
        "owner_id": o_oid,
        "name": repo_name,
        "source_type": "github",
        "source_url": url_str,
        "default_branch": payload.default_branch or "main",
        "commit_sha": None,
        "size_bytes": 0,
        "file_count": 0,
        "status": "cloning",
        "storage_key": storage_rel_path.replace("\\", "/"),
        "error_message": None,
        "is_deleted": False,
        "deleted_at": None,
        "created_at": now,
        "updated_at": now,
    }

    await db.repositories.insert_one(repo_doc)
    # Increment project repository count
    await db.projects.update_one({"_id": p_oid}, {"$inc": {"repository_count": 1}})

    # Prepare clone URL with authentication token if provided
    clone_url = url_str
    if payload.auth_token and payload.auth_token.strip():
        # Inject token: https://x-access-token:<token>@github.com/...
        token_clean = payload.auth_token.strip()
        if "github.com" in url_str:
            clone_url = re.sub(
                r"^https?://(github\.com/)",
                f"https://x-access-token:{token_clean}@\\1",
                url_str,
            )

    # Spawn clone in background task
    asyncio.create_task(
        execute_git_clone(
            db=db,
            repo_id=repo_oid,
            target_dir=target_abs_path,
            clone_url=clone_url,
            branch=payload.default_branch or "main",
            shallow=payload.shallow_clone,
            exclude_binaries=payload.exclude_binaries,
        )
    )

    return repo_doc_to_response(repo_doc)


async def list_project_repositories(
    db: AsyncIOMotorDatabase,
    owner_id: str,
    project_id: str,
) -> List[RepositoryResponse]:
    """List all non-deleted repositories for a project ensuring tenant isolation."""
    try:
        o_oid = ObjectId(owner_id)
        p_oid = ObjectId(project_id)
    except Exception:
        raise APIError(status_code=400, code="INVALID_ID_FORMAT", message="Invalid project or user ID format.")

    # Verify project exists and belongs to user
    project = await db.projects.find_one({"_id": p_oid, "owner_id": o_oid, "is_deleted": False})
    if not project:
        raise APIError(status_code=404, code="PROJECT_NOT_FOUND", message="Project not found or access denied.")

    cursor = db.repositories.find({
        "project_id": p_oid,
        "owner_id": o_oid,
        "is_deleted": False,
    }).sort("created_at", -1)

    repos = []
    async for doc in cursor:
        repos.append(repo_doc_to_response(doc))
    return repos


async def get_repository(
    db: AsyncIOMotorDatabase,
    owner_id: str,
    repository_id: str,
) -> RepositoryResponse:
    """Get repository details with tenant ownership check."""
    try:
        o_oid = ObjectId(owner_id)
        r_oid = ObjectId(repository_id)
    except Exception:
        raise APIError(status_code=400, code="INVALID_ID_FORMAT", message="Invalid repository or user ID format.")

    doc = await db.repositories.find_one({
        "_id": r_oid,
        "owner_id": o_oid,
        "is_deleted": False,
    })

    if not doc:
        raise APIError(status_code=404, code="REPOSITORY_NOT_FOUND", message="Repository not found or access denied.")

    return repo_doc_to_response(doc)


async def delete_repository(
    db: AsyncIOMotorDatabase,
    owner_id: str,
    repository_id: str,
) -> None:
    """Soft delete repository and decrement parent project repository count."""
    try:
        o_oid = ObjectId(owner_id)
        r_oid = ObjectId(repository_id)
    except Exception:
        raise APIError(status_code=400, code="INVALID_ID_FORMAT", message="Invalid repository or user ID format.")

    repo = await db.repositories.find_one({
        "_id": r_oid,
        "owner_id": o_oid,
        "is_deleted": False,
    })

    if not repo:
        raise APIError(status_code=404, code="REPOSITORY_NOT_FOUND", message="Repository not found or access denied.")

    now = datetime.now(timezone.utc)
    await db.repositories.update_one(
        {"_id": r_oid},
        {
            "$set": {
                "is_deleted": True,
                "deleted_at": now,
                "updated_at": now,
            }
        },
    )

    # Decrement parent project repo count
    project_id = repo.get("project_id")
    if project_id:
        await db.projects.update_one(
            {"_id": project_id, "repository_count": {"$gt": 0}},
            {"$inc": {"repository_count": -1}},
        )

    logger.info("Repository soft-deleted: id=%s owner_id=%s", repository_id, owner_id)


IGNORED_ZIP_DIRS = {
    "node_modules",
    "vendor",
    ".venv",
    "venv",
    "env",
    "__pycache__",
    ".git",
    "dist",
    "build",
    ".next",
    ".nuxt",
    "target",
    "bin",
    "obj",
    ".idea",
    ".vscode",
}

BINARY_ZIP_EXTENSIONS = {
    ".exe", ".dll", ".so", ".dylib", ".bin", ".iso", ".img",
    ".zip", ".tar", ".gz", ".7z", ".rar",
    ".mp4", ".avi", ".mkv", ".mov", ".mp3", ".wav",
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx",
}

MAX_BINARY_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


def extract_zip_archive(
    zip_source: bytes | str,
    target_dir: str,
    exclude_dependencies: bool = True,
    exclude_binaries: bool = True,
) -> Tuple[int, int, int]:
    """
    Safely extract zip archive with zip-slip protection, dependency filtering, and binary filtering.
    Returns (file_count, extracted_size_bytes, purged_noise_count).
    """
    os.makedirs(target_dir, exist_ok=True)
    target_dir_abs = os.path.abspath(target_dir)

    file_count = 0
    total_size = 0
    purged_count = 0

    source = io.BytesIO(zip_source) if isinstance(zip_source, bytes) else zip_source

    with zipfile.ZipFile(source, "r") as zf:
        for member in zf.infolist():
            raw_filename = member.filename

            # 1. Zip-Slip & Path Traversal Prevention
            # Reject raw directory traversal sequences
            normalized_parts = raw_filename.replace("\\", "/").split("/")
            if ".." in normalized_parts or raw_filename.startswith("/") or raw_filename.startswith("\\"):
                raise APIError(
                    status_code=400,
                    code="ZIP_TRAVERSAL_ATTACK",
                    message=f"Path traversal detected in archive entry: {raw_filename}",
                )

            dest_path = os.path.abspath(os.path.join(target_dir_abs, raw_filename))
            try:
                common = os.path.commonpath([target_dir_abs, dest_path])
            except ValueError:
                raise APIError(
                    status_code=400,
                    code="ZIP_TRAVERSAL_ATTACK",
                    message=f"Invalid destination drive for entry: {raw_filename}",
                )

            if common != target_dir_abs:
                raise APIError(
                    status_code=400,
                    code="ZIP_TRAVERSAL_ATTACK",
                    message=f"Path traversal detected in archive entry: {raw_filename}",
                )

            # Skip directories themselves
            if member.is_dir() or raw_filename.endswith("/"):
                continue

            path_parts_lower = [p.lower() for p in normalized_parts]

            # 2. Dependency tree filtering
            if exclude_dependencies:
                if any(part in IGNORED_ZIP_DIRS for part in path_parts_lower):
                    purged_count += 1
                    continue

            # 3. Binary & oversized file filtering
            _, ext = os.path.splitext(raw_filename.lower())
            if exclude_binaries:
                if ext in BINARY_ZIP_EXTENSIONS or member.file_size > MAX_BINARY_FILE_SIZE:
                    purged_count += 1
                    continue

            # Extract validated safe file
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            with zf.open(member) as source_file, open(dest_path, "wb") as target_file:
                shutil.copyfileobj(source_file, target_file)

            file_count += 1
            total_size += member.file_size

    return file_count, total_size, purged_count


async def import_zip_repository(
    db: AsyncIOMotorDatabase,
    owner_id: str,
    project_id: str,
    file_bytes: bytes,
    filename: str,
    repo_name: Optional[str] = None,
    branch: Optional[str] = "archive-main",
    exclude_dependencies: bool = True,
    exclude_binaries: bool = True,
) -> RepositoryResponse:
    """Validate project ownership, safely unpack ZIP archive, and register repository."""
    try:
        o_oid = ObjectId(owner_id)
        p_oid = ObjectId(project_id)
    except Exception:
        raise APIError(status_code=400, code="INVALID_ID_FORMAT", message="Invalid project or user ID format.")

    project = await db.projects.find_one({"_id": p_oid, "owner_id": o_oid, "is_deleted": False})
    if not project:
        raise APIError(status_code=404, code="PROJECT_NOT_FOUND", message="Project not found or access denied.")

    # Sanitize repository name
    if repo_name and repo_name.strip():
        name = repo_name.strip()
    else:
        clean_name = os.path.splitext(filename)[0].strip()
        name = clean_name if clean_name else "archive-repo"

    repo_oid = ObjectId()
    storage_rel_path = os.path.join(str(o_oid), str(p_oid), str(repo_oid))
    target_abs_path = os.path.abspath(os.path.join(settings.LOCAL_STORAGE_PATH, storage_rel_path))

    now = datetime.now(timezone.utc)

    # Perform extraction in worker thread pool
    try:
        file_count, size_bytes, purged_count = await asyncio.to_thread(
            extract_zip_archive,
            file_bytes,
            target_abs_path,
            exclude_dependencies,
            exclude_binaries,
        )
    except zipfile.BadZipFile:
        raise APIError(
            status_code=400,
            code="INVALID_ZIP_ARCHIVE",
            message="The uploaded file is not a valid or non-corrupted ZIP archive.",
        )
    except APIError:
        shutil.rmtree(target_abs_path, ignore_errors=True)
        raise
    except Exception as exc:
        shutil.rmtree(target_abs_path, ignore_errors=True)
        logger.exception("Failed to extract zip archive for repo_id=%s: %s", repo_oid, exc)
        raise APIError(
            status_code=500,
            code="ZIP_EXTRACTION_FAILED",
            message=f"Failed to extract zip archive: {str(exc)}",
        )

    repo_doc = {
        "_id": repo_oid,
        "project_id": p_oid,
        "owner_id": o_oid,
        "name": name,
        "source_type": "zip",
        "source_url": None,
        "default_branch": branch or "archive-main",
        "commit_sha": f"zip-{str(repo_oid)[-7:]}",
        "size_bytes": size_bytes,
        "file_count": file_count,
        "status": "ready",
        "storage_key": storage_rel_path.replace("\\", "/"),
        "error_message": None,
        "is_deleted": False,
        "deleted_at": None,
        "created_at": now,
        "updated_at": now,
    }

    await db.repositories.insert_one(repo_doc)
    await db.projects.update_one({"_id": p_oid}, {"$inc": {"repository_count": 1}})

    logger.info(
        "Successfully ingested ZIP repo_id=%s name=%s files=%d size=%d purged=%d",
        repo_oid, name, file_count, size_bytes, purged_count
    )

    return repo_doc_to_response(repo_doc)

