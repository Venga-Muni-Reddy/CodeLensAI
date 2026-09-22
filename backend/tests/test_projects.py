import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


def unique_email() -> str:
    return f"tenant_{uuid.uuid4().hex[:8]}@codelens.io"


@pytest.mark.asyncio
async def test_project_lifecycle_and_tenant_isolation():
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # 1. Unauthorized access should be rejected
            unauth_res = await client.get("/api/v1/projects")
            assert unauth_res.status_code == 401

            # 2. Register Tenant A
            email_a = unique_email()
            reg_a = await client.post(
                "/api/v1/auth/register",
                json={"name": "Tenant A", "email": email_a, "password": "password123!"},
            )
            assert reg_a.status_code == 201
            login_a = await client.post(
                "/api/v1/auth/login",
                json={"email": email_a, "password": "password123!"},
            )
            token_a = login_a.json()["data"]["access_token"]
            headers_a = {"Authorization": f"Bearer {token_a}"}

            # 3. Register Tenant B
            email_b = unique_email()
            reg_b = await client.post(
                "/api/v1/auth/register",
                json={"name": "Tenant B", "email": email_b, "password": "password123!"},
            )
            assert reg_b.status_code == 201
            login_b = await client.post(
                "/api/v1/auth/login",
                json={"email": email_b, "password": "password123!"},
            )
            token_b = login_b.json()["data"]["access_token"]
            headers_b = {"Authorization": f"Bearer {token_b}"}

            # 4. Tenant A creates Project Alpha
            create_res = await client.post(
                "/api/v1/projects",
                headers=headers_a,
                json={"name": "Project Alpha", "description": "Tenant A microservices"},
            )
            assert create_res.status_code == 201
            project_data = create_res.json()["data"]
            project_id = project_data["id"]
            assert project_data["name"] == "Project Alpha"
            assert project_data["description"] == "Tenant A microservices"
            assert project_data["is_deleted"] is False

            # 5. Tenant A lists projects - should see Project Alpha
            list_a = await client.get("/api/v1/projects", headers=headers_a)
            assert list_a.status_code == 200
            projects_a = list_a.json()["data"]
            assert len(projects_a) == 1
            assert projects_a[0]["id"] == project_id

            # 6. Tenant B lists projects - should see NOTHING (isolation)
            list_b = await client.get("/api/v1/projects", headers=headers_b)
            assert list_b.status_code == 200
            projects_b = list_b.json()["data"]
            assert len(projects_b) == 0

            # 7. Tenant B attempts to get Tenant A's project -> 404 (cannot probe other tenants)
            cross_get = await client.get(f"/api/v1/projects/{project_id}", headers=headers_b)
            assert cross_get.status_code == 404

            # 8. Tenant B attempts to update Tenant A's project -> 404
            cross_update = await client.patch(
                f"/api/v1/projects/{project_id}",
                headers=headers_b,
                json={"name": "Hacked Name"},
            )
            assert cross_update.status_code == 404

            # 9. Tenant B attempts to delete Tenant A's project -> 404
            cross_del = await client.delete(f"/api/v1/projects/{project_id}", headers=headers_b)
            assert cross_del.status_code == 404

            # 10. Tenant A updates Project Alpha
            update_res = await client.patch(
                f"/api/v1/projects/{project_id}",
                headers=headers_a,
                json={"name": "Project Alpha Prime", "description": "Updated description"},
            )
            assert update_res.status_code == 200
            updated_data = update_res.json()["data"]
            assert updated_data["name"] == "Project Alpha Prime"
            assert updated_data["description"] == "Updated description"

            # 11. Tenant A soft-deletes Project Alpha
            del_res = await client.delete(f"/api/v1/projects/{project_id}", headers=headers_a)
            assert del_res.status_code == 204

            # 12. Tenant A lists projects - should now be empty (soft-deleted omitted)
            list_a_after = await client.get("/api/v1/projects", headers=headers_a)
            assert list_a_after.status_code == 200
            assert len(list_a_after.json()["data"]) == 0

            # 13. Tenant A tries to get soft-deleted project -> 404
            get_deleted = await client.get(f"/api/v1/projects/{project_id}", headers=headers_a)
            assert get_deleted.status_code == 404
