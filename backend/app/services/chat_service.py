from typing import Optional
from langchain_core.runnables.history import RunnableWithMessageHistory
from app.core.langchain_config import base_chain
from app.core.langchain_history import get_session_history
from app.repositories.conversation_repository import ConversationRepository

class ChatService:
    _instance: Optional['ChatService'] = None

    def __init__(self):
        self.conversation_repo = ConversationRepository()
        self.chain = RunnableWithMessageHistory(
            base_chain,
            get_session_history,
            input_messages_key="input",
            history_messages_key="chat_history",
        )

    @classmethod
    def get_instance(cls) -> 'ChatService':
        """Lazy singleton: only create when first called (after MongoDB connects)"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def send_message(self, conversation_id: str, user_id: str, content: str) -> str:
        conv = await self.conversation_repo.get_by_id_and_user(conversation_id, user_id)
        if not conv:
            exists = await self.conversation_repo.get_by_id(conversation_id)
            if exists:
                raise ValueError("Access denied")
            raise ValueError("Conversation not found")

        result = await self.chain.ainvoke(
            {"input": content},
            config={"configurable": {"session_id": conversation_id}},
        )

        await self.conversation_repo.touch(conversation_id)
        return result.content if hasattr(result, "content") else str(result)

    async def create_conversation(self, user_id: str, content: Optional[str] = None) -> str:
        # Automatically naming conversations based on first message or default to "New Conversation"
        name = content[:30] if content else "New Conversation"
        conv = await self.conversation_repo.create(name, user_id)
        if content:
            await self.send_message(str(conv.id), user_id, content)
        return str(conv.id)

    async def get_messages(self, conversation_id: str, user_id: str):
        conv = await self.conversation_repo.get_by_id_and_user(conversation_id, user_id)
        if not conv:
            raise ValueError("Conversation not found")

        history = get_session_history(conversation_id)
        return history.messages