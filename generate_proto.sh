#!/usr/bin/env bash
# Generate Python and Web gRPC stubs from backend/proto/weatherpocket.proto

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend/frontend"
PROTO_GEN_DIR="$FRONTEND_DIR/src/generated/proto"

echo "==> Generating Python gRPC stubs..."
(
    cd "$BACKEND_DIR"
    if [ -f ".venv/bin/python" ]; then
        .venv/bin/python -m grpc_tools.protoc -Iproto --python_out=. --grpc_python_out=. proto/weatherpocket.proto
    else
        python3 -m grpc_tools.protoc -Iproto --python_out=. --grpc_python_out=. proto/weatherpocket.proto
    fi
)

echo "==> Generating Web gRPC stubs..."
(
    cd "$FRONTEND_DIR"
    mkdir -p src/generated/proto
    npm run proto:gen
)

echo "==> Patching Web gRPC stubs for ES/Vite compatibility..."
if [ -f "$PROTO_GEN_DIR/weatherpocket_pb.js" ]; then
    # Ensure exports is safely initialized in .js
    if ! grep -q "var exports = {}" "$PROTO_GEN_DIR/weatherpocket_pb.js"; then
        sed -i 's/\/\* eslint-disable \*\//\/\* eslint-disable \*\/\n\/\* @ts-nocheck \*\/\nif (typeof exports === "undefined") var exports = {};/' "$PROTO_GEN_DIR/weatherpocket_pb.js"
    fi

    # Sync weatherpocket_pb.cjs from weatherpocket_pb.js if missing or update imports
    if [ ! -f "$PROTO_GEN_DIR/weatherpocket_pb.cjs" ]; then
        cp "$PROTO_GEN_DIR/weatherpocket_pb.js" "$PROTO_GEN_DIR/weatherpocket_pb.cjs"
    fi
    sed -i "s/var jspb = require('google-protobuf');/import * as jspb from 'google-protobuf';\nif (typeof exports === 'undefined') var exports = {};/" "$PROTO_GEN_DIR/weatherpocket_pb.cjs" 2>/dev/null || true
fi

if [ -f "$PROTO_GEN_DIR/weatherpocket_grpc_web_pb.cjs" ]; then
    sed -i "s/\.\/weatherpocket_pb\.js/\.\/weatherpocket_pb\.cjs/g" "$PROTO_GEN_DIR/weatherpocket_grpc_web_pb.cjs"
fi

echo "==> gRPC stub generation complete!"
