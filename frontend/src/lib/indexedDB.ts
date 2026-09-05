export const RAG_DB_NAME = "rag-vector-store";
export const RAG_DB_VERSION = 1;
export const EMBEDDING_DIMENSION = 384;

export interface RagDocument {
  documentId: string;
  userId: string;
  filename: string;
  characterCount: number;
  chunkCount: number;
  embeddingModel: string;
  embeddingDimension: number;
  createdAt: number;
}

export interface RagChunk {
  chunkId: string;
  userId: string;
  documentId: string;
  filename: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
  createdAt: number;
}

function getDatabase(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.reject(new Error("IndexedDB is not available in this browser."));
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(RAG_DB_NAME, RAG_DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Unable to open IndexedDB."));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const database = request.result;
      const documents = database.objectStoreNames.contains("documents")
        ? request.transaction!.objectStore("documents")
        : database.createObjectStore("documents", { keyPath: "documentId" });
      const chunks = database.objectStoreNames.contains("chunks")
        ? request.transaction!.objectStore("chunks")
        : database.createObjectStore("chunks", { keyPath: "chunkId" });

      if (!documents.indexNames.contains("userId")) documents.createIndex("userId", "userId");
      if (!chunks.indexNames.contains("userId")) chunks.createIndex("userId", "userId");
      if (!chunks.indexNames.contains("documentId")) chunks.createIndex("documentId", "documentId");
      if (!chunks.indexNames.contains("userId_documentId")) {
        chunks.createIndex("userId_documentId", ["userId", "documentId"]);
      }
      if (!database.objectStoreNames.contains("settings")) {
        database.createObjectStore("settings", { keyPath: "key" });
      }
    };
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

export async function saveDocument(document: RagDocument): Promise<void> {
  const database = await getDatabase();
  const transaction = database.transaction("documents", "readwrite");
  transaction.objectStore("documents").put(document);
  await transactionDone(transaction);
  database.close();
}

export async function saveChunks(chunks: RagChunk[]): Promise<void> {
  if (!chunks.length) return;
  const database = await getDatabase();
  const transaction = database.transaction("chunks", "readwrite");
  const store = transaction.objectStore("chunks");
  chunks.forEach((chunk) => store.put(chunk));
  await transactionDone(transaction);
  database.close();
}

export async function getDocuments(userId: string): Promise<RagDocument[]> {
  const database = await getDatabase();
  const index = database.transaction("documents", "readonly").objectStore("documents").index("userId");
  const documents = await requestResult(index.getAll(IDBKeyRange.only(userId)));
  database.close();
  return documents.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getChunks(userId: string): Promise<RagChunk[]> {
  const database = await getDatabase();
  const index = database.transaction("chunks", "readonly").objectStore("chunks").index("userId");
  const chunks = await requestResult(index.getAll(IDBKeyRange.only(userId)));
  database.close();
  return chunks;
}

export async function deleteDocument(documentId: string): Promise<void> {
  const database = await getDatabase();
  const transaction = database.transaction(["documents", "chunks"], "readwrite");
  transaction.objectStore("documents").delete(documentId);
  const chunkIndex = transaction.objectStore("chunks").index("documentId");
  const request = chunkIndex.openCursor(IDBKeyRange.only(documentId));
  request.onsuccess = () => {
    const cursor = request.result;
    if (cursor) {
      cursor.delete();
      cursor.continue();
    }
  };
  await transactionDone(transaction);
  database.close();
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}
