from typing import List, Optional

from bson import ObjectId

from app.db.mongo import MongoClientSingleton
from app.models.file_content import ChunkContent, FileContent


class FileContentRepository:
    def __init__(self) -> None:
        self.col = MongoClientSingleton.get_database()["file_contents"]

    # ─── Create ────────────────────────────────────────────────────────────────

    async def create(self, file_content: FileContent) -> FileContent:
        """Insert a new FileContent document (with all its chunks embedded)."""
        doc = file_content.model_dump(by_alias=True, exclude={"id"})
        result = await self.col.insert_one(doc)
        file_content.id = result.inserted_id
        return file_content

    # ─── Read ──────────────────────────────────────────────────────────────────

    async def get_by_id(self, file_id: str) -> Optional[FileContent]:
        try:
            doc = await self.col.find_one({"_id": ObjectId(file_id)})
            return FileContent(**doc) if doc else None
        except Exception:
            return None

    async def get_by_id_and_user(self, file_id: str, user_id: str) -> Optional[FileContent]:
        try:
            doc = await self.col.find_one({
                "_id": ObjectId(file_id),
                "user_id": user_id,
            })
            return FileContent(**doc) if doc else None
        except Exception:
            return None

    async def list_by_conversation(self, conversation_id: str) -> List[FileContent]:
        """All files uploaded to a given conversation, newest first."""
        cursor = self.col.find({"conversation_id": conversation_id}).sort("upload_at", -1)
        results = []
        async for doc in cursor:
            results.append(FileContent(**doc))
        return results

    # ─── Update ────────────────────────────────────────────────────────────────

    async def update_chunk_vector_ids(
        self,
        file_id: str,
        chunks: List[ChunkContent],
    ) -> None:
        """
        After Qdrant indexing, persist the vector_id back into each embedded chunk.
        Replaces the entire chunks array atomically.
        """
        serialized = [c.model_dump(by_alias=True) for c in chunks]
        await self.col.update_one(
            {"_id": ObjectId(file_id)},
            {"$set": {"chunks": serialized}},
        )

    # ─── Delete ────────────────────────────────────────────────────────────────

    async def delete(self, file_id: str, user_id: str) -> bool:
        """Delete a file record. Returns True if a document was deleted."""
        result = await self.col.delete_one({
            "_id": ObjectId(file_id),
            "user_id": user_id,
        })
        return result.deleted_count > 0

    async def delete_by_conversation(self, conversation_id: str) -> int:
        """Delete all file records for a conversation (cleanup)."""
        result = await self.col.delete_many({"conversation_id": conversation_id})
        return result.deleted_count
