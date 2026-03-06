import os
from typing import Awaitable, Callable, List, Optional

from app.models.file_content import ChunkContent, FileContent
from app.repositories.file_content_repository import FileContentRepository
from app.services.rag_service import RagService
from app.utils.pdf_parser import extract_text_from_pdf

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


class FileService:
    _instance = None

    def __init__(self):
        self.file_repo = FileContentRepository()
        self.rag = RagService.get_instance()

    @classmethod
    def get_instance(cls) -> "FileService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # ─── Upload ────────────────────────────────────────────────────────────────

    async def upload_pdf(
        self,
        conversation_id: str,
        user_id: str,
        file_name: str,
        raw_bytes: bytes,
        progress_callback: Optional[Callable[[str, int, str, Optional[dict]], Awaitable[None]]] = None,
    ) -> FileContent:
        """
        Full pipeline:
          1. Save PDF temporarily
          2. Extract text
          3. Chunk text
          4. Save FileContent skeleton to MongoDB  →  get file_id
          5. Embed chunks + index into Qdrant     →  get vector_ids
          6. Back-fill vector_id on each ChunkContent in MongoDB
          7. Return final FileContent
        """
        async def emit(stage: str, progress: int, message: str, meta: Optional[dict] = None):
            if progress_callback:
                await progress_callback(stage, progress, message, meta)

        # 1. Write temp file
        tmp_path = os.path.join(UPLOAD_DIR, f"{conversation_id}_{file_name}")
        await emit("upload", 100, "Upload completed")

        with open(tmp_path, "wb") as f:
            f.write(raw_bytes)

        await emit("extract_text", 10, "Extracting text from PDF")

        try:
            # 2. Extract text
            text = extract_text_from_pdf(tmp_path)
        finally:
            os.remove(tmp_path)

        if not text.strip():
            raise ValueError("Could not extract text from the PDF.")

        await emit("extract_text", 100, "PDF converted to text")

        # 3. Chunk
        await emit("chunking", 10, "Chunking extracted text")
        chunks = self.rag.chunking(text)
        await emit("chunking", 100, "Chunking complete", {"chunks": len(chunks)})

        # 4. Build ChunkContent list (vector_id empty for now) and save to MongoDB
        chunk_objects = [
            ChunkContent(chunk_index=i, content=chunk)
            for i, chunk in enumerate(chunks)
        ]
        file_content = FileContent(
            conversation_id=conversation_id,
            file_name=file_name,
            user_id=user_id,
            chunks=chunk_objects,
        )
        saved = await self.file_repo.create(file_content)
        file_id = str(saved.id)

        # 5. Embed + index into Qdrant; get back one vector_id per chunk
        await emit("embedding", 0, "Creating embeddings")

        def on_embedding_progress(progress: int, completed: int, total: int):
            if not progress_callback:
                return
            progress_message = f"Embedding chunks ({completed}/{total})"
            import asyncio
            loop = asyncio.get_running_loop()
            loop.create_task(
                progress_callback(
                    "embedding",
                    progress,
                    progress_message,
                    {"completed": completed, "total": total},
                )
            )

        vector_ids = self.rag.indexing(
            chunks,
            file_id=file_id,
            user_id=user_id,
            progress_callback=on_embedding_progress,
        )

        # 6. Back-fill vector_ids into the ChunkContent objects, then persist
        for chunk_obj, vector_id in zip(saved.chunks, vector_ids):
            chunk_obj.vector_id = vector_id
        await self.file_repo.update_chunk_vector_ids(file_id, saved.chunks)

        await emit("done", 100, "File indexed and ready", {"file_id": file_id})

        return saved

    # ─── List ──────────────────────────────────────────────────────────────────

    async def list_files(self, conversation_id: str) -> List[FileContent]:
        return await self.file_repo.list_by_conversation(conversation_id)

    # ─── Delete ────────────────────────────────────────────────────────────────

    async def delete_file(self, file_id: str, user_id: str) -> None:
        """
        Delete file from MongoDB and purge its vectors from Qdrant.
        """
        file_content = await self.file_repo.get_by_id_and_user(file_id, user_id)
        if not file_content:
            raise ValueError("File not found or access denied.")

        # Remove vectors from Qdrant
        vector_ids = [c.vector_id for c in file_content.chunks if c.vector_id]
        if vector_ids:
            self.rag.delete_by_file(vector_ids)

        # Remove document from MongoDB
        await self.file_repo.delete(file_id, user_id)
