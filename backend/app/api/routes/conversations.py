from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.repositories.conversation_repository import ConversationRepository
from app.api.routes.auth import get_current_user

router = APIRouter(prefix="/conversations", tags=["conversations"])

class CreateConversationRequest(BaseModel):
    title: str

def get_conversation_repo() -> ConversationRepository:
    return ConversationRepository()

@router.post("")
async def create_conversation(
    body: CreateConversationRequest,
    current_user=Depends(get_current_user),
    repo: ConversationRepository = Depends(get_conversation_repo)
):
    conv = await repo.create(user_id=str(current_user.id), title=body.title)
    return conv

@router.get("")
async def list_conversations(
    current_user=Depends(get_current_user),
    repo: ConversationRepository = Depends(get_conversation_repo)
):
    convs = await repo.list_by_user(str(current_user.id))
    return {"conversations": convs}

@router.get("/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    current_user=Depends(get_current_user),
    repo: ConversationRepository = Depends(get_conversation_repo)
):
    conv = await repo.get_by_id_and_user(conversation_id, str(current_user.id))
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv

@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user=Depends(get_current_user),
    repo: ConversationRepository = Depends(get_conversation_repo)
):
    # Check for user's ownership before deletion
    conv = await repo.get_by_id_and_user(conversation_id, str(current_user.id))
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await repo.delete(conversation_id)
    return {"message": "Deleted"}