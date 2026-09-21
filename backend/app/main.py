from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.core.redis import connect_to_redis, close_redis_connection
from app.core.errors import APIError, error_json_response
from app.api.v1.router import api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events."""
    logger.info("Starting up %s...", settings.APP_NAME)
    await connect_to_mongo()
    await connect_to_redis()
    yield
    logger.info("Shutting down %s...", settings.APP_NAME)
    await close_redis_connection()
    await close_mongo_connection()


app = FastAPI(
    title=settings.APP_NAME,
    description="Repository Intelligence Platform REST API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception Handlers
@app.exception_handler(APIError)
async def custom_api_error_handler(request: Request, exc: APIError):
    return error_json_response(
        status_code=exc.status_code,
        code=exc.code,
        message=exc.message,
        details=exc.details,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled server error: %s", exc)
    return error_json_response(
        status_code=500,
        code="INTERNAL_SERVER_ERROR",
        message="An unexpected server error occurred. Please try again later.",
    )


# Mount API Routers
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", summary="Root index")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "api_v1": settings.API_V1_PREFIX,
    }
