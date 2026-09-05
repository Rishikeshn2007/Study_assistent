from typing import Optional
from fastapi import HTTPException, status
from pydantic import BaseModel, Field
import firebase_admin
from firebase_admin import auth as firebase_auth


class VerifyTokenRequest(BaseModel):
    token: str = Field(..., description="Firebase ID token from frontend client")


class UserProfileResponse(BaseModel):
    uid: str = Field(..., description="Unique Firebase User ID")
    email: Optional[str] = Field(None, description="User email address")
    name: Optional[str] = Field(None, description="User full display name")
    picture: Optional[str] = Field(None, description="User profile photo URL")
    email_verified: Optional[bool] = Field(None, description="Whether email has been verified")


def verify_firebase_token(token: str) -> UserProfileResponse:
    """
    Verifies the Firebase ID token using the Firebase Admin SDK.
    Returns the decoded user's basic profile details.
    """
    if not token or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token is required.",
        )

    if not firebase_admin._apps:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Firebase Admin SDK is not initialized. Please configure credentials in backend/.env",
        )

    try:
        # verify_id_token verifies signature, expiration, audience, and issuer
        decoded_token = firebase_auth.verify_id_token(token)

        return UserProfileResponse(
            uid=decoded_token.get("uid", ""),
            email=decoded_token.get("email"),
            name=decoded_token.get("name"),
            picture=decoded_token.get("picture"),
            email_verified=decoded_token.get("email_verified"),
        )
    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please sign in again.",
        )
    except firebase_auth.InvalidIdTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Firebase ID token: {str(exc)}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(exc)}",
        )
