from typing import List, Optional
from langchain_core.runnables.history import RunnableWithMessageHistory
from app.core.langchain_config import base_chain
from app.core.langchain_history import get_session_history
from app.repositories.conversation_repository import ConversationRepository
from app.services.rag_service import RagService


def _build_rag_input(content: str, contexts: List[str]) -> str:
    """Prepend retrieved context snippets to the user message."""
    joined = "\n\n---\n\n".join(contexts)
    return (
        f"Use the following document excerpts to help answer the question.\n\n"
        f"{joined}\n\n"
        f"---\n\nQuestion: {content}"
    )


class ChatService:
    _instance: Optional['ChatService'] = None

    def __init__(self):
        self.conversation_repo = ConversationRepository()
        self.rag = RagService.get_instance()
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

    def _resolve_input(self, content: str, file_ids: Optional[List[str]]) -> str:
        """If file_ids provided, enrich the user message with retrieved context."""
        if not file_ids:
            return content
        contexts = self.rag.retrieving(query=content, file_ids=file_ids)
        return _build_rag_input(content, contexts) if contexts else content

    async def send_message(
        self,
        conversation_id: str,
        user_id: str,
        content: str,
        file_ids: Optional[List[str]] = None,
    ) -> str:
        conv = await self.conversation_repo.get_by_id_and_user(conversation_id, user_id)
        if not conv:
            exists = await self.conversation_repo.get_by_id(conversation_id)
            if exists:
                raise ValueError("Access denied")
            raise ValueError("Conversation not found")

        enriched = self._resolve_input(content, file_ids)

        result = await self.chain.ainvoke(
            {"input": enriched},
            config={"configurable": {"session_id": conversation_id}},
        )

        await self.conversation_repo.touch(conversation_id)
        return result.content if hasattr(result, "content") else str(result)

    async def stream_message(
        self,
        conversation_id: str,
        user_id: str,
        content: str,
        file_ids: Optional[List[str]] = None,
    ):
        """Async generator that yields string chunks as the model streams its response."""
        conv = await self.conversation_repo.get_by_id_and_user(conversation_id, user_id)
        if not conv:
            exists = await self.conversation_repo.get_by_id(conversation_id)
            if exists:
                raise ValueError("Access denied")
            raise ValueError("Conversation not found")

        enriched = self._resolve_input(content, file_ids)

        async for chunk in self.chain.astream(
            {"input": enriched},
            config={"configurable": {"session_id": conversation_id}},
        ):
            yield chunk

        await self.conversation_repo.touch(conversation_id)

    async def create_conversation(self, user_id: str, content: Optional[str] = None) -> str:
        name = content[:30] if content else "New Conversation"
        conv = await self.conversation_repo.create(user_id, name)
        if content:
            await self.send_message(str(conv.id), user_id, content)
        return str(conv.id)

    async def get_messages(self, conversation_id: str, user_id: str):
        conv = await self.conversation_repo.get_by_id_and_user(conversation_id, user_id)
        if not conv:
            raise ValueError("Conversation not found")
        history = get_session_history(conversation_id)
        return history.messages