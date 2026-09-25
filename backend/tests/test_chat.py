import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.core.ai_factory import LLMProviderFactory, ai_manager, DeterministicMockProvider
from app.models.chat import SendMessageRequest
from app.modules.chat.service import ChatService


def unique_email() -> str:
    return f"chat_tenant_{uuid.uuid4().hex[:8]}@codelens.io"


def test_ai_factory_providers():
    # Verify factory instantiates providers correctly
    openrouter = LLMProviderFactory.create("openrouter")
    assert openrouter.name == "openrouter"

    gemini = LLMProviderFactory.create("gemini")
    assert gemini.name == "gemini"

    openai = LLMProviderFactory.create("openai")
    assert openai.name == "openai"

    grok = LLMProviderFactory.create("grok")
    assert grok.name == "grok"

    mock = LLMProviderFactory.create("mock")
    assert mock.name == "mock_intelligence"

    # Verify fallback chain priority
    chain = LLMProviderFactory.get_fallback_chain()
    assert [p.name for p in chain] == ["openrouter", "gemini", "openai", "grok", "mock_intelligence"]

    # Verify preferred provider re-ordering
    mock_preferred = LLMProviderFactory.get_fallback_chain(preferred="mock")
    assert mock_preferred[0].name == "mock_intelligence"


@pytest.mark.asyncio
async def test_deterministic_mock_provider():
    mock = DeterministicMockProvider()
    res = await mock.generate([{"role": "user", "content": "How does auth flow work?"}])
    assert res.provider_used == "mock_intelligence"
    assert "authentication execution flow" in res.content
    assert "@auth.py:login_access_token()" in res.content


@pytest.mark.asyncio
async def test_chat_service_lifecycle():
    proj_id = "test-proj-123"
    repo_id = "test-repo-456"

    # 1. List conversations (seeds initial thread)
    convs = await ChatService.list_conversations(proj_id, repo_id)
    assert len(convs) >= 1
    assert convs[0].id == "seed-thread-auth-jwt"

    # 2. Create new thread
    new_thread = await ChatService.create_conversation(
        proj_id, repo_id, title="Database Optimization"
    )
    assert new_thread.title == "Database Optimization"
    assert new_thread.message_count == 0

    # 3. Send message via preferred mock provider
    req = SendMessageRequest(
        message="Explain database connection pool tuning in postgres",
        conversation_id=new_thread.id,
        preferred_provider="mock",
    )
    updated_conv, ai_msg = await ChatService.send_message(proj_id, repo_id, req)
    assert updated_conv.message_count == 2
    assert ai_msg.role == "assistant"
    assert len(ai_msg.content) > 20
    assert len(ai_msg.suggested_inquiries) >= 2

    # 4. Record feedback
    feedback_ok = await ChatService.record_feedback(
        proj_id, repo_id, updated_conv.id, ai_msg.id, "helpful"
    )
    assert feedback_ok is True

    # 5. Delete conversation
    del_ok = await ChatService.delete_conversation(proj_id, repo_id, new_thread.id)
    assert del_ok is True


@pytest.mark.asyncio
async def test_chat_api_endpoints():
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            email = unique_email()
            pwd = "ChatSecurePassword!2026"

            # 1. Register & login
            reg_res = await client.post(
                "/api/v1/auth/register",
                json={"email": email, "password": pwd, "name": "AI Chat User"},
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
                json={"name": "AI Assistant Project", "description": "Phase 8 validation"},
            )
            assert proj_res.status_code == 201
            project_id = proj_res.json()["data"]["id"]

            # 3. Create repository via zip upload
            import io, zipfile
            buf = io.BytesIO()
            with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
                zf.writestr("api/auth.py", "@router.post('/login')\nasync def login(): pass\n")
            buf.seek(0)

            repo_res = await client.post(
                f"/api/v1/projects/{project_id}/repositories/zip",
                headers=headers,
                files={"file": ("chat_repo.zip", buf, "application/zip")},
                data={"name": "core-platform-repo", "branch": "main"},
            )
            assert repo_res.status_code == 201
            repository_id = repo_res.json()["data"]["id"]

            # 4. List conversations
            list_res = await client.get(
                f"/api/v1/projects/{project_id}/repositories/{repository_id}/chat/conversations",
                headers=headers,
            )
            assert list_res.status_code == 200
            convs = list_res.json()["data"]
            assert len(convs) >= 1

            # 5. Send chat message
            send_res = await client.post(
                f"/api/v1/projects/{project_id}/repositories/{repository_id}/chat/message",
                headers=headers,
                json={
                    "message": "How does user authentication work in this repo?",
                    "preferred_provider": "mock",
                },
            )
            assert send_res.status_code == 200
            data = send_res.json()["data"]
            assert "conversation" in data
            assert "message" in data
            assert data["message"]["role"] == "assistant"
            assert data["message"]["latency_ms"] is not None
