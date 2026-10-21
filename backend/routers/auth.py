"""
Auth Router — Instant user registration with automatic email confirmation.
Bypasses manual email verification in local development using Supabase Admin API.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from services.supabase_client import get_supabase
from services.auth import ensure_user_profile

router = APIRouter()


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None


@router.post("/register")
async def register_user(payload: RegisterRequest):
    """
    Register a new user and automatically mark their email as confirmed.
    Ensures seamless onboarding without waiting for email verification links.
    """
    supabase = get_supabase()

    try:
        user_response = supabase.auth.admin.create_user({
            "email": payload.email,
            "password": payload.password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": payload.full_name or payload.email.split("@")[0]
            },
        })

        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user account",
            )

        user_id = str(user_response.user.id)
        ensure_user_profile(
            user_id=user_id,
            email=payload.email,
            full_name=payload.full_name,
        )

        return {
            "status": "success",
            "message": "User registered and auto-confirmed successfully",
            "user_id": user_id,
        }

    except Exception as e:
        err_msg = str(e)
        if "already registered" in err_msg.lower() or "unique" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email address already exists. Please sign in instead.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {err_msg}",
        )
