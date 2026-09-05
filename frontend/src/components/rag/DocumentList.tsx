"use client";

import { FileText, LoaderCircle, Trash2 } from "lucide-react";
import type { RagDocument } from "@/lib/indexedDB";

interface DocumentListProps {
  documents: RagDocument[];
  processing: string | null;
  onDelete: (documentId: string) => void;
}

export function DocumentList({ documents, processing, onDelete }: DocumentListProps) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Uploaded notes</h2>
        <span className="text-[11px] text-neutral-500">{documents.length}</span>
      </div>
      {documents.length === 0 ? (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 text-xs leading-relaxed text-neutral-500">
          Upload text notes to enable grounded questions.
        </p>
      ) : (
        <div className="space-y-2">
          {documents.map((document) => (
            <div key={document.documentId} className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/70 p-2.5">
              <FileText className="h-4 w-4 shrink-0 text-emerald-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-neutral-200">{document.filename}</p>
                <p className="text-[10px] text-neutral-500">{document.chunkCount} chunks · {document.characterCount.toLocaleString()} characters</p>
              </div>
              {processing === document.documentId ? (
                <LoaderCircle className="h-4 w-4 animate-spin text-amber-400" />
              ) : (
                <button type="button" onClick={() => onDelete(document.documentId)} className="rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-red-400" title="Delete document">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
