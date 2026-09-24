import io
import uuid
import zipfile
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.modules.features.service import FeatureDiscoveryService


def unique_email() -> str:
    return f"feature_tenant_{uuid.uuid4().hex[:8]}@codelens.io"


def test_feature_discovery_service_query():
    # Test service without query returns default curated list
    all_feats = FeatureDiscoveryService.get_features()
    assert len(all_feats) >= 4
    categories = {f.category for f in all_feats}
    assert "auth" in categories
    assert "billing" in categories

    # Test query for 'login'
    login_feats = FeatureDiscoveryService.get_features(query="login")
    assert len(login_feats) >= 1
    assert login_feats[0].id == "auth-login"
    assert len(login_feats[0].steps) == 4

    # Test query for 'stripe'
    stripe_feats = FeatureDiscoveryService.get_features(query="stripe")
    assert len(stripe_feats) >= 1
    assert stripe_feats[0].id == "billing-checkout"


@pytest.mark.asyncio
async def test_feature_discovery_api_lifecycle():
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            email = unique_email()
            pwd = "FeatureStrongPassword!2026"

            # 1. Register & login
            reg_res = await client.post(
                "/api/v1/auth/register",
                json={"email": email, "password": pwd, "name": "Feature Test User"},
            )
            assert reg_res.status_code == 201

            login_res = await client.post(
                "/api/v1/auth/login",
                json={"email": email, "password": pwd},
            )
            assert login_res.status_code == 200
            auth_token = login_res.json()["data"]["access_token"]
            headers = {"Authorization": f"Bearer {auth_token}"}

            # 2. Create project
            proj_res = await client.post(
                "/api/v1/projects",
                headers=headers,
                json={"name": "Feature Test Project", "description": "Phase 7 validation"},
            )
            assert proj_res.status_code == 201
            project_id = proj_res.json()["data"]["id"]

            # 3. Create zip repo
            buf = io.BytesIO()
            with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
                zf.writestr("api/auth.py", "@router.post('/login')\nasync def login(): pass\n")
            buf.seek(0)

            upload_res = await client.post(
                f"/api/v1/projects/{project_id}/repositories/zip",
                headers=headers,
                files={"file": ("features.zip", buf, "application/zip")},
                data={"name": "features-repo", "branch": "main"},
            )
            assert upload_res.status_code == 201
            repo_id = upload_res.json()["data"]["id"]

            # 4. GET features
            get_res = await client.get(
                f"/api/v1/projects/{project_id}/repositories/{repo_id}/features",
                headers=headers,
            )
            assert get_res.status_code == 200
            data = get_res.json()["data"]
            assert data["total_discovered"] >= 4
            assert len(data["features"]) >= 4

            # 5. POST discover search query
            discover_res = await client.post(
                f"/api/v1/projects/{project_id}/repositories/{repo_id}/features/discover",
                headers=headers,
                json={"query": "user login session"},
            )
            assert discover_res.status_code == 200
            discover_data = discover_res.json()["data"]
            assert len(discover_data["features"]) >= 1
            assert discover_data["features"][0]["id"] == "auth-login"

            # 6. POST rescan
            rescan_res = await client.post(
                f"/api/v1/projects/{project_id}/repositories/{repo_id}/features/rescan",
                headers=headers,
            )
            assert rescan_res.status_code == 200
