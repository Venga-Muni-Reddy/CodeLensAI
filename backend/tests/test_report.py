import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import AsyncMock
from app.main import app
from app.modules.report.service import ReportGenerationService


def unique_email() -> str:
    return f"report_tester_{uuid.uuid4().hex[:8]}@codelens.io"


@pytest.mark.asyncio
async def test_report_generation_service_basic():
    mock_db = AsyncMock()
    mock_db.__getitem__.return_value.find_one = AsyncMock(return_value=None)

    report_res = await ReportGenerationService.compile_report(
        db=mock_db,
        repository_id="test-repo-123",
        project_id="test-proj-456",
        preset_profile="complete",
        classification="CONFIDENTIAL - INTERNAL USE ONLY",
    )

    assert report_res.repository_id == "test-repo-123"
    assert report_res.project_id == "test-proj-456"
    assert len(report_res.tiers) == 4
    assert len(report_res.critical_flow) >= 3
    assert len(report_res.findings) >= 1
    assert report_res.metrics.health_score > 0

    # Test Markdown and JSON generation
    md = ReportGenerationService.generate_markdown(report_res)
    assert "# CodeLens AI" in md
    assert "Executive KPI Health Scorecard" in md
    assert "mermaid" in md

    json_doc = ReportGenerationService.generate_json(report_res)
    assert "dossier_id" in json_doc
    assert "ecommerce-platform" in json_doc


@pytest.mark.asyncio
async def test_report_endpoints_integration():
    async with app.router.lifespan_context(app):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            email = unique_email()
            pwd = "SecurePassword123!"

            # Register user
            reg_res = await ac.post("/api/v1/auth/register", json={"email": email, "password": pwd, "name": "Report Tester"})
            assert reg_res.status_code == 201

            login_res = await ac.post("/api/v1/auth/login", json={"email": email, "password": pwd})
            assert login_res.status_code == 200
            token = login_res.json()["data"]["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # 1. Fetch Report Data
            get_res = await ac.get(
                "/api/v1/projects/default-project/repositories/default-repo/report",
                headers=headers,
            )
            assert get_res.status_code == 200
            data = get_res.json()["data"]
            assert data["repository_id"] == "default-repo"
            assert len(data["tiers"]) == 4

            # 2. Compile Custom Report
            compile_res = await ac.post(
                "/api/v1/projects/default-project/repositories/default-repo/report/compile",
                headers=headers,
                json={
                    "executive_summary": True,
                    "architecture_tiers": True,
                    "dependency_coupling": False,
                    "business_flows": True,
                    "security_matrix": True,
                    "remediation_patches": True,
                    "ast_raw_dump": False,
                    "git_blame_heatmap": False,
                },
            )
            assert compile_res.status_code == 200
            compile_data = compile_res.json()["data"]
            assert compile_data["sections_config"]["dependency_coupling"] is False

            # 3. Download Markdown file
            md_res = await ac.get(
                "/api/v1/projects/default-project/repositories/default-repo/report/download/markdown",
                headers=headers,
            )
            assert md_res.status_code == 200
            assert "# CodeLens AI" in md_res.text
            assert "Content-Disposition" in md_res.headers

            # 4. Download JSON file
            json_res = await ac.get(
                "/api/v1/projects/default-project/repositories/default-repo/report/download/json",
                headers=headers,
            )
            assert json_res.status_code == 200
            assert "dossier_id" in json_res.text
