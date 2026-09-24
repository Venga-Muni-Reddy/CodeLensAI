import asyncio
import io
import json
import uuid
import zipfile
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.modules.graph.service import (
    classify_file_layer,
    detect_cycles_tarjan,
    parse_imports_from_file,
)


def unique_email() -> str:
    return f"graph_tenant_{uuid.uuid4().hex[:8]}@codelens.io"


def create_sample_layered_zip() -> io.BytesIO:
    """Creates a sample zip archive with clean layers and a known circular import."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # 1. Routing Layer
        zf.writestr(
            "api/v1/payment_controller.py",
            "# Payment API controller\nfrom services.payment_service import process_payment\n\ndef post_payment():\n    return process_payment()\n",
        )
        # 2. Service Layer (Imports repo, but repo also imports service to create a cycle)
        zf.writestr(
            "services/payment_service.py",
            "# Service tier logic\nfrom repositories.transaction_repo import save_tx\n\ndef process_payment():\n    save_tx()\n    return {'status': 'success'}\n",
        )
        # 3. Persistence Layer (creates cycle back to services/payment_service)
        zf.writestr(
            "repositories/transaction_repo.py",
            "# Persistence repository\nfrom services.payment_service import process_payment\n\ndef save_tx():\n    pass\n",
        )
        # 4. Infrastructure Layer
        zf.writestr(
            "core/config.py",
            "# Infrastructure settings\nDATABASE_URL = 'mongodb://localhost:27017'\n",
        )
    buf.seek(0)
    return buf


def test_cycle_detection_tarjan():
    # A -> B -> C -> A (cycle)
    adj = {
        "A": ["B"],
        "B": ["C"],
        "C": ["A"],
        "D": ["A"],  # D is outside cycle
    }
    nodes = ["A", "B", "C", "D"]
    cycles = detect_cycles_tarjan(nodes, adj)
    assert len(cycles) == 1
    cycle_nodes = set(cycles[0])
    assert cycle_nodes == {"A", "B", "C"}

    # Pure DAG: A -> B -> C
    dag = {
        "A": ["B"],
        "B": ["C"],
        "C": [],
    }
    dag_nodes = ["A", "B", "C"]
    no_cycles = detect_cycles_tarjan(dag_nodes, dag)
    assert len(no_cycles) == 0


def test_layer_classification():
    layer, _ = classify_file_layer("api/v1/checkout.router.ts")
    assert layer == "routing"

    layer, _ = classify_file_layer("src/services/subscription_manager.ts")
    assert layer == "service"

    layer, _ = classify_file_layer("backend/app/models/user.py")
    assert layer == "persistence"

    layer, _ = classify_file_layer("backend/app/core/config.py")
    assert layer == "infra"


def test_import_resolution():
    content = """
    from services.payment_service import process_payment
    from ..core.config import settings
    import os
    """
    known = {
        "services/payment_service.py": "services/payment_service.py",
        "core/config.py": "core/config.py",
    }
    resolved = parse_imports_from_file("api/v1/payment.py", content, known)
    assert "services/payment_service.py" in resolved or "core/config.py" in resolved


@pytest.mark.asyncio
async def test_repository_graph_generation_and_api():
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # 1. Register & login
            email = unique_email()
            reg = await client.post(
                "/api/v1/auth/register",
                json={"email": email, "password": "Password123!", "name": "Graph Architect"},
            )
            assert reg.status_code == 201

            login_res = await client.post(
                "/api/v1/auth/login",
                json={"email": email, "password": "Password123!"},
            )
            assert login_res.status_code == 200
            auth_token = login_res.json()["data"]["access_token"]
            headers = {"Authorization": f"Bearer {auth_token}"}

            # 2. Create project
            proj_res = await client.post(
                "/api/v1/projects",
                headers=headers,
                json={"name": "Architecture Test Project", "description": "Phase 6 validation"},
            )
            assert proj_res.status_code == 201
            project_id = proj_res.json()["data"]["id"]

            # 3. Ingest ZIP repository with known layered structure & cycle
            zip_buf = create_sample_layered_zip()
            ingest_res = await client.post(
                f"/api/v1/projects/{project_id}/repositories/zip",
                headers=headers,
                files={"file": ("architecture-demo.zip", zip_buf, "application/zip")},
                data={"name": "Architecture Demo Repo", "branch": "main"},
            )
            assert ingest_res.status_code == 201
            repo_id = ingest_res.json()["data"]["id"]

            # 4. Fetch Dependency Graph
            graph_res = await client.get(
                f"/api/v1/projects/{project_id}/repositories/{repo_id}/graph",
                headers=headers,
            )
            assert graph_res.status_code == 200
            data = graph_res.json()["data"]

            # 5. Assertions on Architecture Classification
            arch = data["architecture"]
            assert arch["pattern_name"] in ["Layered / Clean Architecture", "MVC / Controller-Model Architecture"]
            assert arch["confidence"] >= 0.8
            assert len(arch["layers"]) == 4

            # 6. Assertions on File-Level Dependency Graph
            file_graph = data["file_graph"]
            nodes = file_graph["nodes"]
            edges = file_graph["edges"]
            assert len(nodes) == 4
            assert len(edges) >= 2

            # Check that circular dependency was detected between service & repo
            cycles = file_graph["cycles"]
            assert len(cycles) >= 1
            assert file_graph["metrics"]["cycle_count"] >= 1

            # Check that nodes have coupling and blast radius calculated
            service_node = next(n for n in nodes if "payment_service" in n["id"])
            assert service_node["layer"] == "service"
            assert service_node["coupling"]["ca"] >= 1 or service_node["coupling"]["ce"] >= 1
            assert service_node["blast_radius_pct"] >= 0.0

            # 7. Test Force Re-scan Endpoint
            rescan_res = await client.post(
                f"/api/v1/projects/{project_id}/repositories/{repo_id}/graph/rescan",
                headers=headers,
            )
            assert rescan_res.status_code == 200
            assert rescan_res.json()["data"]["ast_status"] == "Synchronized"
