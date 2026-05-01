"""SQLAlchemy ORM models for EduTrace."""
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Enum, Float, Boolean
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from .database import Base


class UserRole(str, enum.Enum):
    STUDENT = "student"
    PROFESSOR = "professor"


class AssignmentType(str, enum.Enum):
    PYTHON = "python"
    DOCUMENT = "document"


class SubmissionStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REVIEWED = "reviewed"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    assignments_created = relationship("Assignment", back_populates="professor")
    submissions = relationship("Submission", back_populates="student")
    enrollments = relationship("Enrollment", foreign_keys="[Enrollment.student_id]", back_populates="student")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    professor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_name = Column(String(255), nullable=False)
    enrolled_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    student = relationship("User", foreign_keys=[student_id], back_populates="enrollments")
    professor = relationship("User", foreign_keys=[professor_id])


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String(20), nullable=False)  # python / document
    professor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    due_date = Column(DateTime, nullable=True)

    professor = relationship("User", back_populates="assignments_created")
    submissions = relationship("Submission", back_populates="assignment")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default="draft")
    final_content = Column(Text, default="")
    submitted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    grade = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)

    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("User", back_populates="submissions")
    keystroke_logs = relationship("KeystrokeLog", back_populates="submission", cascade="all, delete-orphan")
    ai_interactions = relationship("AIInteraction", back_populates="submission", cascade="all, delete-orphan")
    ai_summary = relationship("AIUsageSummary", back_populates="submission", uselist=False, cascade="all, delete-orphan")


class KeystrokeLog(Base):
    __tablename__ = "keystroke_logs"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    event_type = Column(String(50), nullable=False)  # type, paste, delete, snapshot
    content_delta = Column(Text, nullable=True)  # what was typed/pasted
    char_count = Column(Integer, default=0)
    editor_snapshot = Column(Text, nullable=True)  # periodic full snapshot

    submission = relationship("Submission", back_populates="keystroke_logs")


class AIInteraction(Base):
    __tablename__ = "ai_interactions"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    provider = Column(String(50), nullable=False)
    student_prompt = Column(Text, nullable=False)
    model_response = Column(Text, nullable=False)

    submission = relationship("Submission", back_populates="ai_interactions")


class AIUsageSummary(Base):
    __tablename__ = "ai_usage_summaries"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), unique=True, nullable=False)
    gemini_summary = Column(Text, nullable=True)
    ai_contribution_level = Column(String(20), nullable=True)  # low, medium, high
    generated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    submission = relationship("Submission", back_populates="ai_summary")
    chat_messages = relationship("SummaryChat", back_populates="summary", cascade="all, delete-orphan")


class SummaryChat(Base):
    __tablename__ = "summary_chats"

    id = Column(Integer, primary_key=True, index=True)
    summary_id = Column(Integer, ForeignKey("ai_usage_summaries.id"), nullable=False)
    role = Column(String(20), nullable=False)  # professor / ai
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    summary = relationship("AIUsageSummary", back_populates="chat_messages")
