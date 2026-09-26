import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import AsyncMock
from app.main import app
from app.modules.review.service import CodeReviewService


def unique_email() -> str:
    return f"review_tester_{uuid.uuid4().hex[:8]}@codelens.io"


@pytest.mark.asyncio
async def test_code_review_service_basic():
    mock_db = AsyncMock()
    mock_db.__getitem__.return_value.find_one = AsyncMock(return_value=None)

    review_res = await CodeReviewService.run_code_review(
        db=mock_db,
        repository_id="test-repo-123",
        project_id="test-proj-456",
    )

    assert review_res.repository_id == "test-repo-123"
    assert review_res.project_id == "test-proj-456"
    assert len(review_res.findings) >= 5
    assert review_res.metrics.total_issues >= 5
    assert review_res.metrics.health_score > 0
    assert review_res.metrics.health_score <= 100

    # Ensure findings have diff blocks & checklists
    finding = review_res.findings[0]
    assert finding.diff_block is not None
    assert len(review_res.checklist) > 0

    # Test patch content
    patch_text = finding.diff_block.patch_content
    assert "--- a/" in patch_text
    assert "+++ b/" in patch_text


@pytest.mark.asyncio
async def test_code_review_endpoints_integration():
    async with app.router.lifespan_context(app):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            email = unique_email()
            pwd = "SecurePassword123!"

            # Register user
            reg_res = await ac.post("/api/v1/auth/register", json={"email": email, "password": pwd, "name": "Review Tester"})
            assert reg_res.status_code == 201

            login_res = await ac.post("/api/v1/auth/login", json={"email": email, "password": pwd})
            assert login_res.status_code == 200
            token = login_res.json()["data"]["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # 1. Fetch Review Data
            get_res = await ac.get(
                "/api/v1/projects/default-project/repositories/default-repo/review",
                headers=headers,
            )
            assert get_res.status_code == 200
            data = get_res.json()["data"]
            assert data["repository_id"] == "default-repo"
            assert len(data["findings"]) > 0
            assert "health_score" in data["metrics"]
            first_finding_id = data["findings"][0]["id"]

            # 2. Trigger Scan endpoint
            scan_res = await ac.post(
                "/api/v1/projects/default-project/repositories/default-repo/review/scan",
                headers=headers,
            )
            assert scan_res.status_code == 200
            scan_data = scan_res.json()["data"]
            assert len(scan_data["findings"]) > 0

            # 3. Download Patch
            patch_res = await ac.get(
                f"/api/v1/projects/default-project/repositories/default-repo/review/patch/{first_finding_id}",
                headers=headers,
            )
            assert patch_res.status_code == 200
            assert "--- a/" in patch_res.text
            assert "Content-Disposition" in patch_res.headers
