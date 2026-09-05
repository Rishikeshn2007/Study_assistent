export interface BackendUserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  email_verified: boolean | null;
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
      // Fallback to generic status text
      errorDetail = `${response.status} ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}
