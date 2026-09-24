import logging
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

logger = logging.getLogger(__name__)


class DatabaseManager:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None


db_manager = DatabaseManager()


async def connect_to_mongo() -> None:
    """Initialize MongoDB connection pool."""
    try:
        logger.info("Connecting to MongoDB at %s...", settings.MONGODB_URI)
        db_manager.client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            minPoolSize=settings.MONGODB_MIN_POOL_SIZE,
            maxPoolSize=settings.MONGODB_MAX_POOL_SIZE,
            serverSelectionTimeoutMS=5000,
        )
        db_manager.db = db_manager.client[settings.MONGODB_DB_NAME]
        # Verify connection
        await db_manager.client.admin.command("ping")
        logger.info("Successfully connected to MongoDB database '%s'.", settings.MONGODB_DB_NAME)
        # Ensure collection indexes
        await init_db_indexes(db_manager.db)
    except Exception as e:
        logger.warning("MongoDB connection check failed (is MongoDB running?): %s", e)


async def init_db_indexes(db: AsyncIOMotorDatabase) -> None:
    """Initialize necessary MongoDB indexes."""
    try:
        await db.users.create_index("email", unique=True)
        logger.info("Ensured unique index on users.email")
        await db.projects.create_index([("owner_id", 1), ("is_deleted", 1)])
        logger.info("Ensured compound index on projects.owner_id and projects.is_deleted")
        await db.repositories.create_index([("project_id", 1), ("is_deleted", 1)])
        await db.repositories.create_index([("owner_id", 1), ("is_deleted", 1)])
        logger.info("Ensured compound indexes on repositories collection")
        await db.analysis_jobs.create_index([("repository_id", 1), ("created_at", -1)])
        await db.analysis_jobs.create_index([("owner_id", 1)])
        await db.repository_analyses.create_index([("repository_id", 1), ("owner_id", 1)], unique=True)
        await db.repository_graphs.create_index([("repository_id", 1), ("owner_id", 1)], unique=True)
        logger.info("Ensured compound indexes on analysis and graph collections")
    except Exception as exc:
        logger.warning("Failed to initialize database indexes: %s", exc)



async def close_mongo_connection() -> None:
    """Close MongoDB connection pool."""
    if db_manager.client is not None:
        logger.info("Closing MongoDB connection...")
        db_manager.client.close()
        db_manager.client = None
        db_manager.db = None
        logger.info("MongoDB connection closed.")


def get_database() -> Optional[AsyncIOMotorDatabase]:
    """Get active MongoDB database reference."""
    return db_manager.db


async def ping_mongo() -> bool:
    """Check if MongoDB is reachable."""
    if db_manager.client is None:
        return False
    try:
        await db_manager.client.admin.command("ping")
        return True
    except Exception:
        return False
