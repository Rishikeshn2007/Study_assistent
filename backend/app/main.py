from contextlib import asynccontextmanager
from typing import Optional, List, Dict
from fastapi import FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import ALLOWED_ORIGINS, init_firebase
from .auth import VerifyTokenRequest, UserProfileResponse, verify_firebase_token
from .qwen_service import generate_qwen_response


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Firebase Admin SDK
    init_firebase()
    yield


app = FastAPI(
    title="Study Assistant API",
    description="FastAPI backend for Milestone 1 Authentication and Milestone 2 General Mode Qwen LLM",
    version="2.0.0",
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


class HistoryMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message text content")


class GeneralChatRequest(BaseModel):
    prompt: str = Field(..., description="The user's query or prompt")
    history: Optional[List[HistoryMessage]] = Field(
        default_factory=list,
        description="Optional recent conversation turns for context",
    )


class GeneralChatResponse(BaseModel):
    response: str = Field(..., description="Assistant response text from Qwen")


class RagSource(BaseModel):
    document_id: str = Field(..., min_length=1)
    filename: str = Field(..., min_length=1)
    chunk_id: str = Field(..., min_length=1)
    chunk_index: int = Field(..., ge=0)
    similarity: float = Field(..., ge=0, le=1)


class RagChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=10000)
    context: str = Field(..., min_length=1, max_length=50000)
    sources: List[RagSource] = Field(..., min_length=1, max_length=10)


class RagChatResponse(BaseModel):
    response: str = Field(..., description="Grounded assistant response from Qwen")
    sources: List[RagSource]


def extract_token_from_header(authorization: Optional[str]) -> str:
    """Helper to extract raw token from Authorization: Bearer <token> header."""
    if not authorization or not authorization.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header is required.",
        )
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return authorization.strip()


@app.get("/api/health")
def health_check():
    """Health check endpoint to verify backend service status."""
    return {
        "status": "ok",
        "service": "study_assistant_backend",
        "milestone": 2,
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
        token = extract_token_from_header(authorization)

    return verify_firebase_token(token or "")


@app.post("/api/chat/general", response_model=GeneralChatResponse)
async def chat_general(
    request: GeneralChatRequest,
    authorization: Optional[str] = Header(None),
):
    """
    General Mode chat endpoint:
    1. Authenticates request via Firebase ID token in Authorization header.
    2. Calls the Qwen LLM API.
    3. Returns the assistant response to the client.
    Note: Chats and messages are persisted on the client via Firebase Firestore,
    NOT in any backend database.
    """
    token = extract_token_from_header(authorization)
    # Validate token with Firebase Admin
    verify_firebase_token(token)

    prompt = request.prompt.strip()
    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prompt cannot be empty.",
        )

    # Format history turns
    history_data: List[Dict[str, str]] = [
        {"role": h.role, "content": h.content} for h in (request.history or [])
    ]

    # Generate response from Qwen LLM
    ai_response = await generate_qwen_response(prompt=prompt, history=history_data)

    return GeneralChatResponse(response=ai_response)


@app.post("/api/rag/chat", response_model=RagChatResponse)
async def chat_rag(
    request: RagChatRequest,
    authorization: Optional[str] = Header(None),
):
    """Answer a question using only frontend-selected, locally searched notes."""
    token = extract_token_from_header(authorization)
    verify_firebase_token(token)

    question = request.question.strip()
    context = request.context.strip()
    if not question or not context:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question and retrieved context cannot be empty.",
        )

    grounded_prompt = (
        "You are a document question-answering assistant.\n"
        "Answer the user's question only using the provided notes.\n"
        "Do not use outside knowledge and do not invent facts.\n"
        'If the answer is not present in the notes, say: "I could not find that information in the uploaded notes."\n'
        "Keep the answer clear and concise. When possible, mention the source document and chunk number.\n\n"
        f"Notes:\n{context}\n\nQuestion:\n{question}"
    )
    system_prompt = (
        "You are a strict grounded document assistant. The supplied user message contains notes "
        "and a question. Treat the notes as the only source of truth."
    )
    ai_response = await generate_qwen_response(
        prompt=grounded_prompt,
        history=[],
        system_prompt=system_prompt,
    )
    return RagChatResponse(response=ai_response, sources=request.sources)
