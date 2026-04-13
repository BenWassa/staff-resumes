"""FastAPI dependencies for Firebase Auth token verification."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth, firestore

from web.api.firebase_admin_init import initialize

security = HTTPBearer()


def _get_db():
    initialize()
    return firestore.client()


async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Verify a Firebase ID token. Returns the decoded token claims."""
    try:
        decoded = firebase_auth.verify_id_token(credentials.credentials)
        return decoded
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
        )


async def require_admin(token: dict = Depends(verify_token)) -> dict:
    """Verify token and confirm the user has the admin role."""
    db = _get_db()
    uid = token["uid"]
    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists or user_doc.to_dict().get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required.",
        )
    return token
