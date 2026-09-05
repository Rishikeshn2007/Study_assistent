import sys
from pathlib import Path
from unittest.mock import patch

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app
from app.auth import UserProfileResponse

client = TestClient(app)


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert data["status"] == "ok"
    assert "study_assistant" in data["service"]
    print("Health check endpoint test passed!")


def test_verify_auth_no_token():
    response = client.post("/api/auth/verify", json={"token": ""})
    assert response.status_code in (400, 401), f"Expected 400/401, got {response.status_code}"
    print("Verify endpoint empty token test passed (rejected with 400/401)!")


def test_verify_auth_invalid_token():
    response = client.post("/api/auth/verify", json={"token": "invalid_dummy_token_12345"})
    assert response.status_code in (401, 500), f"Expected 401 or 500, got {response.status_code}"
    print("Verify endpoint invalid token test passed (rejected properly)!")


def test_chat_general_unauthorized():
    # Chat without Authorization header
    response = client.post("/api/chat/general", json={"prompt": "Hello"})
    assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    print("Chat general unauthorized test passed (rejected with 401)!")


def test_chat_general_authorized_success():
    # Mock verify_firebase_token and generate_qwen_response to test endpoint logic
    mock_user = UserProfileResponse(
        uid="test-uid-12345",
        email="test@example.com",
        name="Test Student",
        picture=None,
        email_verified=True,
    )

    with patch("app.main.verify_firebase_token", return_value=mock_user), \
         patch("app.main.generate_qwen_response", return_value="Photosynthesis is the process used by plants..."):
        response = client.post(
            "/api/chat/general",
            headers={"Authorization": "Bearer mock-valid-token-xyz"},
            json={
                "prompt": "What is photosynthesis?",
                "history": [
                    {"role": "user", "content": "Hi"},
                    {"role": "assistant", "content": "Hello! How can I help your studies?"}
                ],
            },
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "response" in data
        assert "Photosynthesis" in data["response"]
        print("Chat general authorized success test passed!")


if __name__ == "__main__":
    test_health()
    test_verify_auth_no_token()
    test_verify_auth_invalid_token()
    test_chat_general_unauthorized()
    test_chat_general_authorized_success()
    print("All backend tests completed successfully!")
