"""API routes for assignments and enrollments."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import User, Assignment, Enrollment, Submission
from ..schemas import (
    AssignmentCreate, AssignmentResponse,
    EnrollmentCreate, EnrollmentResponse,
)
from ..auth import get_current_user

router = APIRouter(prefix="/api", tags=["assignments"])


# ── Enrollments ───────────────────────────────────────
@router.post("/enrollments", response_model=EnrollmentResponse)
def enroll_student(
    data: EnrollmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Student enrolls with a professor."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can enroll")

    professor = db.query(User).filter(User.id == data.professor_id, User.role == "professor").first()
    if not professor:
        raise HTTPException(status_code=404, detail="Professor not found")

    existing = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.professor_id == data.professor_id,
        Enrollment.course_name == data.course_name,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled")

    enrollment = Enrollment(
        student_id=current_user.id,
        professor_id=data.professor_id,
        course_name=data.course_name,
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)

    resp = EnrollmentResponse.model_validate(enrollment)
    resp.professor_name = professor.name
    resp.student_name = current_user.name
    return resp


@router.get("/enrollments", response_model=List[EnrollmentResponse])
def get_enrollments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get enrollments for current user."""
    if current_user.role == "student":
        enrollments = db.query(Enrollment).filter(Enrollment.student_id == current_user.id).all()
    else:
        enrollments = db.query(Enrollment).filter(Enrollment.professor_id == current_user.id).all()

    result = []
    for e in enrollments:
        resp = EnrollmentResponse.model_validate(e)
        resp.professor_name = e.professor.name
        resp.student_name = e.student.name
        result.append(resp)
    return result


# ── Assignments ───────────────────────────────────────
@router.post("/assignments", response_model=AssignmentResponse)
def create_assignment(
    data: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Professor creates an assignment."""
    if current_user.role != "professor":
        raise HTTPException(status_code=403, detail="Only professors can create assignments")

    assignment = Assignment(
        title=data.title,
        description=data.description,
        type=data.type,
        professor_id=current_user.id,
        course_name=data.course_name,
        due_date=data.due_date,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    resp = AssignmentResponse.model_validate(assignment)
    resp.professor_name = current_user.name
    return resp


@router.get("/assignments", response_model=List[AssignmentResponse])
def get_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get assignments. Students see assignments from enrolled professors."""
    if current_user.role == "professor":
        assignments = db.query(Assignment).filter(Assignment.professor_id == current_user.id).all()
    else:
        # Student: get assignments from enrolled professors
        enrolled_prof_ids = [
            e.professor_id for e in
            db.query(Enrollment).filter(Enrollment.student_id == current_user.id).all()
        ]
        assignments = db.query(Assignment).filter(Assignment.professor_id.in_(enrolled_prof_ids)).all()

    result = []
    for a in assignments:
        resp = AssignmentResponse.model_validate(a)
        resp.professor_name = a.professor.name
        result.append(resp)
    return result


@router.get("/assignments/{assignment_id}", response_model=AssignmentResponse)
def get_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single assignment."""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    resp = AssignmentResponse.model_validate(assignment)
    resp.professor_name = assignment.professor.name
    return resp

@router.delete("/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Professor deletes an assignment."""
    if current_user.role != "professor":
        raise HTTPException(status_code=403, detail="Only professors can delete assignments")

    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.professor_id == current_user.id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    db.delete(assignment)
    db.commit()
    return None
