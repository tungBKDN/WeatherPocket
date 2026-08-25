"""Round-robin multi-key manager for Gemini.

Loads all Gemini API keys from settings and builds a fresh LangChain
chain per call, using the currently-active key. When a key hits a quota / error
(429, 403, 443 connection error, 500/503 server error, or invalid/expired), it is
marked dead for the rest of the process lifetime and the next key is rolled in.
Only when *all* keys are dead do we throw a clear error to the user.
"""
import logging
from typing import AsyncIterator, List, Optional

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import settings
from app.core.langchain_config import prompt

logger = logging.getLogger(__name__)


def _is_dead_key_error(e: BaseException) -> bool:
    """True if the error means the current key should be retired/rotated:
    - 429 (Too Many Requests / Quota exhausted / Rate limit)
    - 403 (Forbidden / Permission Denied / API key invalid)
    - 401 (Unauthenticated)
    - 443 / SSL / Connection / Socket / Timeout errors
    - 500 / 502 / 503 / 504 (Server error / Service unavailable)
    """
    s = str(e).lower()
    name = type(e).__name__

    # Specific status code / error string patterns
    status_keywords = (
        "429", "403", "401", "443", "500", "502", "503", "504", "400",
        "resourceexhausted", "permissiondenied", "unauthenticated",
        "serviceunavailable", "servererror", "internal-error", "invalidargument",
        "connectionerror", "timeout", "sslerror", "connecttimeout", "readtimeout",
        "socket", "connection refused", "reset by peer", "api_key_invalid",
        "api key not valid", "quota", "rate limit"
    )

    if any(k in s for k in status_keywords):
        return True

    if name in (
        "ResourceExhausted", "PermissionDenied", "Unauthenticated", "ServiceUnavailable",
        "ServerError", "InternalServerError", "InvalidArgument", "ConnectError",
        "ConnectTimeout", "ReadTimeout", "SSLError", "HTTPStatusError"
    ):
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
        if n == 0:
            return None
        for offset in range(n):
            i = (self._idx + offset) % n
            if self._keys[i] not in self._dead:
                self._idx = i
                return self._keys[i]
        return None

    def mark_dead(self, key: str) -> None:
        if key in self._keys:
            self._dead.add(key)
            logger.warning(
                "Gemini key ending in '...%s' marked DEAD (%d/%d alive left)",
                key[-6:],
                self.alive_count,
                self.total,
            )

    # -- chain building --------------------------------------------------

    def _build_chain(self, key: str):
        # max_retries=1 => don't let the SDK retry on 429 against the SAME key;
        # we handle rotation ourselves.
        model = ChatGoogleGenerativeAI(
            model="gemini-3.6-flash",
            google_api_key=key,
            streaming=True,
            max_retries=1,
        )
        return self._prompt | model | StrOutputParser()

    # -- public call surface --------------------------------------------

    async def ainvoke(self, input: str, chat_history) -> str:
        """Non-streaming call with key rotation on dead-key errors."""
        last_err: Optional[BaseException] = None
        attempted_keys = set()

        while True:
            key = self._next_active_key()
            if key is None or len(attempted_keys) >= len(self._keys):
                logger.error("All Gemini API keys in the pool are dead. Last error: %s", last_err)
                raise RuntimeError(
                    "All Gemini API keys are exhausted, rate-limited, or invalid (429/403/443). Please check your API keys."
                ) from last_err

            attempted_keys.add(key)
            chain = self._build_chain(key)
            try:
                return await chain.ainvoke({"input": input, "chat_history": chat_history})
            except Exception as e:
                logger.warning("Gemini key '...%s' failed with error: %s. Rolling to next key.", key[-6:], e)
                self.mark_dead(key)
                last_err = e

    async def astream(self, input: str, chat_history) -> AsyncIterator[str]:
        """Streaming call with key rotation on dead-key errors."""
        last_err: Optional[BaseException] = None
        attempted_keys = set()

        while True:
            key = self._next_active_key()
            if key is None or len(attempted_keys) >= len(self._keys):
                logger.error("All Gemini API keys in the pool are dead. Last error: %s", last_err)
                raise RuntimeError(
                    "All Gemini API keys are exhausted, rate-limited, or invalid (429/403/443). Please check your API keys."
                ) from last_err

            attempted_keys.add(key)
            chain = self._build_chain(key)
            produced = False
            try:
                async for chunk in chain.astream({"input": input, "chat_history": chat_history}):
                    produced = True
                    yield chunk
                return  # stream completed cleanly
            except Exception as e:
                logger.warning("Gemini streaming with key '...%s' failed with error: %s.", key[-6:], e)
                if not produced:
                    self.mark_dead(key)
                    last_err = e
                    continue
                # If chunks were already produced mid-stream, re-raise as we cannot cleanly restart mid-sentence
                raise


_manager: Optional[GeminiKeyManager] = None


def get_gemini_key_manager() -> GeminiKeyManager:
    """Lazy singleton so it is built after settings/env are ready."""
    global _manager
    if _manager is None:
        _manager = GeminiKeyManager(settings.GEMINI_API_KEYS)
    return _manager