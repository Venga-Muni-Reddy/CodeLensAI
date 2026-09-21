from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from app.core.database import ping_mongo
from app.core.redis import ping_redis
from app.core.errors import success_response
from app.core.config import settings

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/live", summary="Liveness probe")
async def liveness():
    """Liveness probe to confirm the server process is responsive."""
    return success_response(
        data={
            "status": "healthy",
            "environment": settings.ENVIRONMENT,
            "version": "1.0.0",
        }
    )


@router.get("/ready", summary="Readiness probe")
async def readiness():
    """Readiness probe to confirm external dependencies (MongoDB, Redis) are reachable."""
    mongo_ok = await ping_mongo()
    redis_ok = await ping_redis()

    is_ready = mongo_ok  # MongoDB is mandatory, Redis may be starting up

    payload = {
        "status": "ready" if is_ready else "degraded",
        "services": {
            "mongodb": "connected" if mongo_ok else "disconnected",
            "redis": "connected" if redis_ok else "disconnected",
        },
    }

    if not is_ready:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "success": False,
                "data": payload,
                "message": "Required backend services are not ready.",
            },
        )

    return success_response(data=payload)
