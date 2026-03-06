from datetime import datetime
from typing import Annotated, Optional
from pydantic import BaseModel, Field, PlainSerializer, field_validator
from bson import ObjectId


def serialize_objectid(v: ObjectId) -> str:
    """Serialize ObjectId to string."""
    return str(v)


PyObjectIdType = Annotated[ObjectId, PlainSerializer(serialize_objectid)]


class ChunkContent(BaseModel):
    """A single text chunk embedded inside a FileContent document."""
    id: Optional[PyObjectIdType] = Field(default_factory=ObjectId, alias="_id")
    vector_id: str = ""          # Qdrant point UUID — filled after indexing
    chunk_index: int = 0
    content: str

    @field_validator("id", mode="before")
    @classmethod
    def validate_id(cls, v):
        if v is None:
            return ObjectId()
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str):
            if not ObjectId.is_valid(v):
                raise ValueError(f"Invalid ObjectId: {v}")
            return ObjectId(v)
        raise ValueError(f"Invalid ObjectId: {v}")

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
    }


class FileContent(BaseModel):
    """One uploaded file per conversation, containing all its chunks."""
    id: Optional[PyObjectIdType] = Field(default=None, alias="_id")
    conversation_id: str
    file_name: str
    user_id: str
    chunks: list[ChunkContent] = []
    upload_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("id", mode="before")
    @classmethod
    def validate_id(cls, v):
        if v is None:
            return None
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str):
            if not ObjectId.is_valid(v):
                raise ValueError(f"Invalid ObjectId: {v}")
            return ObjectId(v)
        raise ValueError(f"Invalid ObjectId: {v}")

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
    }
