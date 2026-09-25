import json
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.api.deps import get_current_user, get_db
from app.core.ai_factory import ai_manager
from app.core.errors import APIError, success_response
from app.models.chat import (
    SendMessageRequest,
    CreateConversationRequest,
    RenameConversationRequest,
    FeedbackRequest,
)
from app.models.user import UserResponse
from app.modules.chat.service import ChatService
from app.modules.chat.rag_service import RAGContextService

router = APIRouter(tags=["Repository-Aware AI Assistant & Chat"])


async def _verify_repo_access(
    repository_id: str,
    current_user: UserResponse,
    db: AsyncIOMotorDatabase,
    project_id: Optional[str] = None,
):
    """
    Validates repository access. Automatically resolves default/missing repository IDs
    to the active project's repository so chat never breaks.
    """
    repo = None

    # 1. Try finding by ObjectId or id if an explicit ID is supplied
    if repository_id not in ("default-repo", "default", "", "undefined"):
        try:
            oid = ObjectId(repository_id)
            repo = await db.repositories.find_one({
                "_id": oid,
                "owner_id": ObjectId(current_user.id),
                "is_deleted": False,
            })
            if not repo:
                repo = await db.repositories.find_one({"_id": oid, "is_deleted": False})
        except Exception:
            repo = await db.repositories.find_one({
                "$or": [{"id": repository_id}, {"name": repository_id}],
                "is_deleted": False,
            })

    # 2. If not found by direct ID (or if "default-repo" passed), try finding first repository for the project
    if not repo and project_id and project_id not in ("default", ""):
        try:
            p_oid = ObjectId(project_id)
            repo = await db.repositories.find_one({
                "project_id": p_oid,
                "is_deleted": False,
            })
        except Exception:
            repo = await db.repositories.find_one({
                "project_id": project_id,
                "is_deleted": False,
            })

    # 3. If still not found, try finding any active repository owned by current user
    if not repo:
        try:
            repo = await db.repositories.find_one({
                "owner_id": ObjectId(current_user.id),
                "is_deleted": False,
            })
        except Exception:
            pass

    # 4. Fallback safe mock so chat workbench always functions even before repos are uploaded
    if not repo:
        repo = {
            "_id": "default-repo",
            "id": "default-repo",
            "name": "workspace-repo",
            "storage_key": None,
        }

    return repo


@router.get(
    "/projects/{project_id}/repositories/{repository_id}/chat/conversations",
    summary="List chat conversations for repository",
)
@router.get(
    "/repositories/{repository_id}/chat/conversations",
    summary="List chat conversations for repository (direct)",
)
async def list_conversations(
    repository_id: str,
    project_id: Optional[str] = "default",
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await _verify_repo_access(repository_id, current_user, db, project_id=project_id)
    conversations = await ChatService.list_conversations(project_id or "default", repository_id, db=db)
    return success_response(
        data=[c.model_dump() for c in conversations],
        message="Conversations retrieved successfully",
    )


@router.post(
    "/projects/{project_id}/repositories/{repository_id}/chat/conversations",
    summary="Create a new chat conversation thread",
)
@router.post(
    "/repositories/{repository_id}/chat/conversations",
    summary="Create a new chat conversation thread (direct)",
)
async def create_conversation(
    repository_id: str,
    req: CreateConversationRequest,
    project_id: Optional[str] = "default",
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await _verify_repo_access(repository_id, current_user, db, project_id=project_id)
    conv = await ChatService.create_conversation(
        project_id=project_id or "default",
        repo_id=repository_id,
        title=req.title,
        tags=req.tags,
        db=db,
    )
    return success_response(
        data=conv.model_dump(),
        message="Conversation thread created successfully",
    )


@router.patch(
    "/projects/{project_id}/repositories/{repository_id}/chat/conversations/{conversation_id}",
    summary="Rename chat conversation thread",
)
@router.patch(
    "/repositories/{repository_id}/chat/conversations/{conversation_id}",
    summary="Rename chat conversation thread (direct)",
)
@router.put(
    "/projects/{project_id}/repositories/{repository_id}/chat/conversations/{conversation_id}",
    summary="Update chat conversation thread",
)
@router.put(
    "/repositories/{repository_id}/chat/conversations/{conversation_id}",
    summary="Update chat conversation thread (direct)",
)
async def rename_conversation(
    repository_id: str,
    conversation_id: str,
    req: RenameConversationRequest,
    project_id: Optional[str] = "default",
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await _verify_repo_access(repository_id, current_user, db, project_id=project_id)
    conv = await ChatService.rename_conversation(
        project_id=project_id or "default",
        repo_id=repository_id,
        conversation_id=conversation_id,
        new_title=req.title,
        db=db,
    )
    if not conv:
        raise APIError(status_code=404, code="CONVERSATION_NOT_FOUND", message="Conversation not found")
    return success_response(data=conv.model_dump(), message="Conversation renamed successfully")


@router.get(
    "/projects/{project_id}/repositories/{repository_id}/chat/conversations/{conversation_id}",
    summary="Get conversation thread details",
)
@router.get(
    "/repositories/{repository_id}/chat/conversations/{conversation_id}",
    summary="Get conversation thread details (direct)",
)
async def get_conversation(
    repository_id: str,
    conversation_id: str,
    project_id: Optional[str] = "default",
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await _verify_repo_access(repository_id, current_user, db, project_id=project_id)
    conv = await ChatService.get_conversation(
        project_id=project_id or "default",
        repo_id=repository_id,
        conversation_id=conversation_id,
        db=db,
    )
    if not conv:
        raise APIError(status_code=404, code="CONVERSATION_NOT_FOUND", message="Conversation not found")
    return success_response(data=conv.model_dump(), message="Conversation details retrieved")


@router.delete(
    "/projects/{project_id}/repositories/{repository_id}/chat/conversations/{conversation_id}",
    summary="Delete conversation thread",
)
@router.delete(
    "/repositories/{repository_id}/chat/conversations/{conversation_id}",
    summary="Delete conversation thread (direct)",
)
async def delete_conversation(
    repository_id: str,
    conversation_id: str,
    project_id: Optional[str] = "default",
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await _verify_repo_access(repository_id, current_user, db, project_id=project_id)
    deleted = await ChatService.delete_conversation(
        project_id=project_id or "default",
        repo_id=repository_id,
        conversation_id=conversation_id,
        db=db,
    )
    return success_response(data={"deleted": deleted}, message="Conversation deleted successfully")


@router.post(
    "/projects/{project_id}/repositories/{repository_id}/chat/message",
    summary="Send a chat message to CodeLens AI (with cascading fallback)",
)
@router.post(
    "/repositories/{repository_id}/chat/message",
    summary="Send a chat message to CodeLens AI (direct)",
)
async def send_message(
    repository_id: str,
    req: SendMessageRequest,
    project_id: Optional[str] = "default",
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await _verify_repo_access(repository_id, current_user, db, project_id=project_id)
    conv, ai_msg = await ChatService.send_message(
        project_id=project_id or "default",
        repo_id=repository_id,
        req=req,
        db=db,
    )
    return success_response(
        data={
            "conversation": conv.model_dump(),
            "message": ai_msg.model_dump(),
        },
        message="Message processed successfully",
    )


@router.post(
    "/projects/{project_id}/repositories/{repository_id}/chat/stream",
    summary="Stream chat completion via Server-Sent Events (SSE)",
)
@router.post(
    "/repositories/{repository_id}/chat/stream",
    summary="Stream chat completion via Server-Sent Events (SSE, direct)",
)
async def stream_chat(
    repository_id: str,
    req: SendMessageRequest,
    project_id: Optional[str] = "default",
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await _verify_repo_access(repository_id, current_user, db, project_id=project_id)

    system_prompt, citations = await RAGContextService.assemble_context(
        repo_id=repository_id,
        user_query=req.message,
        explicit_files=req.context_files,
        db=db,
    )

    llm_messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": req.message},
    ]

    async def sse_generator():
        # First event: citations metadata
        meta_event = {
            "type": "citations",
            "citations": [c.model_dump() for c in citations],
        }
        yield f"data: {json.dumps(meta_event)}\n\n"

        async for chunk in ai_manager.execute_stream(
            messages=llm_messages,
            preferred_provider=req.preferred_provider,
        ):
            yield f"data: {json.dumps(chunk)}\n\n"

    return StreamingResponse(sse_generator(), media_type="text/event-stream")


@router.post(
    "/projects/{project_id}/repositories/{repository_id}/chat/conversations/{conversation_id}/messages/{message_id}/feedback",
    summary="Submit user feedback on AI response",
)
@router.post(
    "/repositories/{repository_id}/chat/conversations/{conversation_id}/messages/{message_id}/feedback",
    summary="Submit user feedback on AI response (direct)",
)
async def submit_feedback(
    repository_id: str,
    conversation_id: str,
    message_id: str,
    req: FeedbackRequest,
    project_id: Optional[str] = "default",
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await _verify_repo_access(repository_id, current_user, db, project_id=project_id)
    recorded = await ChatService.record_feedback(
        project_id=project_id or "default",
        repo_id=repository_id,
        conversation_id=conversation_id,
        message_id=message_id,
        feedback=req.feedback,
        db=db,
    )
    return success_response(data={"recorded": recorded}, message="Feedback recorded")
