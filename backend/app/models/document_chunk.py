from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from bson import ObjectId


class DocumentChunk(BaseModel):
    id: Optional[ObjectId] = Field(default_factory=ObjectId, alias="_id")
    conversation_id: str
    user_id: str
    filename: str
    chunk_index: int
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
