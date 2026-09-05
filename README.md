# Study Assistant — AI Learning Platform

A modern, high-performance AI Study Platform built with **Next.js (React 19 + TypeScript + Tailwind CSS)**, **FastAPI (Python)**, **Firebase Authentication**, **Firebase Firestore**, and **Qwen LLM (DashScope)**.

---

## 🚀 Milestones Implemented

- **Milestone 1: Google Authentication Flow**
  - Firebase Authentication with Google OAuth (`GoogleAuthProvider`, `signInWithPopup`, `onAuthStateChanged`).
  - Next.js client-side route protection (`ProtectedRoute`, `AuthProvider`).
  - FastAPI backend token verification via Firebase Admin SDK (`/api/auth/verify`).
  - Environment variable isolation and configuration.

- **Milestone 2: General Mode & Chat Workspace**
  - ChatGPT-style responsive interface with Markdown and syntax-highlighted code blocks with copy action.
  - Interactive sidebar with **New Chat**, chat history list, inline **Rename**, and **Delete** actions.
  - Full message actions: **Copy**, **Edit prompt & resubmit**, **Regenerate response**, and **Delete message**.
  - **Firebase Firestore** client persistence under each user's unique UID (`/users/{uid}/chats/{chatId}/messages/{messageId}`).
  - Stateless **FastAPI** backend with **Qwen LLM API** (`POST /api/chat/general`) using OpenAI-compatible endpoints.
  - Zero database on backend (no PostgreSQL, no SQLAlchemy, no paid databases).
  - Mode Switcher on `/welcome` displaying **General Mode** (active) and **RAG Mode** (Milestone 3 placeholder).

---

## 📁 Project Structure

```text
Study_assistent/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # App package marker
│   │   ├── main.py              # FastAPI app, CORS, /api/auth/verify & /api/chat/general
│   │   ├── config.py            # Environment variables & Firebase Admin initialization
│   │   ├── auth.py              # Firebase Admin ID token verification
│   │   └── qwen_service.py      # Async client for Qwen LLM API (DashScope)
│   ├── tests/
│   │   └── test_api.py          # Automated tests for health, auth, and Qwen chat
│   ├── requirements.txt         # FastAPI, Uvicorn, httpx, Firebase Admin, Pydantic
│   ├── .env.example             # Backend environment template
│   └── .env                     # Local backend secrets (git ignored)
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx       # Root layout with AuthProvider & metadata
│   │   │   ├── page.tsx         # Landing page with "Continue with Google"
│   │   │   ├── welcome/
│   │   │   │   └── page.tsx     # Mode Switcher (General Mode & RAG placeholder)
│   │   │   └── globals.css      # Tailwind CSS styles
│   │   ├── components/
│   │   │   ├── AuthProvider.tsx       # Authentication context & session listener
│   │   │   ├── GoogleSignInButton.tsx # Branded Google OAuth button
│   │   │   ├── ProtectedRoute.tsx     # Guards authenticated pages
│   │   │   ├── ChatSidebar.tsx        # ChatGPT-style sidebar with history & actions
│   │   │   ├── GeneralChat.tsx        # Chat interface with auto-scroll, actions, input
│   │   │   └── MarkdownRenderer.tsx   # Markdown parser with code blocks & copy button
│   │   └── lib/
│   │       ├── firebase.ts      # Firebase app, auth, and firestore db initialization
│   │       ├── firestore.ts     # CRUD operations for user-scoped chats & messages
│   │       └── api.ts           # API client for FastAPI endpoints
│   ├── .env.local.example       # Frontend environment template
│   ├── .env.local               # Local frontend secrets (git ignored)
│   ├── package.json             # Next.js 16, React 19, Lucide, Tailwind, Firebase
│   └── next.config.ts           # Next.js config with remote Google avatars
│
├── firestore.rules              # Firestore user-isolation security rules
└── README.md                    # Project documentation
```

---

## ⚙️ Prerequisites

- **Node.js**: v18+ (tested on Node 20+)
- **Python**: 3.10+ (tested on Python 3.12)
- **Firebase Account**: Free Spark plan on [Firebase Console](https://console.firebase.google.com/)
- **Qwen API Key**: Alibaba Cloud Model Studio / DashScope Console

---

## 🔥 Firebase & Firestore Setup

### 1. Enable Firebase Authentication
1. Go to [Firebase Console](https://console.firebase.google.com/) and open or create your project.
2. Under **Build > Authentication**, click **Get Started**.
3. Enable **Google** in the Sign-in providers tab.
4. Under **Project Settings > General > Your apps**, add a Web App and copy the config parameters.

### 2. Enable Firestore Database
1. In Firebase Console, go to **Build > Firestore Database**.
2. Click **Create database** (choose **production mode** or test mode).
3. Under the **Rules** tab, paste the contents of `firestore.rules`:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
4. Click **Publish**.

### 3. Generate Backend Service Account Key
1. Go to **Project Settings > Service accounts**.
2. Click **Generate new private key** and download the `.json` file.
3. Place it in `backend/` or reference its path in `backend/.env`.

---

## 🔑 Environment Variables

### Backend (`backend/.env`)
```bash
# Firebase Project ID
FIREBASE_PROJECT_ID=your-firebase-project-id

# Optional: Path to downloaded Firebase service account JSON
FIREBASE_CREDENTIALS_PATH=./study-assistant-firebase-adminsdk.json

# Allowed CORS origins
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Qwen LLM API Key (DashScope)
# Obtain from https://dashscope.console.aliyun.com/ or https://bailian.console.alibabacloud.com/
QWEN_API_KEY=sk-your-qwen-api-key

# DashScope OpenAI-compatible Endpoint
# International: https://dashscope-intl.aliyuncs.com/compatible-mode/v1
# China: https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_API_BASE=https://dashscope-intl.aliyuncs.com/compatible-mode/v1

# Qwen Model Identifier
QWEN_MODEL=qwen-plus
```

### Frontend (`frontend/.env.local`)
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:...
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

---

## 🏃 How to Run Locally

### 1. Start the FastAPI Backend
```bash
# From repository root
.\venv\Scripts\activate
cd backend
uvicorn app.main:app --reload --port 8000
```
Backend will run at: `http://localhost:8000` (API Docs: `http://localhost:8000/docs`).

### 2. Start the Next.js Frontend
In a new terminal:
```bash
cd frontend
npm.cmd run dev
```
Frontend will run at: `http://localhost:3000`.

---

## 🧪 Verification & Testing

### Automated Backend Tests
Run the automated test suite verifying health, authentication verification, and Qwen chat routing:
```bash
.\venv\Scripts\python.exe backend/tests/test_api.py
```

### Frontend Type Check & Build Validation
```bash
cd frontend
npm.cmd run lint
npm.cmd run build
```