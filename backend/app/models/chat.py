from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
import uuid


class Citation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    file_path: str
    symbol_name: Optional[str] = None
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    snippet: Optional[str] = None
    match_percentage: int = 95
    layer: str = "domain"  # routing, domain, persistence, infra


class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str  # "user" | "assistant" | "system"
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    citations: List[Citation] = Field(default_factory=list)
    provider_used: Optional[str] = None
    model_used: Optional[str] = None
    latency_ms: Optional[float] = None
    fallback_occurred: bool = False
    attempts: List[str] = Field(default_factory=list)
    feedback: Optional[str] = None  # "helpful" | "reported"
    suggested_inquiries: List[str] = Field(default_factory=list)


class Conversation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    repository_id: str
    title: str = "New Chat Thread"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    messages: List[ChatMessage] = Field(default_factory=list)
    pinned: bool = False
    tags: List[str] = Field(default_factory=list)
    message_count: int = 0


class SendMessageRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    context_files: Optional[List[str]] = None
    preferred_provider: Optional[str] = None
    deep_rag: bool = True


class CreateConversationRequest(BaseModel):
    title: Optional[str] = "New Conversation"
    tags: Optional[List[str]] = None


class RenameConversationRequest(BaseModel):
    title: str


class FeedbackRequest(BaseModel):
    feedback: str  # "helpful" | "reported"
