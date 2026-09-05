import { EMBEDDING_DIMENSION } from "./indexedDB";
import { validateEmbedding } from "./vectorSearch";

const EMBEDDING_API_BASE_URL = (
  process.env.NEXT_PUBLIC_EMBEDDING_API_BASE_URL || "http://localhost:8001"
).replace(/\/$/, "");

interface EmbeddedChunkResponse {
  chunk_id: string;
  chunk_index: number;
  text: string;
  embedding: number[];
}

export interface EmbeddedDocumentResponse {
  document_id: string;
  filename: string;
  chunk_count: number;
  chunks: EmbeddedChunkResponse[];
  embedding_model?: string;
  embedding_dimension?: number;
}

function validateDocumentResponse(value: unknown): EmbeddedDocumentResponse {
  if (!value || typeof value !== "object") throw new Error("Embedding backend returned invalid JSON.");
  const document = value as Partial<EmbeddedDocumentResponse>;
  if (
    typeof document.document_id !== "string" ||
    typeof document.filename !== "string" ||
    !Array.isArray(document.chunks)
  ) {
    throw new Error("Embedding backend response is missing document fields.");
  }
  const chunks = document.chunks.map((chunk) => {
    if (
      !chunk ||
      typeof chunk.chunk_id !== "string" ||
      typeof chunk.chunk_index !== "number" ||
      typeof chunk.text !== "string"
    ) {
      throw new Error("Embedding backend response contains an invalid chunk.");
    }
    validateEmbedding(chunk.embedding);
    return chunk;
  });
  return {
    document_id: document.document_id,
    filename: document.filename,
    chunk_count: chunks.length,
    chunks,
    embedding_model: document.embedding_model,
    embedding_dimension: document.embedding_dimension ?? EMBEDDING_DIMENSION,
  };
}

export async function embedDocuments(files: File[], signal?: AbortSignal): Promise<EmbeddedDocumentResponse[]> {
  if (!files.length) throw new Error("Choose at least one .txt file.");
  if (files.some((file) => !file.name.toLowerCase().endsWith(".txt"))) {
    throw new Error("Only .txt files are supported.");
  }

  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const response = await fetch(`${EMBEDDING_API_BASE_URL}/api/embed-documents`, {
    method: "POST",
    body: formData,
    signal,
  });
  if (!response.ok) throw new Error(`Document embedding failed (${response.status}).`);
  const data: unknown = await response.json();
  const documents = Array.isArray(data)
    ? data
    : (data as { documents?: unknown })?.documents || [data];
  if (!Array.isArray(documents)) throw new Error("Embedding backend returned no documents.");

  // Accept either one grouped record per document or the flat chunk records
  // described by the embedding backend contract.
  if (documents.every((item) => item && typeof item === "object" && Array.isArray((item as { chunks?: unknown }).chunks))) {
    return documents.map(validateDocumentResponse);
  }
  const grouped = new Map<string, EmbeddedDocumentResponse>();
  for (const item of documents) {
    const chunk = item as EmbeddedChunkResponse & {
      document_id?: string;
      filename?: string;
      chunk_count?: number;
      embedding_model?: string;
      embedding_dimension?: number;
    };
    if (!chunk.document_id || !chunk.filename) throw new Error("Embedding backend response is missing document metadata.");
    validateEmbedding(chunk.embedding);
    const existing = grouped.get(chunk.document_id) || {
      document_id: chunk.document_id,
      filename: chunk.filename,
      chunk_count: chunk.chunk_count || 0,
      chunks: [],
      embedding_model: chunk.embedding_model,
      embedding_dimension: chunk.embedding_dimension || EMBEDDING_DIMENSION,
    };
    existing.chunks.push({ chunk_id: chunk.chunk_id, chunk_index: chunk.chunk_index, text: chunk.text, embedding: chunk.embedding });
    existing.chunk_count = existing.chunks.length;
    grouped.set(chunk.document_id, existing);
  }
  return Array.from(grouped.values());
}

export async function embedQuery(query: string, signal?: AbortSignal): Promise<number[]> {
  const response = await fetch(`${EMBEDDING_API_BASE_URL}/api/embed-query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    signal,
  });
  if (!response.ok) throw new Error(`Query embedding failed (${response.status}).`);
  const data: unknown = await response.json();
  const embedding = Array.isArray(data) ? data : (data as { embedding?: unknown }).embedding;
  validateEmbedding(embedding);
  return embedding;
}
