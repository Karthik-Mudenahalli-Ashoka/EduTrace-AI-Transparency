# EduTrace — AI Usage Transparency Platform

![EduTrace Logo](https://raw.githubusercontent.com/Karthik-Mudenahalli-Ashoka/EduTrace-AI-Transparency/main/backend/static/navbar-logo.png) (Placeholder)

**EduTrace** is a professional-grade Academic Integrity & Monitoring platform designed for the age of Generative AI. Instead of relying on unreliable AI "detectors," EduTrace creates a **tamper-evident evidence trail** of student work, allowing for transparent documentation of AI usage and evidence-based evaluation.

## ✨ Key Features

### 🎓 For Students
- **Hybrid Workspace** — Switch between a full-featured **Python IDE** (Monaco) and a **Rich Text Document Editor** (Quill).
- **Embedded AI Learning Assistant** — Chat with Gemini, OpenAI, or Claude to understand concepts. All interactions are logged to prove your process.
- **Transparency by Design** — Record your keystrokes, paste events, and browser focus patterns to demonstrate academic honesty.

### 👨‍🏫 For Professors
- **Integrity Dashboard** — High-contrast review interface with real-time risk assessments.
- **Live Replay Player** — Rewind and watch the student's entire writing process stroke-by-stroke.
- **Keystroke Heatmap** — Instant visual identification of pasted vs. typed content in code submissions.
- **AI Integrity Reporting** — Structured reports analyzing AI usage patterns, prompted by Gemini.
- **Advanced Grading** — Integrated grading system supporting both **Percentage** and **Letter Grades (A-F)** with automatic conversion.

## 🎨 Premium UI/UX
EduTrace features a modern, **high-contrast light mode** theme with:
- Clean, card-based layouts.
- Vibrant indigo and violet accents.
- Responsive, mobile-friendly design.
- Accessible typography (Outfit & Inter).

## 🛠 Tech Stack
- **Backend**: FastAPI (Python 3.9+)
- **Database**: SQLite (SQLAlchemy ORM)
- **Frontend**: Vanilla JavaScript (SPA Architecture)
- **Rich Editors**: Monaco (VS Code core), Quill.js
- **Intelligence**: Gemini, OpenRouter, GPT-4

## 🚀 Getting Started

### Prerequisites
- Python 3.9 or higher
- An OpenRouter or Gemini API Key (for analysis features)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Karthik-Mudenahalli-Ashoka/EduTrace-AI-Transparency.git
   cd EduTrace
   ```

2. **Run the quick-start script:**
   This script will set up your virtual environment, install dependencies, and seed the database with demo accounts.
   ```bash
   chmod +x backend/start.sh
   ./backend/start.sh
   ```

3. **Access the platform:**
   Open [http://localhost:8000](http://localhost:8000) in your browser.

## 👥 Demo Accounts

| Role      | Email                   | Password    |
|-----------|-------------------------|-------------|
| Professor | prof1@stevens.edu       | password123 |
| Professor | prof2@stevens.edu       | password123 |
| Student   | alex@student.edu        | password123 |

## 📁 Project Architecture
The project follows a modular structure where the backend serves the frontend as static assets:

```
EduTrace/
├── backend/
│   ├── app/             # FastAPI Backend (Routes, Models, Logic)
│   ├── static/          # Integrated Frontend (HTML, CSS, JS)
│   ├── seed.py          # Database Seeder
│   └── start.sh         # Auto-setup Script
└── README.md
```

---
**EduTrace** — *Building trust through transparency.*
