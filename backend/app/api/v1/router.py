from fastapi import APIRouter
from app.api.v1.endpoints import health, auth, project, repository, analysis

api_router = APIRouter()

# Register endpoint routers
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(project.router)
api_router.include_router(repository.router)
api_router.include_router(analysis.router)



