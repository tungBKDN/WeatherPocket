from langchain_mongodb import MongoDBChatMessageHistory
from app.core.config import settings

def get_session_history(session_id: str) -> MongoDBChatMessageHistory:
    """
    Factory function to get MongoDB chat message history for a conversation.

    Args:
        session_id: The conversation ID (str(conversation._id))

    Returns:
        MongoDBChatMessageHistory instance linked to the session
    """
    return MongoDBChatMessageHistory(
        connection_string=settings.MONGODB_URI,
        database_name=settings.MONGO_DB_NAME,
        collection_name="chat_message_history",
        session_id=session_id,
    )