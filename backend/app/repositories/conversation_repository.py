from datetime import datetime
from typing import Optional

from bson import ObjectId

from app.db.mongo import MongoClientSingleton
from app.models.conversation import Conversation


class ConversationRepository:
    def __init__(self) -> None:
        self.col = MongoClientSingleton.get_database()["conversations"]

    async def get_by_id(self, conversation_id: str) -> Optional[Conversation]:
        try:
            doc = await self.col.find_one({"_id": ObjectId(conversation_id)})
            return Conversation(**doc) if doc else None
        except Exception:
            return None

    async def create(self, user_id: str, title: str) -> Conversation:
        conversation_data = {
            "user_id": user_id,
            "title": title,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = await self.col.insert_one(conversation_data)
        conversation_data["_id"] = result.inserted_id
        return Conversation(**conversation_data)

    async def update(self, conversation_id: str, **kwargs) -> Optional[Conversation]:
        kwargs["updated_at"] = datetime.utcnow()
        await self.col.update_one(
            {"_id": ObjectId(conversation_id)},
            {"$set": kwargs}
        )
        return await self.get_by_id(conversation_id)

    async def delete(self, conversation_id: str) -> bool:
        result = await self.col.delete_one({"_id": ObjectId(conversation_id)})
        return result.deleted_count > 0

    async def list_by_user(self, user_id: str) -> list[Conversation]:
        cursor = self.col.find({"user_id": user_id}).sort("created_at", -1)
        conversations = []
        async for doc in cursor:
            conversations.append(Conversation(**doc))
        return conversations

    async def touch(self, conversation_id: str) -> None:
        """Update the updated_at timestamp to mark conversation as recently active"""
        await self.col.update_one(
            {"_id": ObjectId(conversation_id)},
            {"$set": {"updated_at": datetime.utcnow()}}
        )

    async def get_by_id_and_user(self, conversation_id: str, user_id: str) -> Optional[Conversation]:
        try:
            doc = await self.col.find_one({
                "_id": ObjectId(conversation_id),
                "user_id": user_id
            })
            return Conversation(**doc) if doc else None
        except Exception:
            return None