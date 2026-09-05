import type { ChatHistoryTurn } from "./api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface RagSource {
  document_id: string;
  filename: string;
  chunk_id: string;
  chunk_index: number;
  similarity: number;
}

interface RagResponse {
  response: string;
  sources: RagSource[];
}

export async function sendRagChatMessage(
  idToken: string,
  question: string,
  context: string,
  sources: RagSource[],
  signal?: AbortSignal
): Promise<RagResponse> {
  const response = await fetch(`${API_BASE_URL}/api/rag/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ question, context, sources }),
    signal,
  });
  if (!response.ok) {
    let detail = "Failed to obtain a grounded response.";
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch {
      detail = `${response.status} ${response.statusText}`;
    }
    throw new Error(detail);
  }
  return (await response.json()) as RagResponse;
}

export type { ChatHistoryTurn };
