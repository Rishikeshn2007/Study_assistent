"use client";

import { ChangeEvent, useRef } from "react";
import { FileUp } from "lucide-react";

interface DocumentUploaderProps {
  disabled: boolean;
  onUpload: (files: File[]) => void;
}

export function DocumentUploader({ disabled, onUpload }: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length) onUpload(files);
    event.target.value = "";
  };

  return (
    <div className="rounded-xl border border-dashed border-neutral-700 bg-neutral-900/70 p-4">
      <input ref={inputRef} type="file" accept=".txt,text/plain" multiple hidden onChange={handleChange} />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FileUp className="h-4 w-4" />
        {disabled ? "Processing notes..." : "Upload .txt notes"}
      </button>
      <p className="mt-2 text-center text-[11px] text-neutral-500">Notes stay in this browser and are separated by account.</p>
    </div>
  );
}
