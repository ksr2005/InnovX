"""
Supabase client helper for InnovX backend.
Provides authenticated access using the service role key for backend operations.
"""
import os
from pathlib import Path
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv

# Load from backend directory explicitly regardless of cwd
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

_supabase_client: Optional[Client] = None


def get_supabase() -> Client:
    """
    Get or initialize the Supabase client.
    Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS for trusted backend operations,
    while endpoint logic strictly filters by authenticated user_id.
    """
    global _supabase_client
    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
        if not url or not key:
            raise ValueError(
                "Supabase credentials missing. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env"
            )
        _supabase_client = create_client(url, key)
    return _supabase_client
