"""Seed script to populate the database with demo data."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, SessionLocal, Base
from app.models import User, Assignment, Enrollment
from app.auth import hash_password
from datetime import datetime, timezone, timedelta

# Create tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Check if already seeded
if db.query(User).first():
    print("Database already seeded. Skipping.")
    db.close()
    sys.exit(0)

# Create professors
prof1 = User(
    name="Dr. Sarah Mitchell",
    email="sarah@university.edu",
    password_hash=hash_password("password123"),
    role="professor",
)
prof2 = User(
    name="Prof. James Chen",
    email="james@university.edu",
    password_hash=hash_password("password123"),
    role="professor",
)

# Create students
student1 = User(
    name="Alex Johnson",
    email="alex@student.edu",
    password_hash=hash_password("password123"),
    role="student",
)
student2 = User(
    name="Maya Patel",
    email="maya@student.edu",
    password_hash=hash_password("password123"),
    role="student",
)
student3 = User(
    name="Ryan Kim",
    email="ryan@student.edu",
    password_hash=hash_password("password123"),
    role="student",
)

db.add_all([prof1, prof2, student1, student2, student3])
db.commit()

# Enrollments
enrollments = [
    Enrollment(student_id=student1.id, professor_id=prof1.id, course_name="CS 301 - Data Structures"),
    Enrollment(student_id=student2.id, professor_id=prof1.id, course_name="CS 301 - Data Structures"),
    Enrollment(student_id=student3.id, professor_id=prof1.id, course_name="CS 301 - Data Structures"),
    Enrollment(student_id=student1.id, professor_id=prof2.id, course_name="CS 401 - Machine Learning"),
    Enrollment(student_id=student2.id, professor_id=prof2.id, course_name="CS 401 - Machine Learning"),
]
db.add_all(enrollments)
db.commit()

# Assignments
assignments = [
    Assignment(
        title="Binary Search Tree Implementation",
        description="Implement a BST with insert, delete, and search operations in Python. Include time complexity analysis.",
        type="python",
        professor_id=prof1.id,
        course_name="CS 301 - Data Structures",
        due_date=datetime.now(timezone.utc) + timedelta(days=7),
    ),
    Assignment(
        title="Data Structures Comparison Report",
        description="Write a 1500-word report comparing arrays, linked lists, and hash tables. Include real-world use cases.",
        type="document",
        professor_id=prof1.id,
        course_name="CS 301 - Data Structures",
        due_date=datetime.now(timezone.utc) + timedelta(days=14),
    ),
    Assignment(
        title="Linear Regression from Scratch",
        description="Implement linear regression using only NumPy. Demonstrate on a sample dataset.",
        type="python",
        professor_id=prof2.id,
        course_name="CS 401 - Machine Learning",
        due_date=datetime.now(timezone.utc) + timedelta(days=10),
    ),
]
db.add_all(assignments)
db.commit()

print("✅ Database seeded successfully!")
print(f"   Professors: {prof1.email}, {prof2.email}")
print(f"   Students: {student1.email}, {student2.email}, {student3.email}")
print(f"   Password for all: password123")
print(f"   Assignments: {len(assignments)}")

db.close()
