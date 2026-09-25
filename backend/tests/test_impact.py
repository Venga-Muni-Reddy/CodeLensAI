import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.models.impact import ImpactAnalysisRequest
from app.modules.impact.service import ImpactAnalysisService


def unique_email() -> str:
    return f"impact_tenant_{uuid.uuid4().hex[:8]}@codelens.io"


@pytest.mark.asyncio
async def test_impact_analysis_service_concentric_shockwave():
    # Test service directly with depth=3
    req = ImpactAnalysisRequest(
        target_symbol="PaymentService.processPayment()",
        target_type="fn",
        depth=3,
    )
    from unittest.mock import AsyncMock
    mock_db = AsyncMock()
    mock_db.__getitem__.return_value.find_one = AsyncMock(return_value=None)

    res = await ImpactAnalysisService.analyze_impact(
        db=mock_db,
        repository_id="test-repo-123",
        project_id="test-proj-456",
        request=req,
    )

    assert res.target.name == "PaymentService.processPayment()"
    assert res.depth == 3
    assert res.metrics.total_nodes_affected >= 5
    assert res.metrics.blast_radius_score > 0
    assert len(res.concentric_nodes) > 0
    assert len(res.concentric_edges) > 0

    # Verify Ring 0 Epicenter exists
    epicenter = next((n for n in res.concentric_nodes if n.ring == 0), None)
    assert epicenter is not None
    assert epicenter.node_type == "epicenter"

    # Verify Ring 1 Direct Callers
    r1_nodes = [n for n in res.concentric_nodes if n.ring == 1]
    assert len(r1_nodes) >= 2

    # Verify Direct contract breaks
    assert len(res.direct_impact) >= 2
    assert any("Param Mismatch" in item.issue_type for item in res.direct_impact)

    # Verify Ring 2 Transitive Consumers
    r2_nodes = [n for n in res.concentric_nodes if n.ring == 2]
    assert len(r2_nodes) >= 1

    # Verify Ring 3 Outer Perimeter (endpoints/tests)
    r3_nodes = [n for n in res.concentric_nodes if n.ring == 3]
    assert len(r3_nodes) >= 1

    # Verify AI Refactoring Advisor checklist & wrapper
    assert res.ai_advisor is not None
    assert len(res.ai_advisor.checklist) >= 2
    assert res.ai_advisor.recommended_wrapper_snippet is not None


@pytest.mark.asyncio
async def test_impact_analysis_depth_filtering():
    from unittest.mock import AsyncMock
    mock_db = AsyncMock()
    mock_db.__getitem__.return_value.find_one = AsyncMock(return_value=None)

    # With depth=1, should not include ring 2 or 3 nodes
    req_d1 = ImpactAnalysisRequest(
        target_symbol="PaymentService.processPayment()",
        target_type="fn",
        depth=1,
    )
    res_d1 = await ImpactAnalysisService.analyze_impact(
        db=mock_db,
        repository_id="test-repo-123",
        project_id="test-proj-456",
        request=req_d1,
    )
    assert res_d1.depth == 1
    assert all(n.ring <= 1 for n in res_d1.concentric_nodes)


@pytest.mark.asyncio
async def test_impact_analysis_endpoints_integration():
    async with app.router.lifespan_context(app):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            email = unique_email()
            pwd = "SecurePassword123!"

            # Register user
            reg_res = await ac.post("/api/v1/auth/register", json={"email": email, "password": pwd, "name": "Impact Tester"})
            assert reg_res.status_code == 201

            login_res = await ac.post("/api/v1/auth/login", json={"email": email, "password": pwd})
            assert login_res.status_code == 200
            token = login_res.json()["data"]["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # 1. Test Project Impact Analysis endpoint
            analyze_res = await ac.post(
                "/api/v1/projects/default-project/repositories/default-repo/impact/analyze",
                headers=headers,
                json={
                    "target_symbol": "PaymentService.processPayment()",
                    "target_type": "fn",
                    "depth": 3,
                },
            )
            assert analyze_res.status_code == 200
            data = analyze_res.json()["data"]
            assert data["target"]["name"] == "PaymentService.processPayment()"
            assert data["metrics"]["blast_radius_score"] >= 20
            assert len(data["concentric_nodes"]) > 0

            # 2. Test List Symbols endpoint
            symbols_res = await ac.get(
                "/api/v1/projects/default-project/repositories/default-repo/impact/symbols",
                headers=headers,
            )
            assert symbols_res.status_code == 200
            symbols_data = symbols_res.json()["data"]
            assert "symbols" in symbols_data
            assert len(symbols_data["symbols"]) > 0

            # 3. Test PRD §65 Endpoint Contract
            prd_res = await ac.post(
                "/api/v1/repositories/default-repo/impact-analysis",
                headers=headers,
                json={
                    "target_symbol": "AuthService.authenticateUser()",
                    "target_type": "fn",
                    "depth": 2,
                },
            )
            assert prd_res.status_code == 200
            prd_data = prd_res.json()["data"]
            assert prd_data["depth"] == 2
