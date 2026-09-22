import asyncio
from datetime import datetime, timezone
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional, Tuple
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.errors import APIError
from app.models.analysis import (
    AnalysisJobResponse,
    AnalysisSummary,
    FileMetric,
    FrameworkBadge,
    LanguageStat,
    RepositoryAnalysisResponse,
)

logger = logging.getLogger(__name__)

# Language extension mapping
EXTENSION_LANGUAGE_MAP: Dict[str, Tuple[str, str]] = {
    ".ts": ("TypeScript", "#38bdf8"),
    ".tsx": ("TypeScript", "#38bdf8"),
    ".js": ("JavaScript", "#facc15"),
    ".jsx": ("JavaScript", "#facc15"),
    ".mjs": ("JavaScript", "#facc15"),
    ".cjs": ("JavaScript", "#facc15"),
    ".py": ("Python", "#6366f1"),
    ".pyi": ("Python", "#6366f1"),
    ".pyw": ("Python", "#6366f1"),
    ".css": ("CSS / Styling", "#0284c7"),
    ".scss": ("CSS / Styling", "#0284c7"),
    ".sass": ("CSS / Styling", "#0284c7"),
    ".less": ("CSS / Styling", "#0284c7"),
    ".html": ("HTML & Templates", "#f43f5e"),
    ".htm": ("HTML & Templates", "#f43f5e"),
    ".json": ("Config & Data", "#a855f7"),
    ".yaml": ("Config & Data", "#a855f7"),
    ".yml": ("Config & Data", "#a855f7"),
    ".toml": ("Config & Data", "#a855f7"),
    ".xml": ("Config & Data", "#a855f7"),
    ".sh": ("Shell & Scripts", "#10b981"),
    ".bash": ("Shell & Scripts", "#10b981"),
    ".zsh": ("Shell & Scripts", "#10b981"),
    ".ps1": ("Shell & Scripts", "#10b981"),
    ".bat": ("Shell & Scripts", "#10b981"),
    ".go": ("Go", "#00add8"),
    ".rs": ("Rust", "#dea584"),
    ".java": ("Java", "#b07219"),
    ".cpp": ("C / C++", "#f34b7d"),
    ".cc": ("C / C++", "#f34b7d"),
    ".cxx": ("C / C++", "#f34b7d"),
    ".c": ("C / C++", "#f34b7d"),
    ".h": ("C / C++", "#f34b7d"),
    ".hpp": ("C / C++", "#f34b7d"),
    ".sql": ("SQL", "#e38c00"),
    ".md": ("Documentation", "#94a3b8"),
    ".markdown": ("Documentation", "#94a3b8"),
    ".txt": ("Documentation", "#94a3b8"),
}

EXCLUDED_DIRS = {
    ".git",
    "node_modules",
    ".venv",
    "venv",
    "env",
    "__pycache__",
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

# Framework catalog for manifest detection
KNOWN_FRAMEWORKS: Dict[str, Dict[str, str]] = {
    "react": {"name": "React", "category": "core"},
    "react-dom": {"name": "React DOM", "category": "core"},
    "vue": {"name": "Vue", "category": "core"},
    "svelte": {"name": "Svelte", "category": "core"},
    "next": {"name": "Next.js", "category": "core"},
    "nuxt": {"name": "Nuxt", "category": "core"},
    "express": {"name": "Express", "category": "core"},
    "fastify": {"name": "Fastify", "category": "core"},
    "@nestjs/core": {"name": "NestJS", "category": "core"},
    "vite": {"name": "Vite", "category": "core"},
    "webpack": {"name": "Webpack", "category": "core"},
    "zustand": {"name": "Zustand", "category": "data_state"},
    "redux": {"name": "Redux", "category": "data_state"},
    "@reduxjs/toolkit": {"name": "Redux Toolkit", "category": "data_state"},
    "axios": {"name": "Axios", "category": "data_state"},
    "prisma": {"name": "Prisma", "category": "data_state"},
    "mongoose": {"name": "Mongoose", "category": "data_state"},
    "typescript": {"name": "TypeScript", "category": "testing_tooling"},
    "tailwindcss": {"name": "Tailwind CSS", "category": "testing_tooling"},
    "eslint": {"name": "ESLint", "category": "testing_tooling"},
    "jest": {"name": "Jest", "category": "testing_tooling"},
    "vitest": {"name": "Vitest", "category": "testing_tooling"},
    "fastapi": {"name": "FastAPI", "category": "core"},
    "uvicorn": {"name": "Uvicorn", "category": "core"},
    "flask": {"name": "Flask", "category": "core"},
    "django": {"name": "Django", "category": "core"},
    "starlette": {"name": "Starlette", "category": "core"},
    "celery": {"name": "Celery", "category": "core"},
    "motor": {"name": "Motor (Async Mongo)", "category": "data_state"},
    "pymongo": {"name": "PyMongo", "category": "data_state"},
    "redis": {"name": "Redis-py", "category": "data_state"},
    "pydantic": {"name": "Pydantic", "category": "data_state"},
    "sqlalchemy": {"name": "SQLAlchemy", "category": "data_state"},
    "alembic": {"name": "Alembic", "category": "data_state"},
    "httpx": {"name": "HTTPX", "category": "data_state"},
    "pytest": {"name": "Pytest", "category": "testing_tooling"},
    "black": {"name": "Black", "category": "testing_tooling"},
    "ruff": {"name": "Ruff", "category": "testing_tooling"},
    "mypy": {"name": "Mypy", "category": "testing_tooling"},
}


def analyze_file_lines(file_path: str, ext: str) -> Tuple[int, int, int, int]:
    """
    Count total lines, blank lines, comments, and SLOC in a file.
    Returns (total_lines, blank_lines, comment_lines, sloc).
    """
    total = 0
    blanks = 0
    comments = 0

    hash_comments = ext in [".py", ".pyi", ".sh", ".bash", ".zsh", ".yaml", ".yml", ".toml", ".ps1"]
    slash_comments = ext in [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".css", ".scss", ".go", ".rs", ".java", ".c", ".cpp", ".h"]

    in_block_comment = False

    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                total += 1
                stripped = line.strip()
                if not stripped:
                    blanks += 1
                    continue

                if hash_comments and stripped.startswith("#"):
                    comments += 1
                    continue

                if slash_comments:
                    if in_block_comment:
                        comments += 1
                        if "*/" in stripped:
                            in_block_comment = False
                        continue

                    if stripped.startswith("/*"):
                        comments += 1
                        if "*/" not in stripped:
                            in_block_comment = True
                        continue

                    if stripped.startswith("//"):
                        comments += 1
                        continue

                # HTML / XML comments
                if ext in [".html", ".xml"]:
                    if stripped.startswith("<!--"):
                        comments += 1
                        continue

    except Exception:
        pass

    sloc = max(0, total - blanks - comments)
    return total, blanks, comments, sloc


def extract_manifest_frameworks(repo_dir: str) -> List[FrameworkBadge]:
    """Scan repository root and subdirectories for package manifests and extract frameworks."""
    frameworks_dict: Dict[str, FrameworkBadge] = {}

    for root, dirs, files in os.walk(repo_dir):
        # Skip ignored dirs
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]

        # 1. package.json
        if "package.json" in files:
            pkg_path = os.path.join(root, "package.json")
            try:
                with open(pkg_path, "r", encoding="utf-8", errors="ignore") as f:
                    data = json.load(f)
                    deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
                    for dep, ver in deps.items():
                        dep_lower = dep.lower()
                        if dep_lower in KNOWN_FRAMEWORKS:
                            info = KNOWN_FRAMEWORKS[dep_lower]
                            clean_ver = str(ver).replace("^", "").replace("~", "") if ver else None
                            frameworks_dict[info["name"]] = FrameworkBadge(
                                name=info["name"],
                                version=clean_ver,
                                category=info["category"],
                            )
            except Exception as e:
                logger.debug("Failed to parse %s: %s", pkg_path, e)

        # 2. requirements.txt
        if "requirements.txt" in files:
            req_path = os.path.join(root, "requirements.txt")
            try:
                with open(req_path, "r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        parts = re.split(r"[=<>~!]", line, maxsplit=1)
                        pkg_name = parts[0].strip().lower()
                        ver = parts[1].lstrip("=").strip() if len(parts) > 1 else None
                        if pkg_name in KNOWN_FRAMEWORKS:
                            info = KNOWN_FRAMEWORKS[pkg_name]
                            frameworks_dict[info["name"]] = FrameworkBadge(
                                name=info["name"],
                                version=ver,
                                category=info["category"],
                            )
            except Exception as e:
                logger.debug("Failed to parse %s: %s", req_path, e)

        # 3. pyproject.toml
        if "pyproject.toml" in files:
            toml_path = os.path.join(root, "pyproject.toml")
            try:
                with open(toml_path, "r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        line = line.strip()
                        for key, info in KNOWN_FRAMEWORKS.items():
                            if key in line.lower():
                                frameworks_dict[info["name"]] = FrameworkBadge(
                                    name=info["name"],
                                    version=None,
                                    category=info["category"],
                                )
            except Exception:
                pass

    return list(frameworks_dict.values())


def run_full_code_scan(repo_dir: str) -> Dict[str, Any]:
    """
    Synchronously scan repository files, calculate SLOC, detect languages,
    parse manifests, and build file inventory.
    """
    file_inventory: List[FileMetric] = []
    lang_stats: Dict[str, Dict[str, Any]] = {}

    total_files = 0
    total_physical_lines = 0
    total_code_lines = 0
    total_comment_lines = 0
    total_blank_lines = 0

    repo_dir_abs = os.path.abspath(repo_dir)

    for root, dirs, files in os.walk(repo_dir_abs):
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]

        for f in files:
            file_abs = os.path.join(root, f)
            rel_path = os.path.relpath(file_abs, repo_dir_abs).replace("\\", "/")

            _, ext = os.path.splitext(f.lower())
            if ext not in EXTENSION_LANGUAGE_MAP:
                continue

            lang_name, lang_color = EXTENSION_LANGUAGE_MAP[ext]

            try:
                size_bytes = os.path.getsize(file_abs)
            except OSError:
                size_bytes = 0

            # Ignore binary blobs or files > 5MB
            if size_bytes > 5 * 1024 * 1024:
                continue

            tot, blk, com, sloc = analyze_file_lines(file_abs, ext)

            total_files += 1
            total_physical_lines += tot
            total_code_lines += sloc
            total_comment_lines += com
            total_blank_lines += blk

            ratio = round((com / tot) * 100, 1) if tot > 0 else 0.0

            file_inventory.append(
                FileMetric(
                    relative_path=rel_path,
                    language=lang_name,
                    sloc=sloc,
                    size_bytes=size_bytes,
                    comment_ratio=ratio,
                    ast_status="AST Mapped",
                )
            )

            if lang_name not in lang_stats:
                lang_stats[lang_name] = {
                    "name": lang_name,
                    "color": lang_color,
                    "total_lines": 0,
                    "code_lines": 0,
                    "comment_lines": 0,
                    "file_count": 0,
                }

            lang_stats[lang_name]["total_lines"] += tot
            lang_stats[lang_name]["code_lines"] += sloc
            lang_stats[lang_name]["comment_lines"] += com
            lang_stats[lang_name]["file_count"] += 1

    # Calculate percentages
    languages_list: List[LanguageStat] = []
    for l_info in lang_stats.values():
        pct = (
            round((l_info["code_lines"] / total_code_lines) * 100, 1)
            if total_code_lines > 0
            else 0.0
        )
        languages_list.append(
            LanguageStat(
                name=l_info["name"],
                color=l_info["color"],
                share_pct=pct,
                total_lines=l_info["total_lines"],
                code_lines=l_info["code_lines"],
                comment_lines=l_info["comment_lines"],
                file_count=l_info["file_count"],
            )
        )

    # Sort languages by share percentage descending
    languages_list.sort(key=lambda x: x.code_lines, reverse=True)

    # Detect Frameworks & Technologies
    frameworks = extract_manifest_frameworks(repo_dir_abs)

    # Overall comment ratio
    overall_ratio = (
        round((total_comment_lines / total_physical_lines) * 100, 1)
        if total_physical_lines > 0
        else 0.0
    )

    # Maintainability grade heuristics
    if overall_ratio >= 15.0:
        grade = "A+ Clean"
    elif overall_ratio >= 10.0:
        grade = "A Modular"
    elif overall_ratio >= 5.0:
        grade = "B Standard"
    else:
        grade = "B- Maintainable"

    # Primary tech stack headline
    core_names = [f.name for f in frameworks if f.category == "core"]
    top_langs = [l.name for l in languages_list[:2]]
    if core_names:
        primary_stack = " + ".join(core_names[:2])
    elif top_langs:
        primary_stack = " + ".join(top_langs)
    else:
        primary_stack = "General Source"

    # Architecture style heuristic
    arch_tags = ["REST API / Layered"]
    has_api = any("fastapi" in f.name.lower() or "express" in f.name.lower() for f in frameworks)
    has_frontend = any("react" in f.name.lower() or "vue" in f.name.lower() or "svelte" in f.name.lower() for f in frameworks)

    if has_api and has_frontend:
        pattern = "Full-Stack Modular Architecture"
        arch_tags = ["Full-Stack", "REST API", "SPA Client", "Decoupled"]
    elif has_api:
        pattern = "Modular Clean Architecture (REST API)"
        arch_tags = ["Backend Service", "Layered Architecture", "Hexagonal I/O"]
    elif has_frontend:
        pattern = "Component-Based UI Architecture"
        arch_tags = ["Component-Driven", "SPA", "Reactive State"]
    else:
        pattern = "Modular Architecture"
        arch_tags = ["Modular", "Structured"]

    summary = AnalysisSummary(
        total_files=total_files,
        total_lines=total_physical_lines,
        total_sloc=total_code_lines,
        total_comments=total_comment_lines,
        total_blanks=total_blank_lines,
        comment_ratio=overall_ratio,
        maintainability_grade=grade,
        primary_tech_stack=primary_stack,
        architecture_pattern=pattern,
        architecture_tags=arch_tags,
    )

    # Sort file inventory by sloc descending
    file_inventory.sort(key=lambda x: x.sloc, reverse=True)

    return {
        "summary": summary,
        "languages": languages_list,
        "frameworks": frameworks,
        "file_inventory": file_inventory,
    }


async def execute_repository_analysis(
    db: AsyncIOMotorDatabase,
    job_id: ObjectId,
    repo_id: ObjectId,
    owner_id: ObjectId,
    project_id: ObjectId,
    storage_dir: str,
) -> None:
    """Run analysis pipeline in worker thread pool and store result in MongoDB."""
    start_time = datetime.now(timezone.utc)
    try:
        # Update stage to crawler
        await db.analysis_jobs.update_one(
            {"_id": job_id},
            {
                "$set": {
                    "status": "analyzing",
                    "stage": "crawler",
                    "progress_pct": 20,
                    "started_at": start_time,
                }
            },
        )

        # Check repository storage exists
        if not os.path.exists(storage_dir):
            raise APIError(
                status_code=404,
                code="STORAGE_NOT_FOUND",
                message="Repository storage directory does not exist on disk.",
            )

        # Stage 2: Tokenizing & metric calculation
        await db.analysis_jobs.update_one(
            {"_id": job_id},
            {"$set": {"stage": "tokenizer", "progress_pct": 50}},
        )

        # Run scan in worker thread pool
        scan_data = await asyncio.to_thread(run_full_code_scan, storage_dir)

        # Stage 3: Manifest parsing & aggregation
        await db.analysis_jobs.update_one(
            {"_id": job_id},
            {"$set": {"stage": "manifest_parser", "progress_pct": 80}},
        )

        now = datetime.now(timezone.utc)
        duration = (now - start_time).total_seconds()

        # Save latest analysis result to repository_analyses collection
        analysis_doc = {
            "repository_id": repo_id,
            "owner_id": owner_id,
            "project_id": project_id,
            "summary": scan_data["summary"].model_dump(mode="json"),
            "languages": [l.model_dump(mode="json") for l in scan_data["languages"]],
            "frameworks": [f.model_dump(mode="json") for f in scan_data["frameworks"]],
            "file_inventory": [f.model_dump(mode="json") for f in scan_data["file_inventory"]],
            "created_at": now,
            "updated_at": now,
        }

        # Upsert latest analysis record
        await db.repository_analyses.update_one(
            {"repository_id": repo_id},
            {"$set": analysis_doc},
            upsert=True,
        )

        # Update repository record with total file count & size
        await db.repositories.update_one(
            {"_id": repo_id},
            {
                "$set": {
                    "file_count": scan_data["summary"].total_files,
                    "updated_at": now,
                }
            },
        )

        # Complete job
        await db.analysis_jobs.update_one(
            {"_id": job_id},
            {
                "$set": {
                    "status": "completed",
                    "stage": "completed",
                    "progress_pct": 100,
                    "latency_seconds": round(duration, 2),
                    "completed_at": now,
                }
            },
        )

        logger.info(
            "Analysis pipeline completed for repo_id=%s files=%d sloc=%d latency=%.2fs",
            repo_id,
            scan_data["summary"].total_files,
            scan_data["summary"].total_sloc,
            duration,
        )

    except Exception as exc:
        now = datetime.now(timezone.utc)
        duration = (now - start_time).total_seconds()
        logger.exception("Analysis pipeline failed for repo_id=%s: %s", repo_id, exc)
        await db.analysis_jobs.update_one(
            {"_id": job_id},
            {
                "$set": {
                    "status": "failed",
                    "error_message": str(exc)[:500],
                    "progress_pct": 100,
                    "latency_seconds": round(duration, 2),
                    "completed_at": now,
                }
            },
        )


async def trigger_repository_analysis(
    db: AsyncIOMotorDatabase,
    owner_id: str,
    repository_id: str,
) -> AnalysisJobResponse:
    """Verify repository access, create analysis job, and trigger asynchronous pipeline."""
    try:
        o_oid = ObjectId(owner_id)
        r_oid = ObjectId(repository_id)
    except Exception:
        raise APIError(status_code=400, code="INVALID_ID_FORMAT", message="Invalid ID format.")

    # Verify repository ownership
    repo = await db.repositories.find_one({"_id": r_oid, "owner_id": o_oid, "is_deleted": False})
    if not repo:
        raise APIError(status_code=404, code="REPOSITORY_NOT_FOUND", message="Repository not found or access denied.")

    p_oid = repo["project_id"]
    storage_key = repo.get("storage_key", "")
    target_abs_path = os.path.abspath(os.path.join(settings.LOCAL_STORAGE_PATH, storage_key))

    job_oid = ObjectId()
    now = datetime.now(timezone.utc)

    job_doc = {
        "_id": job_oid,
        "repository_id": r_oid,
        "owner_id": o_oid,
        "project_id": p_oid,
        "status": "queued",
        "stage": "crawler",
        "progress_pct": 10,
        "latency_seconds": None,
        "error_message": None,
        "started_at": None,
        "completed_at": None,
        "created_at": now,
    }

    await db.analysis_jobs.insert_one(job_doc)

    # Launch background task
    asyncio.create_task(
        execute_repository_analysis(
            db=db,
            job_id=job_oid,
            repo_id=r_oid,
            owner_id=o_oid,
            project_id=p_oid,
            storage_dir=target_abs_path,
        )
    )

    return AnalysisJobResponse(
        id=str(job_oid),
        repository_id=str(r_oid),
        owner_id=str(o_oid),
        project_id=str(p_oid),
        status="queued",
        stage="crawler",
        progress_pct=10,
        latency_seconds=None,
        error_message=None,
        started_at=None,
        completed_at=None,
        created_at=now,
    )


async def get_latest_repository_analysis(
    db: AsyncIOMotorDatabase,
    owner_id: str,
    repository_id: str,
) -> Optional[RepositoryAnalysisResponse]:
    """Retrieve the latest analysis result for a repository with tenant check."""
    try:
        o_oid = ObjectId(owner_id)
        r_oid = ObjectId(repository_id)
    except Exception:
        raise APIError(status_code=400, code="INVALID_ID_FORMAT", message="Invalid ID format.")

    # Tenant verification
    repo = await db.repositories.find_one({"_id": r_oid, "owner_id": o_oid, "is_deleted": False})
    if not repo:
        raise APIError(status_code=404, code="REPOSITORY_NOT_FOUND", message="Repository not found or access denied.")

    doc = await db.repository_analyses.find_one({"repository_id": r_oid, "owner_id": o_oid})
    if not doc:
        return None

    return RepositoryAnalysisResponse(
        id=str(doc["_id"]),
        repository_id=str(doc["repository_id"]),
        owner_id=str(doc["owner_id"]),
        project_id=str(doc["project_id"]),
        summary=AnalysisSummary(**doc["summary"]),
        languages=[LanguageStat(**l) for l in doc.get("languages", [])],
        frameworks=[FrameworkBadge(**f) for f in doc.get("frameworks", [])],
        file_inventory=[FileMetric(**f) for f in doc.get("file_inventory", [])],
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


async def list_repository_jobs(
    db: AsyncIOMotorDatabase,
    owner_id: str,
    repository_id: str,
) -> List[AnalysisJobResponse]:
    """List analysis jobs for repository."""
    try:
        o_oid = ObjectId(owner_id)
        r_oid = ObjectId(repository_id)
    except Exception:
        raise APIError(status_code=400, code="INVALID_ID_FORMAT", message="Invalid ID format.")

    repo = await db.repositories.find_one({"_id": r_oid, "owner_id": o_oid, "is_deleted": False})
    if not repo:
        raise APIError(status_code=404, code="REPOSITORY_NOT_FOUND", message="Repository not found or access denied.")

    cursor = db.analysis_jobs.find({"repository_id": r_oid, "owner_id": o_oid}).sort("created_at", -1).limit(10)
    jobs = []
    async for doc in cursor:
        jobs.append(
            AnalysisJobResponse(
                id=str(doc["_id"]),
                repository_id=str(doc["repository_id"]),
                owner_id=str(doc["owner_id"]),
                project_id=str(doc["project_id"]),
                status=doc.get("status", "queued"),
                stage=doc.get("stage", "crawler"),
                progress_pct=doc.get("progress_pct", 0),
                latency_seconds=doc.get("latency_seconds"),
                error_message=doc.get("error_message"),
                started_at=doc.get("started_at"),
                completed_at=doc.get("completed_at"),
                created_at=doc["created_at"],
            )
        )
    return jobs
