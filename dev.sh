#!/usr/bin/env bash
# WeatherPocket dev launcher for Linux / Ubuntu (no Docker)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend/frontend"
VENV_ACT="$BACKEND_DIR/.venv/bin/activate"

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

echo -e "\033[0;36m=> Starting BACKEND (uvicorn :8001)...\033[0m"
(
    cd "$BACKEND_DIR"
    source "$VENV_ACT"
    exec uvicorn main:app --reload --port 8001
) &
BACKEND_PID=$!

echo -e "\033[0;36m=> Starting FRONTEND (vite)...\033[0m"
(
    cd "$FRONTEND_DIR"
    export API_URL='http://localhost:8001'
    exec npm run dev
) &
FRONTEND_PID=$!

cleanup() {
    echo ""
    echo -e "\033[0;33mStopping dev servers (PID $BACKEND_PID, $FRONTEND_PID)...\033[0m"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo -e "\033[0;32mStopped successfully.\033[0m"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo ""
echo -e "\033[0;32mWeatherPocket dev servers started!\033[0m"
echo "  Backend  -> http://localhost:8001"
echo "  Frontend -> http://localhost:5174"
echo "Press Ctrl+C to stop all servers."
echo ""

wait $BACKEND_PID $FRONTEND_PID
