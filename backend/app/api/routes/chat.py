from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.services.chat_service import ChatService
from app.api.routes.auth import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])

class SendMessageRequest(BaseModel):
    content: str

def get_chat_service() -> ChatService:
    """Dependency that returns singleton instance"""
    return ChatService.get_instance()

@router.post("/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    body: SendMessageRequest,
    current_user=Depends(get_current_user),
    service: ChatService = Depends(get_chat_service)
):
    try:
        reply = await service.send_message(conversation_id, str(current_user["_id"]), body.content)
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
        conversation_id = await service.create_conversation(str(current_user["_id"]), body.content)
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
        messages = await service.get_messages(conversation_id, str(current_user["_id"]))
        return {"messages": messages}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))