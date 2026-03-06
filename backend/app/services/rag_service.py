from typing import Callable, List, Optional
import uuid

from langchain_text_splitters import CharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, FieldCondition, Filter, MatchAny, PointStruct, VectorParams

from app.core.config import settings


class RagService:
    _instance = None

    def __init__(self):
        self._embedder = HuggingFaceEmbeddings(
            model_name="BAAI/bge-small-en-v1.5",
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
        self._client = QdrantClient(
            url=settings.QDRANT_ENDPOINT,
            api_key=settings.QDRANT_API_KEY,
        )
        self._ensure_collection()

    def _ensure_collection(self):
        existing = [c.name for c in self._client.get_collections().collections]
        if settings.QDRANT_COLLECTION not in existing:
            self._client.create_collection(
                collection_name=settings.QDRANT_COLLECTION,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE),
            )

    @classmethod
    def get_instance(cls) -> "RagService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance


    def chunking(self, text: str) -> List[str]:
        """Split text into overlapping chunks."""
        splitter = CharacterTextSplitter.from_tiktoken_encoder(
            encoding_name="cl100k_base",
            chunk_size=50,
            chunk_overlap=10,
        )
        return splitter.split_text(text)


    def indexing(
        self,
        chunks: List[str],
        file_id: str,
        user_id: str,
        progress_callback: Optional[Callable[[int, int, int], None]] = None,
    ) -> List[str]:
        """
        Embed *chunks* and upsert them into Qdrant.

        Each Qdrant point carries the payload:
            { file_id, user_id, content, chunk_index }

        Returns the list of Qdrant vector UUIDs in the same order as *chunks*,
        so the caller can store them back into MongoDB (ChunkContent.vector_id).
        """
        total_chunks = len(chunks)
        vectors: List[List[float]] = []

        if total_chunks == 0:
            return []

        batch_size = 16
        for start in range(0, total_chunks, batch_size):
            batch = chunks[start:start + batch_size]
            batch_vectors = self._embedder.embed_documents(batch)
            vectors.extend(batch_vectors)

            if progress_callback:
                completed = min(start + len(batch), total_chunks)
                progress = int((completed / total_chunks) * 100)
                progress_callback(progress, completed, total_chunks)

        vector_ids = [str(uuid.uuid4()) for _ in chunks]

        points = [
            PointStruct(
                id=vector_id,
                vector=vector,
                payload={
                    "file_id": file_id,
                    "user_id": user_id,
                    "content": chunk,
                    "chunk_index": idx,
                },
            )
            for idx, (vector_id, vector, chunk) in enumerate(zip(vector_ids, vectors, chunks))
        ]

        self._client.upsert(
            collection_name=settings.QDRANT_COLLECTION,
            points=points,
        )

        if progress_callback:
            progress_callback(100, total_chunks, total_chunks)

        return vector_ids

    def retrieving(
        self,
        query: str,
        file_ids: List[str],
        top_k: int = 5,
    ) -> List[str]:
        """
        Semantic search scoped to the given *file_ids*.
        Returns the raw text content of the top-k most relevant chunks.
        """
        vector = self._embedder.embed_query(query)
        results = self._client.search(
            collection_name=settings.QDRANT_COLLECTION,
            query_vector=vector,
            query_filter=Filter(
                must=[
                    FieldCondition(
                        key="file_id",
                        match=MatchAny(any=file_ids),
                    )
                ]
            ),
            limit=top_k,
        )
        return [hit.payload["content"] for hit in results]

    def delete_by_file(self, vector_ids: List[str]) -> None:
        """Remove all Qdrant points for a given file (by their vector UUIDs)."""
        if vector_ids:
            self._client.delete(
                collection_name=settings.QDRANT_COLLECTION,
                points_selector=vector_ids,
            )
