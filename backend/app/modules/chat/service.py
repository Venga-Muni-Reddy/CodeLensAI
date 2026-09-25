import logging
from datetime import datetime
from typing import AsyncGenerator, Dict, List, Optional, Tuple, Any
import uuid

from app.core.ai_factory import ai_manager, LLMResult
from app.models.chat import (
    ChatMessage,
    Conversation,
    Citation,
    SendMessageRequest,
)
from app.modules.chat.rag_service import RAGContextService

logger = logging.getLogger(__name__)

# In-memory storage cache for conversations in case MongoDB is initializing or in dev
_CONVERSATIONS_CACHE: Dict[str, Conversation] = {}


class ChatService:
    @staticmethod
    def _get_curated_seed_conversation(project_id: str, repo_id: str) -> Conversation:
        """Seeds initial realistic conversation matching the Stitch design UI."""
        conv_id = "seed-thread-auth-jwt"
        user_msg = ChatMessage(
            id="msg-user-seed-1",
            role="user",
            content="How does the authentication flow handle credential verification and JWT session rotation across the persistence layers?",
            created_at=datetime.utcnow(),
            citations=[],
        )
        ai_msg = ChatMessage(
            id="msg-ai-seed-1",
            role="assistant",
            content=(
                "Based on your repository’s AST analysis, the authentication execution spans across **4 architectural layers** with strict boundary separation:\n\n"
                "### 1. Route Entrypoint & Input Validation (`api/v1/auth.py`)\n"
                "Receives the `LoginPayload`. FastAPI’s dependency injection passes validated credentials into the domain-level service via the `OAuth2PasswordRequestForm` schema.\n\n"
                "### 2. Domain Logic & Bcrypt Verification (`services/auth_service.py`)\n"
                "Executes `authenticate_user()`. Queries user persistence and invokes constant-time hash comparison `bcrypt.checkpw()` to mitigate side-channel timing attacks.\n\n"
                "### 3. Database Entity Lookup (`repositories/user_repo.py`)\n"
                "Retrieves active user record via indexed query: `select(User).where(User.email == email)` with eager relations on role bindings.\n\n"
                "### 4. JWT HS256 Token Signature & Redis Session Cache (`core/security.py`)\n"
                "Generates access/refresh keypair. The refresh token hash is registered in Redis with an absolute TTL of 86,400s, enabling atomic rotation upon each exchange.\n\n"
                "```python\n"
                "# services/auth_service.py:L42-L68\n"
                "async def authenticate_user(db: AsyncSession, email: str, password: str) -> AuthSession:\n"
                "    # 1. Fetch user record through persistence layer\n"
                "    user = await user_repo.get_by_email(db, email=email)\n"
                "    if not user or not security.verify_password(password, user.hashed_password):\n"
                "        raise InvalidCredentialsException('Malformed credentials or inactive account.')\n"
                "    \n"
                "    # 2. Invalidate previous refresh token in Redis (Token Rotation)\n"
                "    await redis_client.delete(f'session:{user.id}')\n"
                "    \n"
                "    # 3. Mint atomic token pair with rotating nonce\n"
                "    session_tokens = security.create_session_tokens(subject=user.id, scopes=user.scopes)\n"
                "    await redis_client.setex(f'session:{user.id}', timedelta(days=1), session_tokens.refresh_token)\n"
                "    return session_tokens\n"
                "```"
            ),
            created_at=datetime.utcnow(),
            citations=[
                Citation(
                    file_path="services/auth_service.py",
                    symbol_name="authenticate_user()",
                    line_start=42,
                    line_end=68,
                    match_percentage=98,
                    layer="domain",
                ),
                Citation(
                    file_path="repositories/user_repo.py",
                    symbol_name="get_by_email()",
                    line_start=104,
                    line_end=128,
                    match_percentage=94,
                    layer="persistence",
                ),
                Citation(
                    file_path="core/security.py",
                    symbol_name="create_session_tokens()",
                    line_start=14,
                    line_end=40,
                    match_percentage=96,
                    layer="infra",
                ),
            ],
            provider_used="openrouter",
            model_used="openai/gpt-3.5-turbo",
            latency_ms=320.0,
            fallback_occurred=False,
            attempts=["openrouter:openai/gpt-3.5-turbo"],
            suggested_inquiries=[
                "Show Redis session invalidation on logout",
                "How do I add 2FA two-factor authentication to this flow?",
                "Generate code patch for password complexity check",
            ],
        )

        return Conversation(
            id=conv_id,
            project_id=project_id,
            repository_id=repo_id,
            title="Explaining Auth & JWT Rotation Architecture",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            messages=[user_msg, ai_msg],
            pinned=True,
            tags=["Auth & Sec", "4 Layers"],
            message_count=2,
        )

    @classmethod
    async def list_conversations(
        cls, project_id: str, repo_id: str, db: Any = None
    ) -> List[Conversation]:
        conversations: List[Conversation] = []

        if db is not None:
            try:
                cursor = db["chat_conversations"].find(
                    {"project_id": project_id, "repository_id": repo_id}
                ).sort("updated_at", -1)
                async for doc in cursor:
                    doc.pop("_id", None)
                    conversations.append(Conversation(**doc))
            except Exception as e:
                logger.warning(f"Error reading conversations from db: {e}")

        # Check memory cache
        for conv in _CONVERSATIONS_CACHE.values():
            if conv.project_id == project_id and conv.repository_id == repo_id:
                if not any(c.id == conv.id for c in conversations):
                    conversations.append(conv)

        # Seed if empty
        if not conversations:
            seed = cls._get_curated_seed_conversation(project_id, repo_id)
            _CONVERSATIONS_CACHE[seed.id] = seed
            conversations.append(seed)
            if db is not None:
                try:
                    await db["chat_conversations"].insert_one(seed.model_dump())
                except Exception:
                    pass

        return conversations

    @classmethod
    async def get_conversation(
        cls, project_id: str, repo_id: str, conversation_id: str, db: Any = None
    ) -> Optional[Conversation]:
        if conversation_id in _CONVERSATIONS_CACHE:
            return _CONVERSATIONS_CACHE[conversation_id]

        if db is not None:
            try:
                doc = await db["chat_conversations"].find_one(
                    {"id": conversation_id, "project_id": project_id, "repository_id": repo_id}
                )
                if doc:
                    doc.pop("_id", None)
                    conv = Conversation(**doc)
                    _CONVERSATIONS_CACHE[conv.id] = conv
                    return conv
            except Exception as e:
                logger.warning(f"Error fetching conversation from db: {e}")

        if conversation_id == "seed-thread-auth-jwt":
            seed = cls._get_curated_seed_conversation(project_id, repo_id)
            _CONVERSATIONS_CACHE[seed.id] = seed
            return seed

        return None

    @classmethod
    async def create_conversation(
        cls, project_id: str, repo_id: str, title: Optional[str] = None, tags: Optional[List[str]] = None, db: Any = None
    ) -> Conversation:
        conv = Conversation(
            id=str(uuid.uuid4()),
            project_id=project_id,
            repository_id=repo_id,
            title=title or "New Chat Thread",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            messages=[],
            pinned=False,
            tags=tags or ["AST Ingested"],
            message_count=0,
        )
        _CONVERSATIONS_CACHE[conv.id] = conv
        if db is not None:
            try:
                await db["chat_conversations"].insert_one(conv.model_dump())
            except Exception as e:
                logger.warning(f"Error saving conversation to db: {e}")

        return conv

    @classmethod
    async def rename_conversation(
        cls, project_id: str, repo_id: str, conversation_id: str, new_title: str, db: Any = None
    ) -> Optional[Conversation]:
        conv = await cls.get_conversation(project_id, repo_id, conversation_id, db=db)
        if not conv:
            return None

        conv.title = new_title.strip() or "Untitled Thread"
        conv.updated_at = datetime.utcnow()
        _CONVERSATIONS_CACHE[conv.id] = conv
        if db is not None:
            try:
                await db["chat_conversations"].update_one(
                    {"id": conv.id},
                    {"$set": {"title": conv.title, "updated_at": conv.updated_at}},
                )
            except Exception as e:
                logger.warning(f"Error renaming conversation: {e}")
        return conv

    @classmethod
    async def delete_conversation(
        cls, project_id: str, repo_id: str, conversation_id: str, db: Any = None
    ) -> bool:
        _CONVERSATIONS_CACHE.pop(conversation_id, None)
        if db is not None:
            try:
                res = await db["chat_conversations"].delete_one(
                    {"id": conversation_id, "project_id": project_id, "repository_id": repo_id}
                )
                return res.deleted_count > 0
            except Exception:
                pass
        return True

    @classmethod
    async def send_message(
        cls,
        project_id: str,
        repo_id: str,
        req: SendMessageRequest,
        db: Any = None,
    ) -> Tuple[Conversation, ChatMessage]:
        # 1. Fetch or create conversation
        conv: Optional[Conversation] = None
        if req.conversation_id:
            conv = await cls.get_conversation(project_id, repo_id, req.conversation_id, db=db)

        if not conv:
            # Auto title based on first query
            title = req.message[:45].strip() + ("..." if len(req.message) > 45 else "")
            conv = await cls.create_conversation(project_id, repo_id, title=title, db=db)
        elif conv.title in ("New Chat Thread", "New Conversation") or not conv.messages:
            # Auto-update initial generic placeholder title with actual question
            conv.title = req.message[:45].strip() + ("..." if len(req.message) > 45 else "")

        # 2. Add user message
        user_msg = ChatMessage(
            id=str(uuid.uuid4()),
            role="user",
            content=req.message,
            created_at=datetime.utcnow(),
            citations=[],
        )
        conv.messages.append(user_msg)

        # 3. Assemble RAG repository context
        system_prompt, citations = await RAGContextService.assemble_context(
            repo_id=repo_id,
            user_query=req.message,
            explicit_files=req.context_files,
            db=db,
        )

        # 4. Build prompt message array (System Prompt + Recent History + Current Question)
        llm_messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]
        
        # Include up to last 4 messages for conversational context
        for prior_msg in conv.messages[-5:-1]:
            if prior_msg.role in ("user", "assistant"):
                llm_messages.append({"role": prior_msg.role, "content": prior_msg.content})

        llm_messages.append({"role": "user", "content": req.message})

        # 5. Execute with Cascading Fallback Manager (OpenRouter -> Gemini -> OpenAI -> Grok -> Deterministic Mock)
        llm_result: LLMResult = await ai_manager.execute_chat(
            messages=llm_messages,
            preferred_provider=req.preferred_provider,
        )

        # 6. Generate suggested inquiries
        suggested = RAGContextService.generate_suggested_inquiries(
            req.message, llm_result.content
        )

        # 7. Create assistant message
        ai_msg = ChatMessage(
            id=str(uuid.uuid4()),
            role="assistant",
            content=llm_result.content,
            created_at=datetime.utcnow(),
            citations=citations,
            provider_used=llm_result.provider_used,
            model_used=llm_result.model_used,
            latency_ms=llm_result.latency_ms,
            fallback_occurred=llm_result.fallback_occurred,
            attempts=llm_result.attempts,
            suggested_inquiries=suggested,
        )
        conv.messages.append(ai_msg)
        conv.updated_at = datetime.utcnow()
        conv.message_count = len(conv.messages)

        # 8. Persist conversation
        _CONVERSATIONS_CACHE[conv.id] = conv
        if db is not None:
            try:
                await db["chat_conversations"].update_one(
                    {"id": conv.id},
                    {"$set": conv.model_dump()},
                    upsert=True,
                )
            except Exception as e:
                logger.warning(f"Error persisting conversation to db: {e}")

        return conv, ai_msg

    @classmethod
    async def record_feedback(
        cls,
        project_id: str,
        repo_id: str,
        conversation_id: str,
        message_id: str,
        feedback: str,
        db: Any = None,
    ) -> bool:
        conv = await cls.get_conversation(project_id, repo_id, conversation_id, db=db)
        if not conv:
            return False

        for msg in conv.messages:
            if msg.id == message_id:
                msg.feedback = feedback
                break

        _CONVERSATIONS_CACHE[conv.id] = conv
        if db is not None:
            try:
                await db["chat_conversations"].update_one(
                    {"id": conv.id},
                    {"$set": conv.model_dump()},
                )
            except Exception:
                pass
        return True
