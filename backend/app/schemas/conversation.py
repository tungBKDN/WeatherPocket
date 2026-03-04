from pydantic import BaseModel, Field


class ConversationBase(BaseModel):
    user_id: str
    title: str
    created_at: str
    updated_at: str
    deleted_at: str | None = None