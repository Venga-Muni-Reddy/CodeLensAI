import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


def unique_email() -> str:
    return f"repo_tenant_{uuid.uuid4().hex[:8]}@codelens.io"


@pytest.mark.asyncio
async def test_repository_lifecycle_and_tenant_isolation():
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # 1. Unauthorized request rejected
            unauth = await client.get("/api/v1/projects/507f1f77bcf86cd799439011/repositories")
            assert unauth.status_code == 401

            # 2. Register Tenant A
            email_a = unique_email()
            reg_a = await client.post(
                "/api/v1/auth/register",
                json={"name": "Tenant Alpha", "email": email_a, "password": "password123!"},
            )
            assert reg_a.status_code == 201
            login_a = await client.post(
                "/api/v1/auth/login",
                json={"email": email_a, "password": "password123!"},
            )
            token_a = login_a.json()["data"]["access_token"]
            headers_a = {"Authorization": f"Bearer {token_a}"}

            # 3. Tenant A creates a Project
            proj_res = await client.post(
                "/api/v1/projects",
                headers=headers_a,
                json={"name": "Alpha Workspaces", "description": "Microservices"},
            )
            assert proj_res.status_code == 201
            proj_id = proj_res.json()["data"]["id"]
            assert proj_res.json()["data"]["repository_count"] == 0

            # 4. Tenant A imports a GitHub repository
            import_payload = {
                "source_url": "https://github.com/octocat/Hello-World",
                "default_branch": "master",
                "shallow_clone": True,
                "exclude_binaries": True,
            }
            import_res = await client.post(
                f"/api/v1/projects/{proj_id}/repositories/github",
                headers=headers_a,
                json=import_payload,
            )
            assert import_res.status_code == 201
            repo_data = import_res.json()["data"]
            repo_id = repo_data["id"]
            assert repo_data["name"] == "Hello-World"
            assert repo_data["source_type"] == "github"
            assert repo_data["status"] in ["queued", "cloning", "ready"]
            assert repo_data["project_id"] == proj_id

            # 5. Verify parent project's repository_count incremented to 1
            proj_check = await client.get(f"/api/v1/projects/{proj_id}", headers=headers_a)
            assert proj_check.status_code == 200
            assert proj_check.json()["data"]["repository_count"] == 1

            # 6. Tenant A lists repositories for project
            list_res = await client.get(
                f"/api/v1/projects/{proj_id}/repositories",
                headers=headers_a,
            )
            assert list_res.status_code == 200
            repos = list_res.json()["data"]
            assert len(repos) == 1
            assert repos[0]["id"] == repo_id

            # 7. Register Tenant B
            email_b = unique_email()
            reg_b = await client.post(
                "/api/v1/auth/register",
                json={"name": "Tenant Beta", "email": email_b, "password": "password123!"},
            )
            assert reg_b.status_code == 201
            login_b = await client.post(
                "/api/v1/auth/login",
                json={"email": email_b, "password": "password123!"},
            )
            token_b = login_b.json()["data"]["access_token"]
            headers_b = {"Authorization": f"Bearer {token_b}"}

            # 8. Tenant B attempts to access Tenant A's project repositories -> 404 (Isolation)
            cross_list = await client.get(
                f"/api/v1/projects/{proj_id}/repositories",
                headers=headers_b,
            )
            assert cross_list.status_code == 404

            # 9. Tenant B attempts to get Tenant A's repo details -> 404
            cross_get = await client.get(
                f"/api/v1/repositories/{repo_id}",
                headers=headers_b,
            )
            assert cross_get.status_code == 404

            # 10. Tenant B attempts to delete Tenant A's repo -> 404
            cross_del = await client.delete(
                f"/api/v1/repositories/{repo_id}",
                headers=headers_b,
            )
            assert cross_del.status_code == 404

            # 11. Tenant A soft-deletes the repository
            del_res = await client.delete(
                f"/api/v1/repositories/{repo_id}",
                headers=headers_a,
            )
            assert del_res.status_code == 204

            # 12. List repositories for Project A is now empty
            list_after = await client.get(
                f"/api/v1/projects/{proj_id}/repositories",
                headers=headers_a,
            )
            assert list_after.status_code == 200
            assert len(list_after.json()["data"]) == 0

            # 13. Parent project repo count decremented back to 0
            proj_after = await client.get(f"/api/v1/projects/{proj_id}", headers=headers_a)
            assert proj_after.status_code == 200
            assert proj_after.json()["data"]["repository_count"] == 0
