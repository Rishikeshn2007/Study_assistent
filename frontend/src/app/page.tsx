"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default function LandingPage() {
  const { user, loading, error, clearError } = useAuth();
  const router = useRouter();

  // If already authenticated, redirect to /welcome
  useEffect(() => {
    if (!loading && user) {
      router.replace("/welcome");
    }
  }, [user, loading, router]);

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-6 py-12 overflow-hidden bg-neutral-950 text-neutral-100">
      {/* Decorative ambient background glows */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/20 to-blue-500/10 blur-[130px] rounded-full pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-10 right-1/4 w-[350px] h-[250px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center text-center">
        {/* Milestone badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900/90 border border-neutral-800 text-xs font-medium text-neutral-300 shadow-inner mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Milestone 1 • Google OAuth Flow</span>
        </div>

        {/* Application Name */}
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
          Study{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Assistant
          </span>
        </h1>

        {/* Welcome Message */}
        <p className="text-base sm:text-lg text-neutral-400 font-normal leading-relaxed mb-10 max-w-sm">
          Welcome to your AI learning companion. Sign in with your Google account to get started.
        </p>

        {/* Error message alert if any */}
        {error && (
          <div className="w-full mb-6 p-4 rounded-xl bg-red-950/50 border border-red-800/60 text-red-200 text-sm text-left flex items-start justify-between gap-3 animate-fade-in">
            <div className="flex items-start gap-2.5">
              <svg
                className="w-5 h-5 text-red-400 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="font-semibold text-red-300">Sign-in Notice</p>
                <p className="text-xs text-red-300/90 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              onClick={clearError}
              className="text-neutral-400 hover:text-white text-xs p-1"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {/* Auth Action Card */}
        <div className="w-full p-8 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 backdrop-blur-xl shadow-2xl flex flex-col items-center">
          <div className="w-full">
            <GoogleSignInButton className="w-full" />
          </div>

          <p className="mt-5 text-xs text-neutral-500 text-center leading-relaxed">
            By continuing, you authenticate securely through Firebase Authentication and our FastAPI server.
          </p>
        </div>

        {/* Footer info */}
        <footer className="mt-12 text-xs text-neutral-600">
          FastAPI &amp; Next.js • Firebase Auth Integration
        </footer>
      </div>
    </main>
  );
}
