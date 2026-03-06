from datetime import datetime
from typing import Annotated, Optional, Callable
from pydantic import BaseModel, Field, EmailStr, PlainSerializer, field_validator
from bson import ObjectId


def serialize_objectid(v: ObjectId) -> str:
    """Serialize ObjectId to string."""
    return str(v)


PyObjectIdType = Annotated[ObjectId, PlainSerializer(serialize_objectid)]


class User(BaseModel):
    id: Optional[PyObjectIdType] = Field(default_factory=ObjectId, alias="_id")
    email: EmailStr
    fullname: str
    password_hash: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

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
        "json_schema_extra": {
            "example": {
                "_id": "507f1f77bcf86cd799439011",
                "email": "user@example.com",
                "password_hash": "$2b$12$...",
                "is_active": True,
                "created_at": "2026-03-03T10:00:00",
                "updated_at": "2026-03-03T10:00:00"
            }
        }
    }
