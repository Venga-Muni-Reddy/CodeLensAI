import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


def unique_email() -> str:
    return f"dev_{uuid.uuid4().hex[:8]}@codelens.io"


@pytest.mark.asyncio
async def test_auth_full_lifecycle():
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            test_email = unique_email()
            test_password = "supersecretpassword123"
            test_name = "Alex Mercer"

            # 1. Register
            reg_payload = {
                "name": test_name,
                "email": test_email,
                "password": test_password,
            }
            reg_res = await client.post("/api/v1/auth/register", json=reg_payload)
            assert reg_res.status_code == 201
            reg_data = reg_res.json()
            assert reg_data["success"] is True
            user = reg_data["data"]["user"]
            assert user["email"] == test_email
            assert user["name"] == test_name
            assert "id" in user
            assert "password_hash" not in user

            # 2. Duplicate Registration Rejection
            dup_res = await client.post("/api/v1/auth/register", json=reg_payload)
            assert dup_res.status_code == 409
            dup_data = dup_res.json()
            assert dup_data["success"] is False
            assert dup_data["error"]["code"] == "EMAIL_ALREADY_EXISTS"

            # 3. Invalid Password (< 8 chars)
            bad_pass_res = await client.post(
                "/api/v1/auth/register",
                json={"name": "Test", "email": unique_email(), "password": "short"},
            )
            assert bad_pass_res.status_code == 422

            # 4. Login with Wrong Password
            bad_login = await client.post(
                "/api/v1/auth/login",
                json={"email": test_email, "password": "wrongpassword!"},
            )
            assert bad_login.status_code == 401
            assert bad_login.json()["error"]["code"] == "INVALID_CREDENTIALS"

            # 5. Successful Login
            login_res = await client.post(
                "/api/v1/auth/login",
                json={"email": test_email, "password": test_password},
            )
            assert login_res.status_code == 200
            login_data = login_res.json()
            assert login_data["success"] is True
            access_token = login_data["data"]["access_token"]
            refresh_token = login_data["data"]["refresh_token"]
            assert access_token
            assert refresh_token

            # Verify cookie was set
            cookies = login_res.cookies
            assert "refresh_token" in cookies

            # 6. Protected Endpoint: /api/v1/auth/me without token
            unauth_me = await client.get("/api/v1/auth/me")
            assert unauth_me.status_code == 401
            assert unauth_me.json()["error"]["code"] == "NOT_AUTHENTICATED"

            # 7. Protected Endpoint: /api/v1/auth/me with valid Bearer token
            auth_headers = {"Authorization": f"Bearer {access_token}"}
            me_res = await client.get("/api/v1/auth/me", headers=auth_headers)
            assert me_res.status_code == 200
            me_data = me_res.json()
            assert me_data["success"] is True
            assert me_data["data"]["email"] == test_email
            assert me_data["data"]["id"] == user["id"]

            # 8. Token Refresh
            refresh_res = await client.post(
                "/api/v1/auth/refresh",
                json={"refresh_token": refresh_token},
            )
            assert refresh_res.status_code == 200
            ref_data = refresh_res.json()
            assert ref_data["success"] is True
            new_access_token = ref_data["data"]["access_token"]
            assert new_access_token
            assert new_access_token != access_token

            # Verify new access token works for /me
            new_auth_headers = {"Authorization": f"Bearer {new_access_token}"}
            me_res2 = await client.get("/api/v1/auth/me", headers=new_auth_headers)
            assert me_res2.status_code == 200
            assert me_res2.json()["data"]["id"] == user["id"]

            # 9. Logout
            logout_res = await client.post("/api/v1/auth/logout")
            assert logout_res.status_code == 200
            assert logout_res.json()["success"] is True
