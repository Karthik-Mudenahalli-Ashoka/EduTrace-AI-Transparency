"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ── Auth ──────────────────────────────────────────────
class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str  # "student" or "professor"


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Enrollment ────────────────────────────────────────
class EnrollmentCreate(BaseModel):
    professor_id: int
    course_name: str


class EnrollmentResponse(BaseModel):
    id: int
    student_id: int
    professor_id: int
    course_name: str
    professor_name: Optional[str] = None
    student_name: Optional[str] = None

    class Config:
        from_attributes = True


# ── Assignment ────────────────────────────────────────
class AssignmentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    type: str  # "python" or "document"
    course_name: str
    due_date: Optional[datetime] = None


class AssignmentResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    type: str
    professor_id: int
    course_name: str
    created_at: datetime
    due_date: Optional[datetime] = None
    professor_name: Optional[str] = None

    class Config:
        from_attributes = True


# ── Submission ────────────────────────────────────────
class SubmissionCreate(BaseModel):
    assignment_id: int


class SubmissionUpdate(BaseModel):
    final_content: Optional[str] = None
    status: Optional[str] = None
    grade: Optional[float] = None
    feedback: Optional[str] = None


class SubmissionResponse(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    status: str
    final_content: Optional[str] = None
    submitted_at: Optional[datetime] = None
    created_at: datetime
    student_name: Optional[str] = None
    assignment_title: Optional[str] = None
    assignment_type: Optional[str] = None
    course_name: Optional[str] = None
    grade: Optional[float] = None
    feedback: Optional[str] = None

    class Config:
        from_attributes = True


# ── Keystroke Logs ────────────────────────────────────
class KeystrokeLogCreate(BaseModel):
    submission_id: int
    event_type: str  # type, paste, delete, snapshot
    content_delta: Optional[str] = None
    char_count: int = 0
    editor_snapshot: Optional[str] = None


class KeystrokeLogBatch(BaseModel):
    logs: List[KeystrokeLogCreate]


class KeystrokeLogResponse(BaseModel):
    id: int
    submission_id: int
    timestamp: datetime
    event_type: str
    content_delta: Optional[str] = None
    char_count: int
    editor_snapshot: Optional[str] = None

    class Config:
        from_attributes = True


# ── AI Interaction ────────────────────────────────────
class AIInteractionCreate(BaseModel):
    submission_id: int
    provider: str
    student_prompt: str
    api_key: str  # not stored, used for the request only


class AIInteractionResponse(BaseModel):
    id: int
    submission_id: int
    timestamp: datetime
    provider: str
    student_prompt: str
    model_response: str

    class Config:
        from_attributes = True


# ── AI Summary ────────────────────────────────────────
class AISummaryCreate(BaseModel):
    api_key: str

class AISummaryResponse(BaseModel):
    id: int
    submission_id: int
    gemini_summary: Optional[str] = None
    ai_contribution_level: Optional[str] = None
    generated_at: datetime

    class Config:
        from_attributes = True


# ── Summary Chat ──────────────────────────────────────
class SummaryChatCreate(BaseModel):
    summary_id: int
    message: str
    api_key: str


class SummaryChatResponse(BaseModel):
    id: int
    summary_id: int
    role: str
    message: str
    timestamp: datetime

    class Config:
        from_attributes = True


# ── Code Execution ────────────────────────────────────
class CodeExecutionRequest(BaseModel):
    code: str
    submission_id: Optional[int] = None


class CodeExecutionResponse(BaseModel):
    stdout: str
    stderr: str
    return_code: int
