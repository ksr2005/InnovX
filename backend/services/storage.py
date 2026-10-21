"""
Storage Service — Supabase Storage integration for Innovation Vault files.
Handles secure file uploads (PDF, images, schematics, notes up to 10MB) and signed download URLs.
"""
import uuid
import re
from typing import Optional, Dict, Any, List
from services.supabase_client import get_supabase

BUCKET_NAME = "innovation-files"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB in bytes


def ensure_storage_bucket() -> None:
    """Ensure the private storage bucket exists with 10MB limit."""
    supabase = get_supabase()
    try:
        buckets = supabase.storage.list_buckets()
        existing_names = [b.name for b in buckets]
        if BUCKET_NAME not in existing_names:
            supabase.storage.create_bucket(
                BUCKET_NAME,
                options={"public": False, "file_size_limit": MAX_FILE_SIZE},
            )
    except Exception as e:
        print(f"[STORAGE] Warning checking bucket: {e}")


def sanitize_filename(name: str) -> str:
    """Sanitize filename to prevent path traversal or special character issues."""
    name = re.sub(r"[^\w\.-]", "_", name)
    return name[:100]


def upload_innovation_file(
    innovation_id: str,
    file_name: str,
    file_bytes: bytes,
    mime_type: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Upload a file to Supabase Storage and register in the innovation_files table.
    """
    if len(file_bytes) > MAX_FILE_SIZE:
        raise ValueError(f"File size exceeds 10MB limit ({len(file_bytes)} bytes)")

    supabase = get_supabase()
    ensure_storage_bucket()

    safe_name = sanitize_filename(file_name)
    prefix = uuid.uuid4().hex[:8]
    storage_path = f"{innovation_id}/{prefix}_{safe_name}"
    content_type = mime_type or "application/octet-stream"

    # 1. Upload bytes to Supabase Storage
    supabase.storage.from_(BUCKET_NAME).upload(
        storage_path,
        file_bytes,
        file_options={"content-type": content_type},
    )

    # 2. Insert into innovation_files relational table
    file_record = {
        "id": str(uuid.uuid4()),
        "innovation_id": innovation_id,
        "file_name": file_name,
        "file_path": storage_path,
        "file_size": len(file_bytes),
        "mime_type": content_type,
    }
    db_res = supabase.table("innovation_files").insert(file_record).execute()
    inserted = db_res.data[0] if db_res.data else file_record

    # 3. Generate signed download URL (valid for 1 hour)
    signed_res = supabase.storage.from_(BUCKET_NAME).create_signed_url(storage_path, 3600)
    download_url = signed_res.get("signedURL") if isinstance(signed_res, dict) else str(signed_res)

    return {
        **inserted,
        "download_url": download_url,
    }


def list_innovation_files(innovation_id: str) -> List[Dict[str, Any]]:
    """List all uploaded files for an innovation with active signed download URLs."""
    supabase = get_supabase()
    ensure_storage_bucket()

    res = (
        supabase.table("innovation_files")
        .select("*")
        .eq("innovation_id", innovation_id)
        .order("created_at", desc=True)
        .execute()
    )
    files = res.data or []

    result = []
    for f in files:
        storage_path = f.get("file_path")
        try:
            signed_res = supabase.storage.from_(BUCKET_NAME).create_signed_url(storage_path, 3600)
            url = signed_res.get("signedURL") if isinstance(signed_res, dict) else str(signed_res)
        except Exception:
            url = None

        result.append({
            **f,
            "download_url": url,
        })

    return result


def delete_innovation_file(file_id: str, innovation_id: str) -> None:
    """Delete a file from Supabase Storage and remove its database record."""
    supabase = get_supabase()

    # Fetch file record to verify and get storage path
    file_res = (
        supabase.table("innovation_files")
        .select("*")
        .eq("id", file_id)
        .eq("innovation_id", innovation_id)
        .execute()
    )
    if not file_res.data:
        raise ValueError("File not found or does not belong to this innovation")

    file_item = file_res.data[0]
    storage_path = file_item.get("file_path")

    # 1. Remove from Storage
    try:
        supabase.storage.from_(BUCKET_NAME).remove([storage_path])
    except Exception as e:
        print(f"[STORAGE] Warning removing file from bucket: {e}")

    # 2. Delete from DB
    supabase.table("innovation_files").delete().eq("id", file_id).execute()
