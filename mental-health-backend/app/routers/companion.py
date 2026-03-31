"""Companion router — POST /api/companion/chat"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List

from app.core.security import get_current_user
from app.services.companion_service import companion_service

router = APIRouter(prefix="/api/companion", tags=["companion"])


class ConversationTurn(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_history: List[ConversationTurn] = []


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    user_id = str(current_user.get("user_id") or current_user.get("_id"))
    history = [{"role": t.role, "content": t.content} for t in request.conversation_history]

    reply = await companion_service.chat(
        user_id=user_id,
        message=request.message.strip(),
        conversation_history=history,
    )
    return ChatResponse(reply=reply)
