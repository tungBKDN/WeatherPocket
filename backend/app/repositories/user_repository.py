from datetime import datetime
from typing import Optional

from bson import ObjectId

from app.db.mongo import MongoClientSingleton
from app.models.user import User


class UserRepository:
    def __init__(self) -> None:
        self.col = MongoClientSingleton.get_database()["users"]

    async def get_by_email(self, email: str) -> Optional[User]:
        doc = await self.col.find_one({"email": email})
        return User(**doc) if doc else None

    async def get_by_id(self, user_id: str) -> Optional[User]:
        try:
            doc = await self.col.find_one({"_id": ObjectId(user_id)})
            return User(**doc) if doc else None
        except Exception:
            return None

    async def create(self, email: str, password_hash: str) -> User:
        user_data = {
            "email": email,
            "password_hash": password_hash,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = await self.col.insert_one(user_data)
        user_data["_id"] = result.inserted_id
        return User(**user_data)

    async def update(self, user_id: str, **kwargs) -> Optional[User]:
        kwargs["updated_at"] = datetime.utcnow()
        await self.col.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": kwargs}
        )
        return await self.get_by_id(user_id)

    async def delete(self, user_id: str) -> bool:
        result = await self.col.delete_one({"_id": ObjectId(user_id)})
        return result.deleted_count > 0

    async def exists(self, email: str) -> bool:
        return await self.col.find_one({"email": email}) is not None
