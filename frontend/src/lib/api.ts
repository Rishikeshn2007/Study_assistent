export interface BackendUserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  email_verified: boolean | null;
}

export interface ChatHistoryTurn {
  role: "user" | "assistant";
  content: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

/**
 * Check health of FastAPI backend server
 */
export async function checkBackendHealth(): Promise<{ status: string; service: string }> {
  const response = await fetch(`${API_BASE_URL}/api/health`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Backend health check returned ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Send Firebase ID token to FastAPI backend for verification
 */
export async function verifyTokenWithBackend(idToken: string): Promise<BackendUserProfile> {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
    },
    body: JSON.stringify({ token: idToken }),
  });

  if (!response.ok) {
    let errorDetail = "Failed to verify ID token with backend.";
    try {
      const errJson = await response.json();
      if (errJson && errJson.detail) {
        errorDetail = errJson.detail;
      }
    } catch {
      errorDetail = `${response.status} ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

/**
 * Send user prompt & history to FastAPI backend for Qwen LLM generation.
 * Uses AbortController to enforce a 90-second hard timeout.
 */
export async function sendGeneralChatMessage(
  idToken: string,
  prompt: string,
  history: ChatHistoryTurn[] = []
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 90_000); // 90-second hard timeout

  try {
    console.log("[API] POST /api/chat/general →", API_BASE_URL);
    const response = await fetch(`${API_BASE_URL}/api/chat/general`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify({ prompt, history }),
      signal: controller.signal,
    });
    console.log("[API] Response status:", response.status);

    if (!response.ok) {
      let errorDetail = "Failed to obtain AI response.";
      try {
        const errJson = await response.json();
        if (errJson && errJson.detail) {
          errorDetail = errJson.detail;
        }
      } catch {
        errorDetail = `${response.status} ${response.statusText}`;
      }
      throw new Error(errorDetail);
    }

    const data = await response.json();
    return data.response;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out after 90 seconds. The backend may be busy — please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
