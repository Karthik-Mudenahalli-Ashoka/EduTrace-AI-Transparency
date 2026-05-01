"""EduTrace - AI Usage Transparency Platform for Academic Assignments."""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .database import engine, Base
from .routes import router as auth_router
from .routes.assignments import router as assignments_router
from .routes.submissions import router as submissions_router

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="EduTrace API",
    description="AI Usage Transparency Platform for Academic Assignments",
    version="1.0.0",
)

# CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth_router)
app.include_router(assignments_router)
app.include_router(submissions_router)


@app.get("/api")
def api_root():
    return {"message": "EduTrace API is running", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}


# Serve static frontend
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve the SPA frontend for all non-API routes."""
        file_path = os.path.join(STATIC_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
