#!/bin/bash
# Quick start script for testing GymChad locally

echo "🚀 Starting GymChad locally..."

# Backend
echo "📦 Starting backend (FastAPI)..."
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py &
BACKEND_PID=$!

# Frontend
echo "📦 Starting frontend (React)..."
cd ../frontend
npm install
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Services started!"
echo ""
echo "🌐 Access at:"
echo "   Frontend:  http://localhost:5173"
echo "   Backend:   http://localhost:3001"
echo "   API Docs:  http://localhost:3001/docs"
echo ""
echo "Hit Ctrl+C to stop all services"
echo ""

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
