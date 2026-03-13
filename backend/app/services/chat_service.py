from typing import List, Optional
from langchain_core.messages import HumanMessage, AIMessage
from app.core.langchain_config import base_chain
from app.core.langchain_history import get_session_history
from app.repositories.conversation_repository import ConversationRepository
from app.services.rag_service import RagService


def _build_rag_context(contexts: List[str]) -> str:
    """Format retrieved context snippets for ephemeral injection (not saved to DB)."""
    joined = "\n\n---\n\n".join(contexts)
    return (
        f"Use the following document excerpts to help answer the question.\n\n"
        f"{joined}"
    )


class ChatService:
    _instance: Optional['ChatService'] = None

    def __init__(self):
        self.conversation_repo = ConversationRepository()
        self.rag = RagService.get_instance()

    @classmethod
    def get_instance(cls) -> 'ChatService':
        """Lazy singleton: only create when first called (after MongoDB connects)"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _retrieve_context(self, content: str, file_ids: Optional[List[str]]) -> str:
        """If file_ids provided, retrieve and format RAG context (ephemeral - not saved)."""
        if not file_ids:
            return ""
        contexts = self.rag.retrieving(query=content, file_ids=file_ids)
        return _build_rag_context(contexts) if contexts else ""

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

        # Retrieve RAG context (ephemeral - not saved)
        rag_context = self._retrieve_context(content, file_ids)
        history = get_session_history(conversation_id)

        # Build LLM input: RAG context + original question
        llm_input = f"{rag_context}\n\n---\n\nQuestion: {content}" if rag_context else content

        # Call LLM with enriched input + chat history
        result = await base_chain.ainvoke({
            "input": llm_input,
            "chat_history": history.messages,
        })

        # Save ONLY the original user question and AI response (no RAG context)
        history.add_message(HumanMessage(content=content))
        history.add_message(AIMessage(content=result if isinstance(result, str) else str(result)))

        await self.conversation_repo.touch(conversation_id)
        return result if isinstance(result, str) else str(result)

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

        # Retrieve RAG context (ephemeral - not saved)
        rag_context = self._retrieve_context(content, file_ids)
        history = get_session_history(conversation_id)

        # Build LLM input: RAG context + original question
        llm_input = f"{rag_context}\n\n---\n\nQuestion: {content}" if rag_context else content

        # Stream response and collect for saving
        full_response = []
        async for chunk in base_chain.astream({
            "input": llm_input,
            "chat_history": history.messages,
        }):
            full_response.append(chunk if isinstance(chunk, str) else str(chunk))
            yield chunk

        # Save ONLY the original user question and AI response (no RAG context)
        history.add_message(HumanMessage(content=content))
        history.add_message(AIMessage(content="".join(full_response)))

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