# Study Assistant — Milestone 1: Simple Google Authentication Flow

A clean, modular, and production-ready Google Authentication flow connecting a **Next.js (React + TypeScript + Tailwind CSS)** frontend with a **FastAPI (Python)** backend using **Firebase Authentication** and the **Firebase Admin SDK**.

---

## 📁 Project Structure

```text
Study_assistent/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Package marker
│   │   ├── main.py              # FastAPI app instance, CORS middleware, routes
│   │   ├── config.py            # Environment config & Firebase Admin SDK initialization
│   │   └── auth.py              # Token verification logic & Pydantic models
│   ├── tests/
│   │   └── test_api.py          # Automated endpoint tests (health check, token validation)
│   ├── requirements.txt         # FastAPI, Uvicorn, Firebase Admin, Pydantic, python-dotenv
│   ├── .env.example             # Backend environment template
│   └── .env                     # Local backend environment file
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx       # Root layout with AuthProvider and global typography
│   │   │   ├── page.tsx         # Clean landing page ("Continue with Google")
│   │   │   ├── welcome/
│   │   │   │   └── page.tsx     # Protected page (Google avatar, name, email, Log Out)
│   │   │   └── globals.css      # Tailwind CSS styles
│   │   ├── components/
│   │   │   ├── AuthProvider.tsx # Auth context, onAuthStateChanged, token & session state
│   │   │   ├── GoogleSignInButton.tsx # Reusable Google sign-in button with SVG icon
│   │   │   └── ProtectedRoute.tsx     # Route guard protecting /welcome
│   │   └── lib/
│   │       ├── firebase.ts      # Firebase client SDK initialization & auth exports
│   │       └── api.ts           # API client to verify tokens with FastAPI
│   ├── .env.local.example       # Frontend environment template
│   ├── .env.local               # Local frontend environment file
│   ├── package.json             # Next.js, React, Tailwind CSS, Firebase dependencies
│   ├── tsconfig.json            # TypeScript configuration
│   └── next.config.ts           # Next.js configuration (remote Google image domains)
│
├── venv/                        # Python virtual environment
└── README.md                    # Project documentation & run guide
```

---

## ⚙️ Prerequisites

- **Node.js** v18+ (Node v20+ recommended)
- **Python** 3.10+ (tested with Python 3.12)
- **Firebase Account** (free Spark plan)

---

## 🔥 Firebase Setup Steps

### Step 1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and name it (e.g., `study-assistant`).
3. Google Analytics can be enabled or disabled (your choice).
4. Click **Create project**.

### Step 2: Enable Google Sign-In Provider
1. In your Firebase console, navigate to **Build** > **Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab, click **Google**.
4. Toggle **Enable**.
5. Set the **Project support email** to your Google email.
6. Click **Save**.

### Step 3: Register a Web App (for Frontend)
1. Go to **Project Overview** (gear icon) > **Project settings** > **General**.
2. Scroll to the **Your apps** section and click the **Web icon (`</>`)**.
3. App nickname: `study-assistant-web`.
4. Click **Register app**.
5. Copy the `firebaseConfig` keys and paste them into `frontend/.env.local`:
   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef...
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   ```

### Step 4: Generate a Service Account Key (for Backend)
1. In the Firebase Console, go to **Project settings** > **Service accounts**.
2. Ensure **Firebase Admin SDK** is selected.
3. Click **Generate new private key**, then confirm **Generate key**.
4. A JSON file will download (e.g., `serviceAccountKey.json`).
5. Place this file in `backend/` (or specify its absolute/relative path in `backend/.env`):
   ```bash
   FIREBASE_PROJECT_ID=your-project
   FIREBASE_CREDENTIALS_PATH=./serviceAccountKey.json
   ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
   ```

---

## 🚀 Local Run Commands

### 1. Run the FastAPI Backend

Open a terminal in the root workspace directory:

```powershell
# Activate the virtual environment
.\venv\Scripts\activate

# (Optional if already installed) Install backend dependencies
pip install -r backend\requirements.txt

# Start the FastAPI server with reload
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend server runs at `http://localhost:8000`.
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Run the Next.js Frontend

Open a second terminal:

```powershell
cd frontend

# (Optional if already installed) Install frontend dependencies
npm run dev
# (On Windows PowerShell if execution policies block npm scripts, use: npm.cmd run dev)
```

The frontend application runs at [http://localhost:3000](http://localhost:3000).

---

## 🧪 Testing the Authentication Flow

1. **Verify Backend Health**:
   Visit `http://localhost:8000/api/health` in your browser. It should return:
   ```json
   {
     "status": "ok",
     "service": "study_assistant_auth"
   }
   ```

2. **Access the Landing Page**:
   - Open `http://localhost:3000`.
   - You will see the application name **Study Assistant**, the welcome message, and the **"Continue with Google"** button.

3. **Test Route Protection**:
   - Try navigating directly to `http://localhost:3000/welcome`.
   - Notice that you are automatically redirected back to `/` because there is no authenticated session.

4. **Sign In**:
   - Click **"Continue with Google"**.
   - The Firebase Google popup opens. Choose your Google account.
   - Upon successful sign-in, the client extracts the Firebase ID token and sends it to `POST /api/auth/verify`.
   - You are redirected to `/welcome`.

5. **Verify User Profile Display**:
   - On `/welcome`, your Google profile photo, display name, and email address are shown.
   - The status badge shows **"FastAPI Verified"**.

6. **Log Out**:
   - Click **"Log Out"**.
   - Your session is cleared and you are safely returned to the landing page.