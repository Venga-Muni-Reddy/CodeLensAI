import asyncio
import io
import json
import uuid
import zipfile
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


def unique_email() -> str:
    return f"analysis_tenant_{uuid.uuid4().hex[:8]}@codelens.io"


def create_codebase_zip() -> io.BytesIO:
    """Create a sample zip archive containing Python, TypeScript, CSS, and manifests."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            "backend/main.py",
            "# CodeLens backend entry point\nfrom fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get('/')\ndef root():\n    return {'status': 'ok'}\n",
        )
        zf.writestr(
            "backend/service.py",
            "# Service layer logic\ndef compute(a: int, b: int) -> int:\n    # Return sum\n    return a + b\n",
        )
        zf.writestr(
            "frontend/App.tsx",
            "// Frontend entry\nimport React from 'react';\n\nexport const App = () => {\n  return <div>Hello CodeLens</div>;\n};\n",
        )
        zf.writestr(
            "frontend/styles.css",
            "/* Global CSS */\nbody {\n  margin: 0;\n  background: #0c0e16;\n}\n",
        )
        zf.writestr(
            "package.json",
            json.dumps({
                "name": "codelens-demo",
                "dependencies": {
                    "react": "^18.3.1",
                    "zustand": "^4.5.2",
                    "tailwindcss": "^3.4.1",
                },
            }),
        )
        zf.writestr(
            "requirements.txt",
            "fastapi==0.110.0\nuvicorn==0.29.0\nmotor==3.3.2\npytest==8.1.0\n",
        )
    buf.seek(0)
    return buf


@pytest.mark.asyncio
async def test_repository_analysis_pipeline_and_metrics():
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # 1. Register & login Tenant Alpha
            email_a = unique_email()
            reg_a = await client.post(
                "/api/v1/auth/register",
                json={"name": "Analysis Tester", "email": email_a, "password": "password123!"},
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
                json={"name": "Intelligence Workspace", "description": "AST testing"},
            )
            assert proj_res.status_code == 201
            proj_id = proj_res.json()["data"]["id"]

            # 3. Ingest ZIP Codebase
            zip_buf = create_codebase_zip()
            upload_res = await client.post(
                f"/api/v1/projects/{proj_id}/repositories/zip",
                headers=headers_a,
                files={"file": ("sample-project.zip", zip_buf.getvalue(), "application/zip")},
                data={"name": "intelligence-demo", "branch": "main"},
            )
            assert upload_res.status_code == 201
            repo_id = upload_res.json()["data"]["id"]

            # 4. Trigger Analysis
            trigger_res = await client.post(
                f"/api/v1/repositories/{repo_id}/analyze",
                headers=headers_a,
            )
            assert trigger_res.status_code == 202
            job = trigger_res.json()["data"]
            assert job["repository_id"] == repo_id
            assert job["status"] in ["queued", "analyzing", "completed"]

            # Wait briefly for background pipeline to complete
            await asyncio.sleep(1.5)

            # 5. Fetch Latest Analysis Results
            analysis_res = await client.get(
                f"/api/v1/repositories/{repo_id}/analysis/latest",
                headers=headers_a,
            )
            assert analysis_res.status_code == 200
            analysis = analysis_res.json()["data"]
            assert analysis is not None
            assert analysis["repository_id"] == repo_id

            # Verify Summary Metrics
            summary = analysis["summary"]
            assert summary["total_files"] >= 4
            assert summary["total_sloc"] > 0
            assert summary["total_comments"] > 0
            assert summary["maintainability_grade"] in ["A+ Clean", "A Modular", "B Standard"]

            # Verify Languages Breakdown
            lang_names = [l["name"] for l in analysis["languages"]]
            assert "Python" in lang_names
            assert "TypeScript" in lang_names

            # Verify Frameworks Detection
            fw_names = [f["name"] for f in analysis["frameworks"]]
            assert "FastAPI" in fw_names
            assert "React" in fw_names
            assert "Zustand" in fw_names

            # Verify File Inventory
            paths = [f["relative_path"] for f in analysis["file_inventory"]]
            assert any("main.py" in p for p in paths)
            assert any("App.tsx" in p for p in paths)

            # 6. Verify Jobs History List
            jobs_res = await client.get(
                f"/api/v1/repositories/{repo_id}/analysis/jobs",
                headers=headers_a,
            )
            assert jobs_res.status_code == 200
            assert len(jobs_res.json()["data"]) >= 1

            # 7. Cross-tenant rejection
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

            cross_analyze = await client.post(
                f"/api/v1/repositories/{repo_id}/analyze",
                headers=headers_b,
            )
            assert cross_analyze.status_code == 404

            cross_latest = await client.get(
                f"/api/v1/repositories/{repo_id}/analysis/latest",
                headers=headers_b,
            )
            assert cross_latest.status_code == 404
