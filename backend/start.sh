#!/bin/bash
# EduTrace - Start Script
# Usage: ./start.sh

echo "🚀 Starting EduTrace..."
echo ""

# Check if database needs seeding
if [ ! -f "edutrace.db" ]; then
    echo "📦 Seeding database with demo data..."
    python3 seed.py
    echo ""
fi

echo "🌐 Starting server at http://localhost:8000"
echo ""
echo "Demo Accounts:"
echo "  📚 Professor: sarah@university.edu / password123"
echo "  📚 Professor: james@university.edu / password123"
echo "  🎓 Student:   alex@student.edu / password123"
echo "  🎓 Student:   maya@student.edu / password123"
echo "  🎓 Student:   ryan@student.edu / password123"
echo ""
echo "Set GEMINI_API_KEY env var for AI analysis features:"
echo "  export GEMINI_API_KEY=your-key-here"
echo ""

python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
