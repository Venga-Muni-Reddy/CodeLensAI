import io
import uuid
import zipfile
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


def unique_email() -> str:
    return f"zip_tenant_{uuid.uuid4().hex[:8]}@codelens.io"


def create_sample_zip(entries: dict[str, bytes]) -> io.BytesIO:
    """Create in-memory zip archive with given path->content mapping."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for path, data in entries.items():
            zf.writestr(path, data)
    buf.seek(0)
    return buf


@pytest.mark.asyncio
async def test_zip_repository_lifecycle_and_security():
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # 1. Register Tenant A
            email_a = unique_email()
            reg_a = await client.post(
                "/api/v1/auth/register",
                json={"name": "Zip Tenant Alpha", "email": email_a, "password": "password123!"},
            )
            assert reg_a.status_code == 201
            login_a = await client.post(
                "/api/v1/auth/login",
                json={"email": email_a, "password": "password123!"},
            )
            token_a = login_a.json()["data"]["access_token"]
            headers_a = {"Authorization": f"Bearer {token_a}"}

            # 2. Create Project
            proj_res = await client.post(
                "/api/v1/projects",
                headers=headers_a,
                json={"name": "Zip Workspace", "description": "Local codebase ingestion"},
            )
            assert proj_res.status_code == 201
            proj_id = proj_res.json()["data"]["id"]

            # 3. Upload Valid ZIP with dependency & binary filtering
            zip_payload = create_sample_zip({
                "src/main.py": b"print('Hello CodeLens')\n",
                "src/utils.py": b"def add(a, b): return a + b\n",
                "node_modules/dummy/index.js": b"module.exports = {};\n",
                "assets/hero.png": b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR...",
                "README.md": b"# Sample Codebase\n",
            })

            files = {"file": ("codebase.zip", zip_payload.getvalue(), "application/zip")}
            data = {
                "name": "sample-backend",
                "branch": "archive-v1",
                "exclude_dependencies": "true",
                "exclude_binaries": "true",
            }

            upload_res = await client.post(
                f"/api/v1/projects/{proj_id}/repositories/zip",
                headers=headers_a,
                files=files,
                data=data,
            )
            assert upload_res.status_code == 201
            repo = upload_res.json()["data"]
            repo_id = repo["id"]
            assert repo["name"] == "sample-backend"
            assert repo["source_type"] == "zip"
            assert repo["status"] == "ready"
            assert repo["default_branch"] == "archive-v1"
            # 3 pure source files kept (src/main.py, src/utils.py, README.md), node_modules and png purged
            assert repo["file_count"] == 3
            assert repo["size_bytes"] > 0

            # 4. Verify parent project repository count incremented
            proj_check = await client.get(f"/api/v1/projects/{proj_id}", headers=headers_a)
            assert proj_check.status_code == 200
            assert proj_check.json()["data"]["repository_count"] == 1

            # 5. Reject Non-ZIP File
            bad_file = {"file": ("report.pdf", b"%PDF-1.4...", "application/pdf")}
            bad_res = await client.post(
                f"/api/v1/projects/{proj_id}/repositories/zip",
                headers=headers_a,
                files=bad_file,
                data={"name": "bad-repo"},
            )
            assert bad_res.status_code == 400
            assert bad_res.json()["error"]["code"] == "INVALID_FILE_TYPE"

            # 6. Reject Zip-Slip / Path Traversal Attack
            slip_zip = create_sample_zip({
                "../../escaped.txt": b"Malicious payload",
                "safe.txt": b"Safe content",
            })
            slip_files = {"file": ("malicious.zip", slip_zip.getvalue(), "application/zip")}
            slip_res = await client.post(
                f"/api/v1/projects/{proj_id}/repositories/zip",
                headers=headers_a,
                files=slip_files,
                data={"name": "slip-repo"},
            )
            assert slip_res.status_code == 400
            assert slip_res.json()["error"]["code"] == "ZIP_TRAVERSAL_ATTACK"

            # 7. Cross-tenant isolation test
            email_b = unique_email()
            await client.post(
                "/api/v1/auth/register",
                json={"name": "Tenant Beta", "email": email_b, "password": "password123!"},
            )
            login_b = await client.post(
                "/api/v1/auth/login",
                json={"email": email_b, "password": "password123!"},
            )
            token_b = login_b.json()["data"]["access_token"]
            headers_b = {"Authorization": f"Bearer {token_b}"}

            # Tenant B cannot access Tenant A's ZIP repo
            cross_get = await client.get(f"/api/v1/repositories/{repo_id}", headers=headers_b)
            assert cross_get.status_code == 404

            # Tenant A deletes the repo
            del_res = await client.delete(f"/api/v1/repositories/{repo_id}", headers=headers_a)
            assert del_res.status_code == 204

            # Verify project count decremented
            proj_final = await client.get(f"/api/v1/projects/{proj_id}", headers=headers_a)
            assert proj_final.json()["data"]["repository_count"] == 0
