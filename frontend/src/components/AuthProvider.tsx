"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  isFirebaseConfigured,
  type User,
} from "@/lib/firebase";
import { verifyTokenWithBackend, type BackendUserProfile } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  backendUser: BackendUserProfile | null;
  idToken: string | null;
  loading: boolean;
  isAuthenticating: boolean;
  error: string | null;
  isConfigured: boolean;
  getIdToken: () => Promise<string | null>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [backendUser, setBackendUser] = useState<BackendUserProfile | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          setIdToken(token);
          setUser(firebaseUser);

          // Verify with FastAPI backend
          try {
            const verified = await verifyTokenWithBackend(token);
            setBackendUser(verified);
          } catch (backendErr: unknown) {
            console.warn("[Auth] Backend verification warning:", backendErr);
            // Even if backend has not configured its service account yet, keep client session with fallback info
            setBackendUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName,
              picture: firebaseUser.photoURL,
              email_verified: firebaseUser.emailVerified,
            });
          }
        } catch (err: unknown) {
          console.error("[Auth] Error fetching token:", err);
          setUser(null);
          setBackendUser(null);
          setIdToken(null);
        }
      } else {
        setUser(null);
        setBackendUser(null);
        setIdToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handler for Google Sign-In button
  const signInWithGoogle = async () => {
    setIsAuthenticating(true);
    setError(null);

    // Check if configuration is provided
    if (!isFirebaseConfigured && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      setError(
        "Firebase credentials not detected. Please add your NEXT_PUBLIC_FIREBASE_API_KEY to frontend/.env.local (see .env.local.example)."
      );
      setIsAuthenticating(false);
      return;
    }

    try {
      // 1. Sign in with Google Popup via Firebase Client SDK
      const credential = await signInWithPopup(auth, googleProvider);
      const currentUser = credential.user;

      // 2. Retrieve Firebase ID Token
      const token = await currentUser.getIdToken(true);
      setIdToken(token);
      setUser(currentUser);

      // 3. Send Firebase ID token to FastAPI backend for verification
      try {
        const verifiedData = await verifyTokenWithBackend(token);
        setBackendUser(verifiedData);
      } catch (backendErr: unknown) {
        console.warn("[Auth] Backend verification warning:", backendErr);
        // Fallback to client profile if backend is not yet linked to Firebase service account
        setBackendUser({
          uid: currentUser.uid,
          email: currentUser.email,
          name: currentUser.displayName,
          picture: currentUser.photoURL,
          email_verified: currentUser.emailVerified,
        });
      }

      // 4. Redirect authenticated user to /welcome
      router.push("/welcome");
    } catch (err: unknown) {
      console.error("[Auth] Google Sign-In error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during Google Sign-In.";
      setError(errorMessage);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handler for Logout button
  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setUser(null);
      setBackendUser(null);
      setIdToken(null);
      setError(null);
      // Redirect back to landing page
      router.push("/");
    } catch (err: unknown) {
      console.error("[Auth] Logout error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to acquire a fresh Firebase ID token
  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (user) {
      try {
        const token = await user.getIdToken();
        setIdToken(token);
        return token;
      } catch (err) {
        console.error("[Auth] Error refreshing ID token:", err);
      }
    }
    return idToken;
  }, [user, idToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        backendUser,
        idToken,
        loading,
        isAuthenticating,
        error,
        isConfigured: isFirebaseConfigured,
        getIdToken,
        signInWithGoogle,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
