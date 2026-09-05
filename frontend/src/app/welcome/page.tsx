"use client";

import React, { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { GeneralChat } from "@/components/GeneralChat";
import {
  Sparkles,
  Database,
  Lock,
  MessageSquare,
  ArrowRight,
  FileText,
  Search,
  Cpu,
  LogOut,
} from "lucide-react";

function WelcomeContent() {
  const { user, backendUser, logout, loading } = useAuth();
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
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-neutral-700/80 text-neutral-300 font-mono">
                Placeholder
              </span>
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

  // RAG Mode (Placeholder Only)
  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100">
      {/* Top navigation */}
      <header className="h-16 border-b border-neutral-800/80 px-6 flex items-center justify-between bg-neutral-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Study Assistant</h1>
            <p className="text-xs text-neutral-400">Mode Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedMode("general")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <span>Switch to General Mode</span>
          </button>

          <button
            onClick={() => logout()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/40 text-xs font-semibold transition-colors cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main RAG Placeholder Screen */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto text-center">
        <div className="relative inline-flex mb-6">
          <div className="w-20 h-20 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 shadow-2xl">
            <Database className="w-10 h-10 text-neutral-500" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/50 border border-amber-800/50 text-amber-400 text-xs font-semibold mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>Milestone 3 Feature • Non-Functional Placeholder</span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
          RAG Mode (Retrieval-Augmented Generation)
        </h2>

        <p className="text-sm sm:text-base text-neutral-400 max-w-xl mb-8 leading-relaxed">
          RAG Mode will enable you to upload lecture slides, PDF textbooks, research papers, and class notes, then query and summarize them with contextual AI citations.
        </p>

        {/* Feature Preview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mb-10 text-left">
          <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 space-y-2 opacity-75">
            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-indigo-400">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Document Ingestion</h3>
            <p className="text-xs text-neutral-400">Upload PDF, DOCX, and TXT files for semantic parsing.</p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 space-y-2 opacity-75">
            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-purple-400">
              <Search className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Vector Search</h3>
            <p className="text-xs text-neutral-400">Vector embeddings find precise passages relevant to exam questions.</p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 space-y-2 opacity-75">
            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-emerald-400">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Cited Answers</h3>
            <p className="text-xs text-neutral-400">Grounded AI answers with exact page numbers and reference quotes.</p>
          </div>
        </div>

        {/* CTA to return to General Mode */}
        <button
          onClick={() => setSelectedMode("general")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all cursor-pointer active:scale-95"
        >
          <span>Launch General Mode</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </main>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <ProtectedRoute>
      <WelcomeContent />
    </ProtectedRoute>
  );
}
