import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse

from app.api.routes.auth import get_current_user
from app.services.file_service import FileService

router = APIRouter(prefix="/chat", tags=["documents"])


def get_file_service() -> FileService:
    return FileService.get_instance()


@router.post("/{conversation_id}/files")
async def upload_file(
    conversation_id: str,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    service: FileService = Depends(get_file_service),
):
    """Upload a PDF, chunk + embed it, and index into Qdrant."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        raw = await file.read()
        result = await service.upload_pdf(
            conversation_id=conversation_id,
            user_id=str(current_user.id),
            file_name=file.filename,
            raw_bytes=raw,
        )
        return {
            "file_id": str(result.id),
            "file_name": result.file_name,
            "chunks": len(result.chunks),
        }
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{conversation_id}/files/stream")
async def upload_file_stream(
    conversation_id: str,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    service: FileService = Depends(get_file_service),
):
    """Upload a PDF and stream processing progress as NDJSON lines."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    user_id = str(current_user.id)
    raw = await file.read()

    async def event_generator():
        queue: asyncio.Queue[str | None] = asyncio.Queue()

        async def emit(stage: str, progress: int, message: str, meta: dict | None = None):
            payload = {
                "type": "progress",
                "stage": stage,
                "progress": progress,
                "message": message,
            }
            if meta:
                payload["meta"] = meta
            await queue.put(json.dumps(payload))

        async def worker():
            try:
                result = await service.upload_pdf(
                    conversation_id=conversation_id,
                    user_id=user_id,
                    file_name=file.filename,
                    raw_bytes=raw,
                    progress_callback=emit,
                )
                await queue.put(
                    json.dumps(
                        {
                            "type": "done",
                            "stage": "done",
                            "progress": 100,
                            "message": "File processing complete",
                            "result": {
                                "file_id": str(result.id),
                                "file_name": result.file_name,
                                "chunks": len(result.chunks),
                            },
                        }
                    )
                )
            except ValueError as e:
                await queue.put(
                    json.dumps(
                        {
                            "type": "error",
                            "stage": "error",
                            "progress": 100,
                            "message": str(e),
                        }
                    )
                )
            except Exception as e:
                await queue.put(
                    json.dumps(
                        {
                            "type": "error",
                            "stage": "error",
                            "progress": 100,
                            "message": str(e),
                        }
                    )
                )
            finally:
                await queue.put(None)

        task = asyncio.create_task(worker())

        try:
            while True:
                item = await queue.get()
                if item is None:
                    break
                yield item + "\n"
        finally:
            if not task.done():
                task.cancel()

    return StreamingResponse(
        event_generator(),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{conversation_id}/files")
async def list_files(
    conversation_id: str,
    current_user=Depends(get_current_user),
    service: FileService = Depends(get_file_service),
):
    """List all indexed files for a conversation."""
    files = await service.list_files(conversation_id)
    return [
        {
            "file_id": str(f.id),
            "file_name": f.file_name,
            "chunks": len(f.chunks),
            "upload_at": f.upload_at.isoformat(),
        }
        for f in files
    ]


@router.get("/files/{file_id}/chunks/{chunk_index}")
async def get_file_chunk(
    file_id: str,
    chunk_index: int,
    current_user=Depends(get_current_user),
    service: FileService = Depends(get_file_service),
):
    """Fetch a specific chunk content for citation hover previews."""
    try:
        return await service.get_chunk_by_file_and_index(
            file_id=file_id,
            user_id=str(current_user.id),
            chunk_index=chunk_index,
        )
    except ValueError as e:
        msg = str(e)
        if "access denied" in msg.lower() or "file not found" in msg.lower():
            raise HTTPException(status_code=404, detail=msg)
        if "chunk not found" in msg.lower():
            raise HTTPException(status_code=404, detail=msg)
        raise HTTPException(status_code=400, detail=msg)


@router.delete("/{conversation_id}/files/{file_id}")
async def delete_file(
    conversation_id: str,
    file_id: str,
    current_user=Depends(get_current_user),
    service: FileService = Depends(get_file_service),
):
    """Delete a file and purge its vectors from Qdrant."""
    try:
        await service.delete_file(file_id=file_id, user_id=str(current_user.id))
        return {"detail": "File deleted successfully."}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
