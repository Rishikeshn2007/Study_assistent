"use client";

import React, { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { GeneralChat } from "@/components/GeneralChat";
import { RagChat } from "@/components/rag/RagChat";
import {
  Database,
  MessageSquare,
} from "lucide-react";

function WelcomeContent() {
  const { user, backendUser } = useAuth();
  const [selectedMode, setSelectedMode] = useState<"general" | "rag">("general");

  const displayName = backendUser?.name || user?.displayName || "Student";

  // If user is in General Mode, show full ChatGPT-style General Mode interface with quick mode toggle
  if (selectedMode === "general") {
    return (
      <div className="relative h-screen w-full flex flex-col">
        {/* Sub-header Mode Selector bar */}
        <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-1.5 flex items-center justify-between text-xs shrink-0 z-20">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-neutral-400 hidden sm:inline">Active Mode:</span>
            <button
              onClick={() => setSelectedMode("general")}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 text-white font-medium shadow-xs cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>General Mode</span>
            </button>
            <button
              onClick={() => setSelectedMode("rag")}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-700/50 cursor-pointer transition-colors"
            >
              <Database className="w-3.5 h-3.5" />
              <span>RAG Mode</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-neutral-400 hidden md:inline text-[11px]">
              Signed in as <strong className="text-neutral-200 font-medium">{displayName}</strong>
            </span>
          </div>
        </div>

        {/* General Mode ChatGPT Workspace */}
        <div className="flex-1 min-h-0">
          <GeneralChat />
        </div>
      </div>
    );
  }

  return <RagChat onSwitchToGeneral={() => setSelectedMode("general")} />;
}

export default function WelcomePage() {
  return (
    <ProtectedRoute>
      <WelcomeContent />
    </ProtectedRoute>
  );
}
