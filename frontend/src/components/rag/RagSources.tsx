"use client";

import { BookOpen } from "lucide-react";
import type { RagSource } from "@/lib/ragApi";

export function RagSources({ sources }: { sources: RagSource[] }) {
  if (!sources.length) return null;
  return (
    <div className="mt-3 border-t border-neutral-800 pt-2">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
        <BookOpen className="h-3 w-3" /> Sources
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((source) => (
          <span key={source.chunk_id} className="rounded-md border border-neutral-700 bg-neutral-950/60 px-2 py-1 text-[10px] text-neutral-400" title={`Similarity ${(source.similarity * 100).toFixed(1)}%`}>
            {source.filename} · chunk {source.chunk_index + 1}
          </span>
        ))}
      </div>
    </div>
  );
}
