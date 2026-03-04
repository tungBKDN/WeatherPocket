from datetime import datetime
from typing import Optional, Callable
from pydantic import BaseModel, Field, EmailStr
from bson import ObjectId


class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError(f"Invalid ObjectId: {v}")
        return ObjectId(v)


class User(BaseModel):
    id: Optional[ObjectId] = Field(default_factory=ObjectId, alias="_id")
    email: EmailStr
    fullname: str
    password_hash: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "_id": "507f1f77bcf86cd799439011",
                "email": "user@example.com",
                "password_hash": "$2b$12$...",
                "is_active": True,
                "created_at": "2026-03-03T10:00:00",
                "updated_at": "2026-03-03T10:00:00"
            }
        }
