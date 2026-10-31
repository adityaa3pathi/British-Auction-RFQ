#!/bin/bash
set -e

echo "Starting British Auction RFQ System..."

# Start backend
cd backend
source venv/bin/activate
python seed.py
uvicorn app.main:app --port 8000 &
BACKEND_PID=$!
cd ..

# Start frontend
cd frontend
npm run dev -- --port 5173 &
FRONTEND_PID=$!
cd ..

echo "Backend running on http://localhost:8000"
echo "Frontend running on http://localhost:5173"
echo "Interactive API Docs on http://localhost:8000/docs"
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true" EXIT
wait
