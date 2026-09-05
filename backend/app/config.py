import os
from pathlib import Path
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials

# Load environment variables from .env file
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "")
FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")


def init_firebase() -> bool:
    """
    Initializes the Firebase Admin SDK.
    Supports:
    1. Service account JSON file specified via FIREBASE_CREDENTIALS_PATH
    2. Default application credentials (GOOGLE_APPLICATION_CREDENTIALS)
    3. Project ID fallback
    """
    if firebase_admin._apps:
        return True

    try:
        if FIREBASE_CREDENTIALS_PATH and os.path.exists(FIREBASE_CREDENTIALS_PATH):
            cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred)
            print(f"[Firebase Admin] Initialized with credentials file: {FIREBASE_CREDENTIALS_PATH}")
            return True

        if FIREBASE_PROJECT_ID:
            firebase_admin.initialize_app(options={"projectId": FIREBASE_PROJECT_ID})
            print(f"[Firebase Admin] Initialized with Project ID: {FIREBASE_PROJECT_ID}")
            return True

        # Default fallback initialization (relies on GOOGLE_APPLICATION_CREDENTIALS or gcloud environment)
        firebase_admin.initialize_app()
        print("[Firebase Admin] Initialized with default credentials.")
        return True
    except Exception as exc:
        print(f"[Firebase Admin Warning] Could not initialize Firebase Admin SDK: {exc}")
        print("[Firebase Admin Warning] Token verification will fail until valid Firebase credentials are provided.")
        return False
