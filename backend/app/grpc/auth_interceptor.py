from typing import Callable

import grpc


PUBLIC_METHODS = {
    "/weatherpocket.v1.AuthService/SignUp",
    "/weatherpocket.v1.AuthService/Login",
    "/grpc.health.v1.Health/Check",
}


class AuthInterceptor(grpc.ServerInterceptor):
    """Ensure a bearer token is present on protected RPCs.

    This is intentionally lightweight for Phase 1: it validates shape only, not
    the JWT claims. The actual token validation can be delegated to the existing
    AuthService later.
    """

    def intercept_service(self, continuation, handler_call_details):
        handler = continuation(handler_call_details)
        if handler is None:
            return None

        if handler_call_details.method in PUBLIC_METHODS:
            return handler

        metadata = {k.lower(): v for k, v in (handler_call_details.invocation_metadata or [])}
        auth_value = metadata.get("authorization")

        if not auth_value:
            def unauthenticated_unary(request, context):
                context.abort(grpc.StatusCode.UNAUTHENTICATED, "Missing bearer token")

            def unauthenticated_stream(request_iterator, context):
                context.abort(grpc.StatusCode.UNAUTHENTICATED, "Missing bearer token")

            if handler.request_streaming and handler.response_streaming:
                return grpc.stream_stream_rpc_method_handler(
                    unauthenticated_stream,
                    request_deserializer=handler.request_deserializer,
                    response_serializer=handler.response_serializer,
                )
            if handler.request_streaming:
                return grpc.stream_unary_rpc_method_handler(
                    unauthenticated_stream,
                    request_deserializer=handler.request_deserializer,
                    response_serializer=handler.response_serializer,
                )
            if handler.response_streaming:
                return grpc.unary_stream_rpc_method_handler(
                    unauthenticated_unary,
                    request_deserializer=handler.request_deserializer,
                    response_serializer=handler.response_serializer,
                )
            return grpc.unary_unary_rpc_method_handler(
                unauthenticated_unary,
                request_deserializer=handler.request_deserializer,
                response_serializer=handler.response_serializer,
            )

        if not auth_value.lower().startswith("bearer "):
            def reject(request, context):
                context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid bearer token format")

            if handler.request_streaming and handler.response_streaming:
                return grpc.stream_stream_rpc_method_handler(
                    reject,
                    request_deserializer=handler.request_deserializer,
                    response_serializer=handler.response_serializer,
                )
            if handler.request_streaming:
                return grpc.stream_unary_rpc_method_handler(
                    reject,
                    request_deserializer=handler.request_deserializer,
                    response_serializer=handler.response_serializer,
                )
            if handler.response_streaming:
                return grpc.unary_stream_rpc_method_handler(
                    reject,
                    request_deserializer=handler.request_deserializer,
                    response_serializer=handler.response_serializer,
                )
            return grpc.unary_unary_rpc_method_handler(
                reject,
                request_deserializer=handler.request_deserializer,
                response_serializer=handler.response_serializer,
            )

        return handler
