import httpx
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status

from .config import QWEN_API_KEY, QWEN_API_BASE, QWEN_MODEL

SYSTEM_PROMPT = (
    "You are an expert, encouraging, and clear AI Study Assistant. "
    "Your goal is to help students comprehend concepts deeply, solve academic and technical problems step-by-step, "
    "format code cleanly with appropriate language tags, and provide structured, insightful answers."
)

# Detect if we are using OpenRouter (requires extra headers)
def _is_openrouter() -> bool:
    return "openrouter.ai" in QWEN_API_BASE.lower()


async def generate_qwen_response(
    prompt: str,
    history: Optional[List[Dict[str, str]]] = None,
) -> str:
    """
    Calls the Qwen LLM API via OpenAI-compatible endpoint.
    Supports:
    - Alibaba Cloud DashScope (dashscope-intl.aliyuncs.com / dashscope.aliyuncs.com)
    - OpenRouter (openrouter.ai/api/v1)
    - Groq (api.groq.com/openai/v1)
    Accepts the current user prompt and optional conversation history turns.
    Returns the assistant's generated response text.
    """
    if not QWEN_API_KEY or not QWEN_API_KEY.strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "LLM API key is not configured on the server. "
                "Please add QWEN_API_KEY to backend/.env to enable AI responses."
            ),
        )

    # Build messages array for chat completion
    messages: List[Dict[str, str]] = [
        {"role": "system", "content": SYSTEM_PROMPT}
    ]

    # Append valid history turns if provided
    if history:
        for turn in history:
            role = turn.get("role")
            content = turn.get("content")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})

    # Append current user prompt
    messages.append({"role": "user", "content": prompt})

    endpoint = f"{QWEN_API_BASE}/chat/completions"

    # Base headers
    headers: Dict[str, str] = {
        "Authorization": f"Bearer {QWEN_API_KEY}",
        "Content-Type": "application/json",
    }

    # OpenRouter requires HTTP-Referer and X-Title for identification
    if _is_openrouter():
        headers["HTTP-Referer"] = "http://localhost:3000"
        headers["X-Title"] = "Study Assistant"

    payload: Dict[str, Any] = {
        "model": QWEN_MODEL,
        "messages": messages,
        "temperature": 0.7,
    }

    print(f"[LLM] Calling {endpoint} with model={QWEN_MODEL}")

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(endpoint, json=payload, headers=headers)

        print(f"[LLM] Response status: {response.status_code}")

        if response.status_code != 200:
            error_text = response.text
            try:
                err_data = response.json()
                # Handle OpenRouter and standard OpenAI error formats
                error_text = (
                    err_data.get("message")
                    or err_data.get("error", {}).get("message")
                    or error_text
                )
            except Exception:
                pass

            print(f"[LLM] Error response body: {response.text[:500]}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"LLM API error ({response.status_code}): {error_text}",
            )

        data = response.json()
        choices = data.get("choices", [])
        if not choices:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Empty response returned from LLM (no choices in response).",
            )

        assistant_content = choices[0].get("message", {}).get("content", "")
        if not assistant_content:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="LLM returned an empty message content.",
            )

        print(f"[LLM] Response received ({len(assistant_content)} chars)")
        return assistant_content

    except HTTPException:
        raise  # re-raise without wrapping
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=(
                "The AI service timed out while generating a response. "
                "The model may be busy. Please try again."
            ),
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Network error communicating with AI service: {str(exc)}",
        )
