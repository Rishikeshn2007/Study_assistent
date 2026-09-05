"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";

function WelcomeContent() {
  const { user, backendUser, logout, loading } = useAuth();
  const [imageError, setImageError] = useState(false);

  // Preferred display values prioritizing FastAPI backend verification, falling back to Firebase client user
  const displayName = backendUser?.name || user?.displayName || "Authenticated User";
  const displayEmail = backendUser?.email || user?.email || "No email provided";
  const displayPhoto = backendUser?.picture || user?.photoURL;
  const displayUid = backendUser?.uid || user?.uid || "";

  // Initial for avatar fallback
  const fallbackInitial = (displayName || "U").charAt(0).toUpperCase();

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-6 py-12 overflow-hidden bg-neutral-950 text-neutral-100">
      {/* Decorative ambient background glows */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-gradient-to-br from-indigo-600/20 via-purple-600/15 to-emerald-600/10 blur-[130px] rounded-full pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col items-center">
        {/* Top greeting badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-xs font-semibold text-emerald-400 shadow-inner mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Authenticated Successfully</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 text-center">
          Welcome to Study Assistant
        </h1>
        <p className="text-sm sm:text-base text-neutral-400 mb-8 text-center">
          Your Google authentication was verified by FastAPI.
        </p>

        {/* Profile Card */}
        <div className="w-full p-8 rounded-2xl bg-neutral-900/70 border border-neutral-800 backdrop-blur-xl shadow-2xl flex flex-col items-center">
          {/* User Profile Avatar */}
          <div className="relative mb-5 group">
            <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-lg">
              <div className="w-full h-full rounded-full overflow-hidden bg-neutral-900 flex items-center justify-center">
                {displayPhoto && !imageError ? (
                  <Image
                    src={displayPhoto}
                    alt={displayName}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover rounded-full"
                    onError={() => setImageError(true)}
                    priority
                    unoptimized
                  />
                ) : (
                  <span className="text-3xl font-bold text-white">
                    {fallbackInitial}
                  </span>
                )}
              </div>
            </div>
            <div
              className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-neutral-900 flex items-center justify-center text-[10px] text-white"
              title="Active session"
            >
              ✓
            </div>
          </div>

          {/* User Name & Email */}
          <h2 className="text-2xl font-bold text-white text-center mb-1">
            {displayName}
          </h2>
          <p className="text-sm font-medium text-neutral-400 text-center mb-6">
            {displayEmail}
          </p>

          {/* Metadata pill container */}
          <div className="w-full bg-neutral-950/60 rounded-xl border border-neutral-800/80 p-4 mb-8 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Auth Provider:</span>
              <span className="font-semibold text-neutral-200 inline-flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    fill="#EA4335"
                  />
                </svg>
                Google OAuth 2.0
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Backend Status:</span>
              <span className="text-emerald-400 font-medium">FastAPI Verified</span>
            </div>
            {displayUid && (
              <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60">
                <span className="text-neutral-500">User ID:</span>
                <span className="font-mono text-[11px] text-neutral-400 truncate max-w-[200px]" title={displayUid}>
                  {displayUid}
                </span>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            type="button"
            id="logout-btn"
            onClick={() => logout()}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-red-600/90 hover:bg-red-500 active:scale-[0.98] rounded-xl shadow-md hover:shadow-red-600/20 transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>{loading ? "Signing out..." : "Log Out"}</span>
          </button>
        </div>

        {/* Footer info */}
        <p className="mt-8 text-xs text-neutral-500 text-center">
          Milestone 1 • Study Assistant Google Auth
        </p>
      </div>
    </main>
  );
}

export default function WelcomePage() {
  return (
    <ProtectedRoute>
      <WelcomeContent />
    </ProtectedRoute>
  );
}
