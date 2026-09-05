from contextlib import asynccontextmanager
from fastapi import FastAPI, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from .config import ALLOWED_ORIGINS, init_firebase
from .auth import VerifyTokenRequest, UserProfileResponse, verify_firebase_token


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Firebase Admin SDK
    init_firebase()
    yield


app = FastAPI(
    title="Study Assistant - Auth API",
    description="Minimal FastAPI backend for Milestone 1 Firebase Google Authentication",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS so Next.js frontend can make requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    """Health check endpoint to verify backend service status."""
    return {
        "status": "ok",
        "service": "study_assistant_auth",
    }


@app.post("/api/auth/verify", response_model=UserProfileResponse)
def verify_token(
    request_data: Optional[VerifyTokenRequest] = None,
    authorization: Optional[str] = Header(None),
):
    """
    Verifies Firebase ID token sent either via JSON body ({ "token": "..." })
    or via HTTP Authorization header (Bearer <token>).
    Returns basic authenticated user information.
    """
    token = None
    if request_data and request_data.token:
        token = request_data.token.strip()
    elif authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1].strip()
        else:
            token = authorization.strip()

    return verify_firebase_token(token or "")
