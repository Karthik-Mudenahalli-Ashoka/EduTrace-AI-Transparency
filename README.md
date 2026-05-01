# EduTrace — AI Usage Transparency Platform

An academic integrity tool that creates a **tamper-evident evidence trail** of student AI usage. Instead of trying to *catch* cheaters, EduTrace helps honest students document their AI usage transparently and gives professors real evidence to evaluate.

## Features

### Student Side
- **Python IDE** — Monaco Editor (VS Code's editor) with code execution
- **Document Editor** — Quill rich text editor for reports
- **AI Learning Assistant** — Side panel supporting OpenAI, Anthropic, and Gemini (student's own API key). AI is instructed to guide learning, not give direct answers
- **Keystroke Tracking** — Records typing/paste events and periodic content snapshots
- **AI Interaction Logging** — Every prompt and response is stored

### Professor Side  
- **Submission Dashboard** — View all student submissions
- **Final Work Tab** — See the student's submitted code or document
- **AI Interactions Tab** — Full chronological log of every AI prompt/response
- **Keystroke Timeline** — Visual timeline with paste event detection and stats
- **AI Analysis** — Gemini-powered structured analysis of AI usage patterns
- **Summary Chat** — Ask follow-up questions about the analysis ("Why did you flag paragraph 3?")

## Tech Stack
- **Backend**: FastAPI (Python)
- **Database**: SQLite + SQLAlchemy
- **Frontend**: Vanilla JS SPA served from FastAPI
- **Editors**: Monaco (code), Quill (documents)
- **AI**: OpenAI, Anthropic, Gemini APIs
- **Auth**: JWT tokens with bcrypt password hashing

## Quick Start

```bash
# 1. Install dependencies
cd backend
pip install -r requirements.txt

# 2. (Optional) Set Gemini API key for AI analysis features
export GEMINI_API_KEY=your-gemini-api-key

# 3. Seed demo data
python3 seed.py

# 4. Start the server
python3 -m uvicorn app.main:app --port 8000 --reload
```

Open **http://localhost:8000** in your browser.

## Demo Accounts

| Role      | Email                   | Password    |
|-----------|-------------------------|-------------|
| Professor | sarah@university.edu    | password123 |
| Professor | james@university.edu    | password123 |
| Student   | alex@student.edu        | password123 |
| Student   | maya@student.edu        | password123 |
| Student   | ryan@student.edu        | password123 |

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI app + static file serving
│   ├── database.py      # SQLAlchemy setup
│   ├── models.py        # ORM models
│   ├── schemas.py       # Pydantic schemas
│   ├── auth.py          # JWT auth + role-based access
│   ├── ai_service.py    # Multi-provider AI + analysis
│   └── routes/
│       ├── __init__.py  # Auth routes
│       ├── assignments.py
│       └── submissions.py
├── static/
│   ├── index.html
│   ├── css/app.css
│   └── js/
│       ├── api.js       # API client
│       ├── store.js     # State management
│       ├── components.js # Reusable UI
│       ├── pages.js     # Page renderers
│       └── app.js       # Workspace + Review + Router
├── seed.py              # Demo data seeder
├── start.sh             # Quick start script
└── requirements.txt
```

## How It Works

1. **Professor** creates assignments (Python or Document type)
2. **Student** opens the workspace — code IDE or rich text editor
3. While working, the app logs: keystrokes, paste events, content snapshots
4. Student can use the **AI Assistant** (their own API key) — all prompts/responses are recorded
5. Student submits → professor sees the full evidence trail
6. Professor clicks **Generate Analysis** → Gemini analyzes all evidence
7. Professor can **ask follow-up questions** about the analysis in a chat
