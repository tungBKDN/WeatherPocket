from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings


class MongoClientSingleton:
    _client: Optional[AsyncIOMotorClient] = None
    _database: Optional[AsyncIOMotorDatabase] = None

    @classmethod
    async def connect(cls) -> None:
        if cls._client is not None:
            return

        settings = get_settings()
        # Add serverSelectionTimeoutMS to prevent hanging
        cls._client = AsyncIOMotorClient(
            settings.MONGO_URI,
            serverSelectionTimeoutMS=5000,  # 5 second timeout
        )
        cls._database = cls._client[settings.MONGO_DB]

        # Test connection with ping
        try:
            await cls._database.command("ping")
            print("✓ MongoDB connected successfully")
        except Exception as e:
            print(f"⚠ MongoDB connection failed: {e}")
            print("  Server will run but database operations will fail")

        # Create indexes
        try:
            await cls._database["users"].create_index("email", unique=True)
        except Exception as e:
            print(f"⚠ Failed to create indexes: {e}")

    @classmethod
    def get_database(cls) -> AsyncIOMotorDatabase:
        if cls._database is None:
            raise RuntimeError("MongoDB is not connected. Call connect() first.")
        return cls._database

    @classmethod
    async def disconnect(cls) -> None:
        if cls._client is not None:
            cls._client.close()
            cls._client = None
            cls._database = None
