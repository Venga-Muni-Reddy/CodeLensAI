import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.services.ai.factory import ai_service


@pytest.mark.asyncio
async def test_root_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["app"] == "CodeLensAI"
        assert data["status"] == "running"


@pytest.mark.asyncio
async def test_liveness_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/health/live")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "healthy"


@pytest.mark.asyncio
async def test_readiness_endpoint_with_lifespan():
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/v1/health/ready")
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["data"]["status"] == "ready"
            assert data["data"]["services"]["mongodb"] == "connected"
            assert data["data"]["services"]["redis"] == "connected"


@pytest.mark.asyncio
async def test_ai_fallback_factory():
    available = ai_service.get_available_providers()
    assert isinstance(available, list)
    assert len(ai_service.providers) == 3
    assert [p.provider_name for p in ai_service.providers] == ["openrouter", "gemini", "openai"]
