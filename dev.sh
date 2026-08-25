#!/usr/bin/env bash
# WeatherPocket dev launcher for Linux / Ubuntu (Local MongoDB & gRPC support)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend/frontend"
VENV_ACT="$BACKEND_DIR/.venv/bin/activate"

# Fix for MongoDB 8.0+ on Linux kernel >= 6.19 (SERVER-121912)
export PATH="$HOME/.local/bin:$PATH"
export GLIBC_TUNABLES="glibc.pthread.rseq=1"


if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "\033[0;31mError: Backend directory not found: $BACKEND_DIR\033[0m"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "\033[0;31mError: Frontend directory not found: $FRONTEND_DIR\033[0m"
    exit 1
fi

if [ ! -f "$VENV_ACT" ]; then
    echo -e "\033[0;31mError: Virtual environment not found at $VENV_ACT\033[0m"
    echo "Please set up venv first: cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# 1. Check MongoDB status on localhost:27017
echo -e "\033[0;36m=> Checking MongoDB connection on localhost:27017...\033[0m"
MONGO_RUNNING=$(python3 -c "import socket; s = socket.socket(); s.settimeout(1); print(s.connect_ex(('127.0.0.1', 27017)) == 0)" 2>/dev/null)

if [ "$MONGO_RUNNING" != "True" ]; then
    echo -e "\033[0;33mMongoDB is not running on port 27017. Attempting to start system service...\033[0m"
    if command -v systemctl &>/dev/null; then
        sudo systemctl start mongod 2>/dev/null || sudo systemctl start mongodb 2>/dev/null
    elif command -v service &>/dev/null; then
        sudo service mongod start 2>/dev/null || sudo service mongodb start 2>/dev/null
    fi

    # Re-check MongoDB connection
    MONGO_RUNNING=$(python3 -c "import socket; s = socket.socket(); s.settimeout(1); print(s.connect_ex(('127.0.0.1', 27017)) == 0)" 2>/dev/null)
    if [ "$MONGO_RUNNING" != "True" ]; then
        echo -e "\033[0;31m[WARNING] Could not connect to MongoDB on localhost:27017!\033[0m"
        echo -e "\033[0;33mPlease start MongoDB manually with:  sudo systemctl start mongod\033[0m"
    else
        echo -e "\033[0;32mMongoDB system service started successfully!\033[0m"
    fi
else
    echo -e "\033[0;32mMongoDB is running!\033[0m"
fi

# 2. Start gRPC Server
echo -e "\033[0;36m=> Starting gRPC SERVER (port :50051)...\033[0m"
(
    cd "$BACKEND_DIR"
    source "$VENV_ACT"
    exec python -m app.grpc.server
) &
GRPC_PID=$!

# 3. Start Envoy Proxy (if installed or via Docker)
ENVOY_PID=""
if command -v envoy &>/dev/null; then
    echo -e "\033[0;36m=> Starting ENVOY PROXY (port :8080 -> :50051)...\033[0m"
    (
        cd "$ROOT_DIR"
        exec envoy -c envoy.yaml
    ) &
    ENVOY_PID=$!
elif command -v docker &>/dev/null && docker info &>/dev/null; then
    echo -e "\033[0;36m=> Starting ENVOY PROXY via Docker (port :8080 -> :50051)...\033[0m"
    docker run --rm --name weatherpocket_envoy -p 8080:8080 -v "$ROOT_DIR/envoy.yaml:/etc/envoy/envoy.yaml:ro" envoyproxy/envoy:v1.31-latest &>/dev/null &
    ENVOY_PID=$!
else
    echo -e "\033[0;33m=> Note: Envoy proxy binary/Docker permission not active. Frontend will automatically fallback to HTTP REST.\033[0m"
fi

# 4. Start HTTP Backend (FastAPI)
echo -e "\033[0;36m=> Starting HTTP BACKEND (uvicorn :8001)...\033[0m"
(
    cd "$BACKEND_DIR"
    source "$VENV_ACT"
    exec uvicorn main:app --reload --port 8001
) &
BACKEND_PID=$!

# 5. Start Frontend (Vite)
echo -e "\033[0;36m=> Starting FRONTEND (vite)...\033[0m"
(
    cd "$FRONTEND_DIR"
    export API_URL='http://localhost:8001'
    export VITE_GRPC_HOST='http://localhost:8080'
    exec npm run dev -- --force
) &
FRONTEND_PID=$!

cleanup() {
    echo ""
    echo -e "\033[0;33mStopping dev servers (PIDs: $GRPC_PID $BACKEND_PID $FRONTEND_PID $ENVOY_PID)...\033[0m"
    kill $GRPC_PID $BACKEND_PID $FRONTEND_PID $ENVOY_PID 2>/dev/null
    if command -v docker &>/dev/null && docker info &>/dev/null; then
        docker stop weatherpocket_envoy 2>/dev/null
    fi
    wait $GRPC_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo -e "\033[0;32mStopped successfully.\033[0m"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo ""
echo -e "\033[0;32mWeatherPocket dev servers started!\033[0m"
echo "  HTTP Backend -> http://localhost:8001"
echo "  gRPC Server  -> localhost:50051"
if [ -n "$ENVOY_PID" ]; then
    echo "  Envoy Proxy  -> http://localhost:8080"
fi
echo "  Frontend     -> http://localhost:5174"
echo "Press Ctrl+C to stop all servers."
echo ""

wait $BACKEND_PID $FRONTEND_PID $GRPC_PID
