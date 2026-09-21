"""
Provenance Service — SHA-256 cryptographic hashing and version chain management.
Creates tamper-evident records of innovation state at each version.
"""
import hashlib
import json
from datetime import datetime, timezone
from typing import Optional

from models.schemas import ProvenanceRecord


def compute_hash(data: dict) -> str:
    """
    Compute SHA-256 hash of a data dictionary.
    Uses canonical JSON serialization for deterministic hashing.
    """
    # Sort keys for deterministic output
    canonical = json.dumps(data, sort_keys=True, default=str, ensure_ascii=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def create_provenance_record(
    innovation_id: str,
    version: int,
    innovation_data: dict,
    previous_hash: Optional[str] = None,
) -> ProvenanceRecord:
    """
    Create a new provenance record with SHA-256 hash of the innovation state.

    Args:
        innovation_id: The innovation's unique ID.
        version: Version number (1 for initial, incrementing).
        innovation_data: The full innovation state to hash.
        previous_hash: Hash of the previous version (None for v1).

    Returns:
        ProvenanceRecord with computed hash and timestamp.
    """
    # Include metadata in the hash input for stronger provenance
    hash_input = {
        "innovation_id": innovation_id,
        "version": version,
        "previous_hash": previous_hash,
        "data": innovation_data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    document_hash = compute_hash(hash_input)

    return ProvenanceRecord(
        innovation_id=innovation_id,
        version=version,
        document_hash=document_hash,
        previous_hash=previous_hash,
        created_at=datetime.now(timezone.utc),
    )


def verify_hash(data: dict, expected_hash: str) -> bool:
    """Verify that a data dictionary matches an expected hash."""
    computed = compute_hash(data)
    return computed == expected_hash
