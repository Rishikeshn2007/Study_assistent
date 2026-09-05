import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "study_assistant_auth"
    print("Health check endpoint test passed!")


def test_verify_auth_no_token():
    response = client.post("/api/auth/verify", json={"token": ""})
    assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    print("Verify endpoint empty token test passed (rejected with 400)!")


def test_verify_auth_invalid_token():
    response = client.post("/api/auth/verify", json={"token": "invalid_dummy_token_12345"})
    assert response.status_code in (401, 500), f"Expected 401 or 500, got {response.status_code}"
    print("Verify endpoint invalid token test passed (rejected properly)!")


if __name__ == "__main__":
    test_health()
    test_verify_auth_no_token()
    test_verify_auth_invalid_token()
    print("All backend tests completed successfully!")
