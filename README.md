# EduTrace — Next-Gen Academic Integrity & AI Transparency

**EduTrace** is a professional academic integrity platform designed to solve the "AI problem" in education. Unlike unreliable AI detectors that produce false positives, EduTrace builds a **tamper-evident evidence trail** of the entire creation process. It shifts the focus from *catching* students to *verifying* their original thought process.

---

## 🛡️ The "Uncheatable" Philosophy
EduTrace makes academic dishonesty practically impossible by recording the **DNA of a submission**:

*   **Continuous Keystroke DNA**: Every single keypress is recorded with millisecond precision. A simple copy-paste of an entire essay is instantly flagged.
*   **Time-Lapse Snapshots**: Periodic snapshots of the workspace ensure the work evolved naturally over time.
*   **Browser Focus Tracking**: Records whenever a student leaves the tab, providing a log of potential external searches or AI tool usage.
*   **Direct AI Interaction Logs**: If a student uses the built-in AI assistant, every prompt and response is logged and attached to their submission for the professor to review.

---

## 👨‍🏫 The Professor’s Power Suite
EduTrace gives educators god-mode visibility into how a student arrived at their final answer.

### 🔍 Total Visibility
- **Live Replay Player**: Watch the student’s work session in real-time. Rewind and fast-forward to see exactly how their thoughts took shape.
- **Keystroke Heatmap**: Instantly visualize which parts of the code or document were typed manually and which were pasted from external sources.
- **Chronological Evidence Trail**: A detailed log of all events, including "Tab Left," "Tab Entered," and "Mass Paste" detections.

### 🤖 "Ask the Analyst" (AI-Powered Auditing)
EduTrace uses advanced AI to act as an **Integrity Auditor**. Professors don't just see a score; they can have a conversation about the student's work:
*   **Automated Audits**: The AI analyzes the keystrokes, snapshots, and logs to provide a structured integrity report.
*   **Contextual Q&A**: Professors can ask the AI follow-up questions like: *"Why did you flag the second function as high-risk?"* or *"Does the student's interaction with the AI assistant explain the final output?"*

---

## 🧠 Flexible Intelligence
EduTrace is model-agnostic, integrating directly with multiple AI providers. You can toggle between the world's most powerful models:
*   **GPT-4o Mini** (OpenAI) for precision auditing.
*   **Claude Sonnet 4** (Anthropic) for nuanced writing analysis.
*   **Gemini 2.0 Flash** (Google) for rapid context processing.
*   **Llama 3.3 70B** (Groq) for fast open-source inference.
*   **OpenRouter** for additional model flexibility.

---

## 🛠️ Technical Architecture
EduTrace is built for speed, security, and ease of deployment.

*   **Backend**: High-performance FastAPI (Python).
*   **Frontend**: Professional-grade Vanilla JS SPA (No heavy frameworks, maximum speed).
*   **Database**: Encrypted-ready SQLite/PostgreSQL support via SQLAlchemy.
*   **AI Providers**: OpenAI, Anthropic, Google Gemini, Groq, OpenRouter.
*   **Integrations**: Monaco Editor (VS Code Core), Quill.js.

---

## 🚀 Deployment

### Quick Start
1. **Clone & Setup**:
   ```bash
   git clone https://github.com/Karthik-Mudenahalli-Ashoka/EduTrace-AI-Transparency.git
   cd EduTrace
   ```
2. **Launch**:
   Run the automated setup script which handles the virtual environment, dependencies, and database initialization.
   ```bash
   chmod +x backend/start.sh
   ./backend/start.sh
   ```
3. **Analyze**:
   Open `http://localhost:8000` and start auditing.

---
**EduTrace** — *Moving from detection to transparency.*
