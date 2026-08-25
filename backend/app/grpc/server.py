import asyncio
import logging
import threading
from concurrent import futures

import grpc
from fastapi import HTTPException
from grpc_health.v1 import health_pb2_grpc

from app.grpc.auth_interceptor import AuthInterceptor
from app.grpc.health_service import HealthServicer
from app.core.langchain_history import get_session_history
from app.db.mongo import MongoClientSingleton
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService

import weatherpocket_pb2
import weatherpocket_pb2_grpc

logger = logging.getLogger(__name__)


class AsyncRuntime:
    """Run all async work on one persistent loop for gRPC worker threads."""

    def __init__(self) -> None:
        self._loop: asyncio.AbstractEventLoop | None = None
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._loop and self._loop.is_running():
            return

        loop = asyncio.new_event_loop()

        def _runner() -> None:
            asyncio.set_event_loop(loop)
            loop.run_forever()

        thread = threading.Thread(target=_runner, name="grpc-async-runtime", daemon=True)
        thread.start()
        self._loop = loop
        self._thread = thread

    def run(self, coro):
        if not self._loop or not self._loop.is_running():
            self.start()
        future = asyncio.run_coroutine_threadsafe(coro, self._loop)
        return future.result()


ASYNC_RUNTIME = AsyncRuntime()


def _run_async(coro):
    return ASYNC_RUNTIME.run(coro)


def _map_http_exception(exc: HTTPException, context):
    code = getattr(exc, "status_code", 500)
    detail = getattr(exc, "detail", "Request failed")

    mapping = {
        400: grpc.StatusCode.INVALID_ARGUMENT,
        401: grpc.StatusCode.UNAUTHENTICATED,
        403: grpc.StatusCode.PERMISSION_DENIED,
        404: grpc.StatusCode.NOT_FOUND,
        409: grpc.StatusCode.ALREADY_EXISTS,
        422: grpc.StatusCode.INVALID_ARGUMENT,
    }
    context.abort(mapping.get(code, grpc.StatusCode.INTERNAL), str(detail))


def _authentication_metadata(context):
    metadata = {k.lower(): v for k, v in context.invocation_metadata()}
    auth_value = metadata.get("authorization")
    if not auth_value:
        context.abort(grpc.StatusCode.UNAUTHENTICATED, "Missing bearer token")
    if not auth_value.lower().startswith("bearer "):
        context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid bearer token format")
    token = auth_value.split(" ", 1)[1].strip()
    if not token:
        context.abort(grpc.StatusCode.UNAUTHENTICATED, "Missing bearer token")
    return token


async def _current_user_from_context(context):
    token = _authentication_metadata(context)
    auth_service = AuthService(UserRepository())
    try:
        return await auth_service.get_current_user(token)
    except HTTPException as exc:
        _map_http_exception(exc, context)
        raise RuntimeError("unreachable")


def _user_to_proto(user):
    message = weatherpocket_pb2.UserResponse()
    message.id = str(user.id)
    message.email = user.email
    message.fullname = user.fullname
    message.is_active = bool(user.is_active)
    return message


def _auth_response_to_proto(result):
    message = weatherpocket_pb2.AuthResponse()
    message.access_token = result["access_token"]
    message.token_type = result["token_type"]
    if result.get("user"):
        message.user.CopyFrom(_user_to_proto_from_dict(result["user"]))
    return message


def _user_to_proto_from_dict(data):
    message = weatherpocket_pb2.UserResponse()
    message.id = str(data.get("_id") or data.get("id") or "")
    message.email = data.get("email", "")
    message.fullname = data.get("fullname", "")
    message.is_active = bool(data.get("is_active", True))
    return message


def _conversation_to_proto(conv):
    message = weatherpocket_pb2.ConversationResponse()
    message.id = str(conv.id)
    message.user_id = str(conv.user_id)
    message.title = conv.title
    message.created_at = conv.created_at.isoformat()
    message.updated_at = conv.updated_at.isoformat()
    return message


class WeatherPocketServiceMixin:
    """gRPC implementation for static services. AI/LLM services remain for later migration."""

    def SignUp(self, request, context):
        service = AuthService(UserRepository())
        try:
            result = _run_async(service.signup(request.email, request.fullname, request.password))
            return _auth_response_to_proto(result)
        except HTTPException as exc:
            _map_http_exception(exc, context)
            raise RuntimeError("unreachable")

    def Login(self, request, context):
        service = AuthService(UserRepository())
        try:
            result = _run_async(service.login(request.email, request.password))
            return _auth_response_to_proto(result)
        except HTTPException as exc:
            _map_http_exception(exc, context)
            raise RuntimeError("unreachable")

    def Logout(self, request, context):
        return weatherpocket_pb2.Empty()

    def RefreshToken(self, request, context):
        token = _authentication_metadata(context)
        service = AuthService(UserRepository())
        try:
            user = _run_async(service.get_current_user(token))
            result = _run_async(service.refresh_token(str(user.id)))
            message = weatherpocket_pb2.AuthResponse()
            message.access_token = result["access_token"]
            message.token_type = result["token_type"]
            message.user.CopyFrom(_user_to_proto(user))
            return message
        except HTTPException as exc:
            _map_http_exception(exc, context)
            raise RuntimeError("unreachable")

    def GetMe(self, request, context):
        try:
            user = _run_async(_current_user_from_context(context))
            return _user_to_proto(user)
        except HTTPException as exc:
            _map_http_exception(exc, context)
            raise RuntimeError("unreachable")

    def CreateConversation(self, request, context):
        try:
            user = _run_async(_current_user_from_context(context))
            repo = ConversationRepository()
            conv = _run_async(repo.create(str(user.id), request.title))
            return _conversation_to_proto(conv)
        except HTTPException as exc:
            _map_http_exception(exc, context)
            raise RuntimeError("unreachable")

    def ListConversations(self, request, context):
        try:
            user = _run_async(_current_user_from_context(context))
            repo = ConversationRepository()
            convs = _run_async(repo.list_by_user(str(user.id)))
            response = weatherpocket_pb2.ListConversationsResponse()
            for conv in convs:
                response.conversations.add().CopyFrom(_conversation_to_proto(conv))
            return response
        except HTTPException as exc:
            _map_http_exception(exc, context)
            raise RuntimeError("unreachable")

    def GetConversation(self, request, context):
        try:
            user = _run_async(_current_user_from_context(context))
            repo = ConversationRepository()
            conv = _run_async(repo.get_by_id_and_user(request.conversation_id, str(user.id)))
            if not conv:
                exists = _run_async(repo.get_by_id(request.conversation_id))
                if exists:
                    context.abort(grpc.StatusCode.PERMISSION_DENIED, "Access denied")
                context.abort(grpc.StatusCode.NOT_FOUND, "Conversation not found")
            return _conversation_to_proto(conv)
        except HTTPException as exc:
            _map_http_exception(exc, context)
            raise RuntimeError("unreachable")

    def DeleteConversation(self, request, context):
        try:
            user = _run_async(_current_user_from_context(context))
            repo = ConversationRepository()
            conv = _run_async(repo.get_by_id_and_user(request.conversation_id, str(user.id)))
            if not conv:
                exists = _run_async(repo.get_by_id(request.conversation_id))
                if exists:
                    context.abort(grpc.StatusCode.PERMISSION_DENIED, "Access denied")
                context.abort(grpc.StatusCode.NOT_FOUND, "Conversation not found")
            _run_async(repo.delete(request.conversation_id))
            return weatherpocket_pb2.Empty()
        except HTTPException as exc:
            _map_http_exception(exc, context)
            raise RuntimeError("unreachable")

    def CreateConversationFromPrompt(self, request, context):
        try:
            from app.services.chat_service import ChatService

            user = _run_async(_current_user_from_context(context))
            service = ChatService.get_instance()
            conversation_id = _run_async(service.create_conversation(str(user.id), request.content))
            response = weatherpocket_pb2.CreateConversationPromptResponse()
            response.conversation_id = conversation_id
            return response
        except ValueError as exc:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, str(exc))
        except HTTPException as exc:
            _map_http_exception(exc, context)
            raise RuntimeError("unreachable")
        except ModuleNotFoundError as exc:
            context.abort(grpc.StatusCode.UNAVAILABLE, f"AI dependencies are not installed yet: {exc.name}")

    def SendMessage(self, request, context):
        try:
            from app.services.chat_service import ChatService

            user = _run_async(_current_user_from_context(context))
            service = ChatService.get_instance()
            reply = _run_async(
                service.send_message(
                    request.conversation_id,
                    str(user.id),
                    request.content,
                    file_ids=list(request.file_ids),
                )
            )
            response = weatherpocket_pb2.SendMessageResponse()
            response.reply = reply if isinstance(reply, str) else str(reply)
            return response
        except ValueError as exc:
            message = str(exc)
            if "Access denied" in message:
                context.abort(grpc.StatusCode.PERMISSION_DENIED, message)
            if "not found" in message.lower():
                context.abort(grpc.StatusCode.NOT_FOUND, message)
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, message)
        except HTTPException as exc:
            _map_http_exception(exc, context)
            raise RuntimeError("unreachable")
        except ModuleNotFoundError as exc:
            context.abort(grpc.StatusCode.UNAVAILABLE, f"AI dependencies are not installed yet: {exc.name}")

    def StreamMessage(self, request, context):
        try:
            from app.services.chat_service import ChatService

            user = _run_async(_current_user_from_context(context))
            service = ChatService.get_instance()
            stream = service.stream_message(
                request.conversation_id,
                str(user.id),
                request.content,
                file_ids=list(request.file_ids),
            )

            while True:
                try:
                    chunk = _run_async(stream.__anext__())
                except StopAsyncIteration:
                    break

                response = weatherpocket_pb2.StreamMessageChunk()
                response.content = chunk if isinstance(chunk, str) else str(chunk)
                response.done = False
                yield response

            final = weatherpocket_pb2.StreamMessageChunk()
            final.done = True
            yield final
        except ValueError as exc:
            message = str(exc)
            if "Access denied" in message:
                context.abort(grpc.StatusCode.PERMISSION_DENIED, message)
            if "not found" in message.lower():
                context.abort(grpc.StatusCode.NOT_FOUND, message)
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, message)
        except HTTPException as exc:
            _map_http_exception(exc, context)
            raise RuntimeError("unreachable")
        except ModuleNotFoundError as exc:
            context.abort(grpc.StatusCode.UNAVAILABLE, f"AI dependencies are not installed yet: {exc.name}")

    def GetMessages(self, request, context):
        try:
            from app.services.chat_service import ChatService

            user = _run_async(_current_user_from_context(context))
            service = ChatService.get_instance()
            messages = _run_async(service.get_messages(request.conversation_id, str(user.id)))
            response = weatherpocket_pb2.GetMessagesResponse()
            for item in messages:
                msg = response.messages.add()
                msg.type = getattr(item, "type", "ai")
                msg.content = getattr(item, "content", "")
            return response
        except ValueError as exc:
            message = str(exc)
            if "Access denied" in message:
                context.abort(grpc.StatusCode.PERMISSION_DENIED, message)
            if "not found" in message.lower():
                context.abort(grpc.StatusCode.NOT_FOUND, message)
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, message)
        except HTTPException as exc:
            _map_http_exception(exc, context)
            raise RuntimeError("unreachable")

    def UploadPdf(self, request, context):
        try:
            from app.services.file_service import FileService

            user = _run_async(_current_user_from_context(context))
            if not request.file_name.lower().endswith(".pdf"):
                context.abort(grpc.StatusCode.INVALID_ARGUMENT, "Only PDF files are supported.")

            service = FileService.get_instance()
            result = _run_async(
                service.upload_pdf(
                    conversation_id=request.conversation_id,
                    user_id=str(user.id),
                    file_name=request.file_name,
                    raw_bytes=request.content,
                )
            )
            response = weatherpocket_pb2.UploadPdfResponse()
            response.file_id = str(result.id)
            response.file_name = result.file_name
            response.chunks = len(result.chunks)
            return response
        except ValueError as exc:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, str(exc))
        except HTTPException as exc:
            _map_http_exception(exc, context)
            raise RuntimeError("unreachable")
        except ModuleNotFoundError as exc:
            context.abort(grpc.StatusCode.UNAVAILABLE, f"AI dependencies are not installed yet: {exc.name}")

    def UploadPdfStream(self, request, context):
        try:
            from app.services.file_service import FileService

            user = _run_async(_current_user_from_context(context))
            if not request.file_name.lower().endswith(".pdf"):
                context.abort(grpc.StatusCode.INVALID_ARGUMENT, "Only PDF files are supported.")

            queue = asyncio.Queue()

            async def progress_callback(stage: str, progress: int, message: str, meta: dict = None):
                chunk = weatherpocket_pb2.UploadPdfProgressChunk()
                chunk.type = "progress"
                chunk.stage = stage
                chunk.progress = progress
                chunk.message = message
                await queue.put(chunk)

            async def process():
                service = FileService.get_instance()
                try:
                    result = await service.upload_pdf(
                        conversation_id=request.conversation_id,
                        user_id=str(user.id),
                        file_name=request.file_name,
                        raw_bytes=request.content,
                        progress_callback=progress_callback,
                    )
                    done_chunk = weatherpocket_pb2.UploadPdfProgressChunk()
                    done_chunk.type = "done"
                    done_chunk.stage = "done"
                    done_chunk.progress = 100
                    done_chunk.message = "File processing complete"
                    done_chunk.result.file_id = str(result.id)
                    done_chunk.result.file_name = result.file_name
                    done_chunk.result.chunks = len(result.chunks)
                    await queue.put(done_chunk)
                except Exception as e:
                    err_chunk = weatherpocket_pb2.UploadPdfProgressChunk()
                    err_chunk.type = "error"
                    err_chunk.stage = "error"
                    err_chunk.progress = 100
                    err_chunk.message = str(e)
                    await queue.put(err_chunk)
                finally:
                    await queue.put(None)

            ASYNC_RUNTIME._loop.create_task(process())

            while True:
                item = _run_async(queue.get())
                if item is None:
                    break
                yield item

        except ValueError as exc:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, str(exc))
        except HTTPException as exc:
            _map_http_exception(exc, context)
            raise RuntimeError("unreachable")
        except ModuleNotFoundError as exc:
            context.abort(grpc.StatusCode.UNAVAILABLE, f"AI dependencies are not installed yet: {exc.name}")

    def ListFiles(self, request, context):
        try:
            from app.services.file_service import FileService

            _run_async(_current_user_from_context(context))
            service = FileService.get_instance()
            files = _run_async(service.list_files(request.conversation_id))
            response = weatherpocket_pb2.ListFilesResponse()
            for f in files:
                file_info = response.files.add()
                file_info.file_id = str(f.id)
                file_info.file_name = f.file_name
                file_info.chunks = len(f.chunks)
                file_info.upload_at = f.upload_at.isoformat()
            return response
        except HTTPException as exc:
            _map_http_exception(exc, context)
            raise RuntimeError("unreachable")
        except ModuleNotFoundError as exc:
            context.abort(grpc.StatusCode.UNAVAILABLE, f"AI dependencies are not installed yet: {exc.name}")

    def DeleteFile(self, request, context):
        try:
            from app.services.file_service import FileService

            user = _run_async(_current_user_from_context(context))
            service = FileService.get_instance()
            _run_async(service.delete_file(file_id=request.file_id, user_id=str(user.id)))
            return weatherpocket_pb2.Empty()
        except ValueError as exc:
            context.abort(grpc.StatusCode.NOT_FOUND, str(exc))
        except HTTPException as exc:
            _map_http_exception(exc, context)
            raise RuntimeError("unreachable")
        except ModuleNotFoundError as exc:
            context.abort(grpc.StatusCode.UNAVAILABLE, f"AI dependencies are not installed yet: {exc.name}")

    def GetChunk(self, request, context):
        try:
            from app.services.file_service import FileService

            user = _run_async(_current_user_from_context(context))
            service = FileService.get_instance()
            chunk_data = _run_async(
                service.get_chunk_by_file_and_index(
                    file_id=request.file_id,
                    user_id=str(user.id),
                    chunk_index=request.chunk_index,
                )
            )
            response = weatherpocket_pb2.ChunkResponse()
            response.file_id = chunk_data["file_id"]
            response.file_name = chunk_data["file_name"]
            response.chunk_index = chunk_data["chunk_index"]
            response.content = chunk_data["content"]
            return response
        except ValueError as exc:
            message = str(exc)
            if "not found" in message.lower() or "access denied" in message.lower():
                context.abort(grpc.StatusCode.NOT_FOUND, message)
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, message)
        except HTTPException as exc:
            _map_http_exception(exc, context)
            raise RuntimeError("unreachable")
        except ModuleNotFoundError as exc:
            context.abort(grpc.StatusCode.UNAVAILABLE, f"AI dependencies are not installed yet: {exc.name}")


class WeatherPocketService(WeatherPocketServiceMixin):
    """Concrete gRPC service for static APIs; AI features follow later."""

    pass


def serve(port: int = 50051, max_workers: int = 10):
    ASYNC_RUNTIME.start()
    try:
        _run_async(MongoClientSingleton.connect())
    except Exception:
        logger.exception("MongoDB connection failed during gRPC startup")

    try:
        from app.services.rag_service import RagService
        RagService.get_instance()
    except Exception:
        logger.exception("RagService warmup failed during startup")

    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=max_workers),
        interceptors=(AuthInterceptor(),),
    )

    weatherpocket_pb2_grpc.add_AuthServiceServicer_to_server(WeatherPocketService(), server)
    weatherpocket_pb2_grpc.add_ConversationServiceServicer_to_server(WeatherPocketService(), server)
    weatherpocket_pb2_grpc.add_ChatServiceServicer_to_server(WeatherPocketService(), server)
    weatherpocket_pb2_grpc.add_DocumentServiceServicer_to_server(WeatherPocketService(), server)

    health_pb2_grpc.add_HealthServicer_to_server(HealthServicer(), server)
    server.add_insecure_port(f"[::]:{port}")
    server.start()
    logger.info("gRPC server started on port %s", port)
    server.wait_for_termination()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    serve()
