import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.api.routes.auth import get_current_user
from app.services.chat_service import ChatService

router = APIRouter(prefix="/chat", tags=["chat"])


class SendMessageRequest(BaseModel):
    content: str
    file_ids: Optional[List[str]] = None  # documents to use for RAG


def get_chat_service() -> ChatService:
    return ChatService.get_instance()

@router.post("/{conversation_id}/messages/stream")
async def stream_message(
    conversation_id: str,
    body: SendMessageRequest,
    current_user=Depends(get_current_user),
    service: ChatService = Depends(get_chat_service),
):
    """SSE endpoint — streams tokens as `data: <json-chunk>\n\n`, ends with `data: [DONE]\n\n`."""
    user_id = str(current_user.id)

    # Validate access before opening the stream so we can return a proper HTTP error
    from app.repositories.conversation_repository import ConversationRepository
    repo = ConversationRepository()
    conv = await repo.get_by_id_and_user(conversation_id, user_id)
    if not conv:
        exists = await repo.get_by_id(conversation_id)
        raise HTTPException(status_code=403 if exists else 404,
                            detail="Access denied" if exists else "Conversation not found")

    async def event_generator():
        try:
            async for chunk in service.stream_message(
                conversation_id, user_id, body.content, file_ids=body.file_ids
            ):
                yield f"data: {json.dumps(chunk)}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps(str(e))}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # tells nginx not to buffer SSE
        },
    )


@router.post("/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    body: SendMessageRequest,
    current_user=Depends(get_current_user),
    service: ChatService = Depends(get_chat_service)
):
    try:
        reply = await service.send_message(
            conversation_id, str(current_user.id), body.content, file_ids=body.file_ids
        )
        return {"reply": reply}
    except ValueError as e:
        if "Access denied" in str(e):
            raise HTTPException(status_code=403, detail=str(e))
        elif "not found" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/")
async def create_conversation(
    body: SendMessageRequest,
    current_user=Depends(get_current_user),
    service: ChatService = Depends(get_chat_service)
):
    try:
        conversation_id = await service.create_conversation(str(current_user.id), body.content)
        return {"conversation_id": conversation_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    current_user=Depends(get_current_user),
    service: ChatService = Depends(get_chat_service)
):
    try:
        messages = await service.get_messages(conversation_id, str(current_user.id))
        # Serialize to a flat format the frontend understands
        serialized = [{"type": m.type, "content": m.content} for m in messages]
        return {"messages": serialized}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

