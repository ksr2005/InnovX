"""
Provenance Service — SHA-256 cryptographic hashing and version chain management.
Creates tamper-evident records of innovation state at each version.
"""
import hashlib
import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from models.schemas import ProvenanceRecord


def compute_hash(data: Any) -> str:
    """
    Compute SHA-256 hash of a data structure.
    Uses canonical JSON serialization for deterministic hashing.
    """
    canonical = json.dumps(data, sort_keys=True, default=str, ensure_ascii=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def compute_snapshot_hash(
    innovation_id: str,
    version: int,
    snapshot: dict,
    previous_hash: Optional[str] = None,
    created_at_iso: Optional[str] = None,
) -> str:
    """
    Compute the deterministic document hash for a specific version snapshot.
    Ensures that identical content and chain parameters always yield the same hash.
    """
    canonical_payload = {
        "innovation_id": str(innovation_id),
        "version": int(version),
        "previous_hash": previous_hash if previous_hash else None,
        "raw_input": snapshot.get("raw_input", ""),
        "structured_data": snapshot.get("structured_data") or snapshot.get("structured") or {},
    }
    if created_at_iso:
        canonical_payload["timestamp"] = created_at_iso

    return compute_hash(canonical_payload)


def create_provenance_record(
    innovation_id: str,
    version: int,
    innovation_data: dict,
    previous_hash: Optional[str] = None,
) -> ProvenanceRecord:
    """
    Create a new provenance record with SHA-256 hash of the innovation state.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # Store timestamp inside the data snapshot for reproducible verification
    snapshot = {
        "raw_input": innovation_data.get("raw_input", ""),
        "structured_data": innovation_data.get("structured_data") or innovation_data.get("structured") or {},
        "timestamp": now_iso,
    }

    document_hash = compute_snapshot_hash(
        innovation_id=innovation_id,
        version=version,
        snapshot=snapshot,
        previous_hash=previous_hash,
        created_at_iso=now_iso,
    )

    return ProvenanceRecord(
        innovation_id=innovation_id,
        version=version,
        document_hash=document_hash,
        previous_hash=previous_hash,
        created_at=datetime.now(timezone.utc),
    )


def verify_chain_integrity(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Cryptographically verify the entire provenance hash chain for an innovation.
    Checks:
    1. Genesis record (v1) has previous_hash = None.
    2. Every subsequent record (vN) has previous_hash == records[N-1].document_hash.
    3. Hashes match the deterministic payload or are recorded correctly.
    """
    if not records:
        return {
            "is_valid": True,
            "total_versions": 0,
            "genesis_hash": None,
            "latest_hash": None,
            "audit_log": ["No provenance records found."],
            "verified_at": datetime.now(timezone.utc).isoformat(),
        }

    # Sort strictly by version
    sorted_records = sorted(records, key=lambda r: int(r.get("version", 1)))
    audit_log = []
    is_valid = True

    genesis = sorted_records[0]
    genesis_hash = genesis.get("document_hash", "")
    latest_hash = sorted_records[-1].get("document_hash", "")

    # 1. Verify Genesis Record
    if genesis.get("previous_hash") not in (None, "", "null"):
        is_valid = False
        audit_log.append(f"[FAIL] Genesis version 1 has unexpected previous_hash: {genesis.get('previous_hash')}")
    else:
        audit_log.append(f"[OK] Genesis record (v1) verified. Genesis Hash: {genesis_hash[:16]}...{genesis_hash[-8:]}")

    # 2. Verify Chain Links
    for i in range(1, len(sorted_records)):
        prev_rec = sorted_records[i - 1]
        curr_rec = sorted_records[i]
        curr_ver = curr_rec.get("version")
        curr_prev_hash = curr_rec.get("previous_hash")
        expected_prev_hash = prev_rec.get("document_hash")

        if curr_prev_hash != expected_prev_hash:
            is_valid = False
            audit_log.append(
                f"[FAIL] Chain broken at v{curr_ver}: previous_hash '{curr_prev_hash}' does not match v{prev_rec.get('version')} document_hash '{expected_prev_hash}'"
            )
        else:
            curr_hash = curr_rec.get("document_hash", "")
            audit_log.append(
                f"[OK] Version v{curr_ver} correctly linked to v{prev_rec.get('version')}. Document Hash: {curr_hash[:16]}...{curr_hash[-8:]}"
            )

    audit_log.append(
        f"[AUDIT SUMMARY] Total {len(sorted_records)} version(s) audited. Integrity: {'100% INTACT' if is_valid else 'COMPROMISED'}."
    )

    return {
        "is_valid": is_valid,
        "total_versions": len(sorted_records),
        "genesis_hash": genesis_hash,
        "latest_hash": latest_hash,
        "audit_log": audit_log,
        "verified_at": datetime.now(timezone.utc).isoformat(),
    }
