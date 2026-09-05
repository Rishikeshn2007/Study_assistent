"use client";

import React from "react";
import { useAuth } from "./AuthProvider";

interface GoogleSignInButtonProps {
  className?: string;
}

export function GoogleSignInButton({ className = "" }: GoogleSignInButtonProps) {
  const { signInWithGoogle, isAuthenticating } = useAuth();

  return (
    <button
      type="button"
      id="google-signin-btn"
      onClick={() => signInWithGoogle()}
      disabled={isAuthenticating}
      className={`relative inline-flex items-center justify-center gap-3 px-6 py-3.5 text-sm font-semibold tracking-wide text-neutral-800 dark:text-neutral-100 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 border border-neutral-300 dark:border-neutral-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 ease-in-out cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-sm ${className}`}
    >
      {isAuthenticating ? (
        <svg
          className="w-5 h-5 text-indigo-500 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      ) : (
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
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
      )}
      <span>{isAuthenticating ? "Connecting with Google..." : "Continue with Google"}</span>
    </button>
  );
}
