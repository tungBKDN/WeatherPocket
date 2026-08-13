"""Round-robin multi-key manager for Gemini.

Loads all Gemini API keys from settings and builds a fresh LangChain
chain per call, using the currently-active key. When a key hits a quota
error (429 / ResourceExhausted) or is invalid/expired, it is marked dead
for the rest of the process lifetime and the next key is rolled in.
Only when *all* keys are dead do we let the original error propagate
(so the caller sees a real 429).
"""
from typing import AsyncIterator, List, Optional

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import settings
from app.core.langchain_config import prompt


def _is_dead_key_error(e: BaseException) -> bool:
    """True if the error means the current key should be retired (quota or
    invalid/expired), False for transient/generic errors we should NOT
    blame on the key."""
    s = str(e)
    name = type(e).__name__
    # Quota exhausted.
    if "429" in s or name == "ResourceExhausted":
        return True
    # Invalid / expired / revoked key.
    if name in ("PermissionDenied", "Unauthenticated") or "API_KEY_INVALID" in s \
            or "API key not valid" in s or "PERMISSION_DENIED" in s:
        return True
    return False


class GeminiKeyManager:
    """Holds the key pool and rotates on dead-key errors (in-memory state)."""

    def __init__(self, keys: List[str]):
        # de-duplicate while preserving order
        seen: set[str] = set()
        uniq: List[str] = []
        for k in keys:
            if k and k not in seen:
                seen.add(k)
                uniq.append(k)
        self._keys = uniq
        self._dead: set[str] = set()
        self._idx = 0  # pointer into self._keys (next key to try)
        self._prompt = prompt

    # -- key bookkeeping -------------------------------------------------

    @property
    def total(self) -> int:
        return len(self._keys)

    @property
    def alive_count(self) -> int:
        return len([k for k in self._keys if k not in self._dead])

    def _next_active_key(self) -> Optional[str]:
        """Return an alive key (and advance the pointer onto it), or None if
        every key is dead."""
        n = len(self._keys)
        for offset in range(n):
            i = (self._idx + offset) % n
            if self._keys[i] not in self._dead:
                self._idx = i
                return self._keys[i]
        return None

    def mark_dead(self, key: str) -> None:
        if key in self._keys:
            self._dead.add(key)

    # -- chain building --------------------------------------------------

    def _build_chain(self, key: str):
        # max_retries=1 => don't let the SDK retry on 429 against the SAME key;
        # we handle rotation ourselves.
        model = ChatGoogleGenerativeAI(
            model="gemini-flash-latest",
            google_api_key=key,
            streaming=True,
            max_retries=1,
        )
        return self._prompt | model | StrOutputParser()

    # -- public call surface --------------------------------------------

    async def ainvoke(self, input: str, chat_history) -> str:
        """Non-streaming call with key rotation on dead-key errors."""
        last_err: Optional[BaseException] = None
        while True:
            key = self._next_active_key()
            if key is None:
                raise RuntimeError(
                    "All Gemini API keys are exhausted (429)."
                ) from last_err
            chain = self._build_chain(key)
            try:
                return await chain.ainvoke({"input": input, "chat_history": chat_history})
            except Exception as e:
                if _is_dead_key_error(e):
                    self.mark_dead(key)
                    last_err = e
                    continue
                raise

    async def astream(self, input: str, chat_history) -> AsyncIterator[str]:
        """Streaming call with key rotation. A 429 that occurs *before* the
        first chunk is produced rolls to the next key. A 429 that occurs
        mid-stream (after partial output) cannot be cleanly retried and is
        re-raised."""
        last_err: Optional[BaseException] = None
        while True:
            key = self._next_active_key()
            if key is None:
                raise RuntimeError(
                    "All Gemini API keys are exhausted (429)."
                ) from last_err
            chain = self._build_chain(key)
            produced = False
            try:
                async for chunk in chain.astream({"input": input, "chat_history": chat_history}):
                    produced = True
                    yield chunk
                return  # stream completed cleanly
            except Exception as e:
                if _is_dead_key_error(e) and not produced:
                    self.mark_dead(key)
                    last_err = e
                    continue
                raise


_manager: Optional[GeminiKeyManager] = None


def get_gemini_key_manager() -> GeminiKeyManager:
    """Lazy singleton so it is built after settings/env are ready."""
    global _manager
    if _manager is None:
        _manager = GeminiKeyManager(settings.GEMINI_API_KEYS)
    return _manager