import { EMBEDDING_DIMENSION, type RagChunk } from "./indexedDB";

export function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  validateEmbedding(vectorA);
  validateEmbedding(vectorB);
  if (vectorA.length !== vectorB.length) {
    throw new Error("Embedding vectors must have the same length.");
  }

  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  for (let index = 0; index < vectorA.length; index += 1) {
    dot += vectorA[index] * vectorB[index];
    magnitudeA += vectorA[index] ** 2;
    magnitudeB += vectorB[index] ** 2;
  }

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

export function validateEmbedding(vector: unknown): asserts vector is number[] {
  if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIMENSION) {
    throw new Error(`Embedding must be an array of ${EMBEDDING_DIMENSION} numbers.`);
  }
  if (vector.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    throw new Error("Embedding must contain only finite numbers.");
  }
}

export interface RankedChunk extends RagChunk {
  similarity: number;
}

export function rankChunks(
  queryEmbedding: number[],
  chunks: RagChunk[],
  topK = 5,
  minimumSimilarity = 0.15
): RankedChunk[] {
  validateEmbedding(queryEmbedding);
  return chunks
    .map((chunk) => ({
      ...chunk,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .filter((chunk) => chunk.similarity >= minimumSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
