"""
Authentication service and FastAPI dependency for Supabase JWT verification.
"""
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
from services.supabase_client import get_supabase


def ensure_user_profile(user_id: str, email: Optional[str] = None, full_name: Optional[str] = None) -> None:
    """
    Ensure the user profile row exists in the profiles table.
    Guarantees foreign key references to profiles(id) succeed.
    """
    try:
        supabase = get_supabase()
        profile_data: Dict[str, Any] = {
            "id": user_id,
            "role": "creator",
        }
        if full_name:
            profile_data["full_name"] = full_name
        elif email:
            profile_data["full_name"] = email.split("@")[0]

        supabase.table("profiles").upsert(profile_data, on_conflict="id").execute()
    except Exception as e:
        # Log error but don't fail if already existing
        print(f"[AUTH] Error ensuring user profile: {e}")


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Strict FastAPI dependency: requires valid Bearer token.
    Returns authenticated user information dictionary:
    { "id": str, "email": str, "metadata": dict }
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header. Expected 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ")[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty bearer token provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        supabase = get_supabase()
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = user_response.user
        user_id = str(user.id)
        email = user.email or ""
        metadata = user.user_metadata or {}
        full_name = metadata.get("full_name") or metadata.get("name") or (email.split("@")[0] if email else "Creator")

        # Guarantee profile existence for foreign key constraints
        ensure_user_profile(user_id=user_id, email=email, full_name=full_name)

        return {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "metadata": metadata,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """
    Optional dependency: returns user dict if valid Bearer token provided, None otherwise.
    Allows endpoints to serve guest users while linking records if logged in.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None

    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None
