"""
Innovations Router — Complete CRUD and personal portfolio management in Supabase.
Enforces Rule 4: Private by default (innovations strictly restricted to creator).
"""
import uuid
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse

from services.supabase_client import get_supabase
from services.auth import get_current_user
from models.schemas import (
    InnovationCreateRequest,
    InnovationUpdateRequest,
    InnovationItem,
    InnovationListResponse,
    ProvenanceVersionItem,
    ProvenanceChainResponse,
    ChainVerificationResponse,
    CreateVersionRequest,
    InnovationFileItem,
    InnovationFileListResponse,
    DevelopmentNoteItem,
    DevelopmentNoteCreateRequest,
    DevelopmentNotesResponse,
    ReanalyzeRequest,
    ReanalyzeResponse,
    PathSelectionRequest,
    PathSelectionResponse,
    PatentPrepPackage,
    PatentPrepResponse,
    DefensivePublication,
    DefensivePubResponse,
)
from services import provenance, storage, patent_prep, defensive_pub
from routers.report import cache_report, get_cached_report
from routers.analyze import run_analysis_pipeline


router = APIRouter()


def _is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


@router.get("", response_model=InnovationListResponse)
async def list_user_innovations(
    current_user: dict = Depends(get_current_user),
):
    """
    List all innovations owned by the authenticated creator.
    Enforces private-by-default access control (user_id == current_user.id).
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    try:
        # Fetch innovations for user
        inno_res = (
            supabase.table("innovations")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        innovations = inno_res.data or []

        if not innovations:
            return InnovationListResponse(total=0, innovations=[])

        # Fetch assessments for these innovations in batch
        inno_ids = [item["id"] for item in innovations]
        assess_res = (
            supabase.table("assessments")
            .select("*")
            .in_("innovation_id", inno_ids)
            .execute()
        )
        assessments_by_id: Dict[str, dict] = {
            a["innovation_id"]: a for a in (assess_res.data or [])
        }

        items: List[InnovationItem] = []
        for row in innovations:
            inno_id = row["id"]
            assessment = assessments_by_id.get(inno_id)

            scores_dict = None
            if assessment:
                scores_dict = {
                    "prior_art_density": assessment.get("prior_art_density"),
                    "feature_novelty": assessment.get("feature_novelty"),
                    "combination_distinctiveness": assessment.get("combination_distinctiveness"),
                    "research_freshness": assessment.get("research_freshness"),
                    "evidence_strength": assessment.get("evidence_strength"),
                    "search_confidence": assessment.get("search_confidence"),
                    "summary_text": assessment.get("summary_text"),
                }

            items.append(
                InnovationItem(
                    id=inno_id,
                    user_id=row.get("user_id"),
                    title=row.get("title") or "Untitled Innovation",
                    raw_input=row.get("raw_input") or "",
                    status=row.get("status") or "completed",
                    visibility=row.get("visibility") or "private",
                    current_version=row.get("current_version") or 1,
                    created_at=str(row.get("created_at")),
                    updated_at=str(row.get("updated_at")),
                    structured_data=row.get("structured_data"),
                    scores=scores_dict,
                )
            )

        return InnovationListResponse(total=len(items), innovations=items)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch innovations: {str(e)}",
        )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_innovation(
    payload: InnovationCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Save an innovation record to the database for the authenticated user.
    Stores core metadata, AI structured breakdown, assessment scores, and provenance record.
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    # Determine innovation ID (must be valid UUID for database column)
    inno_id = payload.id if (payload.id and _is_valid_uuid(payload.id)) else str(uuid.uuid4())

    try:
        # 1. Insert core innovation record
        inno_record = {
            "id": inno_id,
            "user_id": user_id,
            "title": payload.title,
            "raw_input": payload.raw_input,
            "structured_data": payload.structured_data,
            "status": payload.status or "completed",
            "visibility": payload.visibility or "private",
            "current_version": 1,
        }
        supabase.table("innovations").insert(inno_record).execute()

        # 2. Insert assessment scores if provided
        if payload.scores:
            scores_data = payload.scores
            # Support both flat scores and nested ScoreDetail schemas
            def extract_score(key: str) -> float:
                val = scores_data.get(key)
                if isinstance(val, dict):
                    return float(val.get("score", 0.0))
                elif isinstance(val, (int, float)):
                    return float(val)
                return 0.0

            assessment_record = {
                "innovation_id": inno_id,
                "prior_art_density": extract_score("prior_art_density"),
                "feature_novelty": extract_score("feature_novelty"),
                "combination_distinctiveness": extract_score("combination_distinctiveness"),
                "research_freshness": extract_score("research_freshness"),
                "evidence_strength": extract_score("evidence_strength"),
                "search_confidence": extract_score("search_confidence"),
                "summary_text": payload.assessment_summary or scores_data.get("summary_text", ""),
            }
            supabase.table("assessments").insert(assessment_record).execute()

        # 3. Insert provenance record if provided
        if payload.provenance:
            prov_data = payload.provenance
            prov_record = {
                "innovation_id": inno_id,
                "version": prov_data.get("version", 1),
                "document_hash": prov_data.get("document_hash") or "unknown",
                "previous_hash": prov_data.get("previous_hash"),
                "snapshot": {
                    "raw_input": payload.raw_input,
                    "structured_data": payload.structured_data,
                },
            }
            supabase.table("provenance_records").insert(prov_record).execute()

        # 4. Cache full report in memory and link
        if payload.report:
            cache_report(inno_id, payload.report)

        return {
            "status": "success",
            "message": "Innovation saved successfully to portfolio",
            "innovation_id": inno_id,
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save innovation: {str(e)}",
        )


@router.get("/stats/summary")
async def get_creator_stats(
    current_user: dict = Depends(get_current_user),
):
    """
    Get creator high-level summary statistics for dashboard header.
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    try:
        inno_res = (
            supabase.table("innovations")
            .select("id, status, visibility, created_at")
            .eq("user_id", user_id)
            .execute()
        )
        innovations = inno_res.data or []
        total = len(innovations)

        if total == 0:
            return {
                "total_innovations": 0,
                "average_novelty": 0,
                "private_count": 0,
                "active_analyses": 0,
            }

        inno_ids = [i["id"] for i in innovations]
        assess_res = (
            supabase.table("assessments")
            .select("feature_novelty")
            .in_("innovation_id", inno_ids)
            .execute()
        )
        assessments = assess_res.data or []
        novelty_scores = [a["feature_novelty"] for a in assessments if a.get("feature_novelty") is not None]
        avg_novelty = round(sum(novelty_scores) / len(novelty_scores), 1) if novelty_scores else 0

        private_count = sum(1 for i in innovations if i.get("visibility") == "private")

        return {
            "total_innovations": total,
            "average_novelty": avg_novelty,
            "private_count": private_count,
            "active_analyses": total,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


@router.get("/{innovation_id}")
async def get_innovation_detail(
    innovation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch full detail of a specific innovation.
    Enforces private-by-default access rule (ownership check).
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    try:
        inno_res = (
            supabase.table("innovations")
            .select("*")
            .eq("id", innovation_id)
            .execute()
        )
        if not inno_res.data:
            raise HTTPException(status_code=404, detail="Innovation not found")

        inno = inno_res.data[0]

        # Enforce private-by-default rule: must be the creator
        if inno.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. This innovation is private to its creator.",
            )

        # Fetch assessment
        assess_res = (
            supabase.table("assessments")
            .select("*")
            .eq("innovation_id", innovation_id)
            .execute()
        )
        assessment = assess_res.data[0] if assess_res.data else None

        # Fetch provenance records
        prov_res = (
            supabase.table("provenance_records")
            .select("*")
            .eq("innovation_id", innovation_id)
            .order("version", desc=False)
            .execute()
        )
        provenance_history = prov_res.data or []

        # Check cached report
        cached_rep = get_cached_report(innovation_id)

        return {
            "innovation": inno,
            "assessment": assessment,
            "provenance_records": provenance_history,
            "report": cached_rep,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch innovation detail: {str(e)}",
        )


@router.patch("/{innovation_id}")
async def update_innovation(
    innovation_id: str,
    payload: InnovationUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update title, visibility or status of an innovation."""
    user_id = current_user["id"]
    supabase = get_supabase()

    try:
        # Check ownership
        inno_res = supabase.table("innovations").select("user_id").eq("id", innovation_id).execute()
        if not inno_res.data:
            raise HTTPException(status_code=404, detail="Innovation not found")
        if inno_res.data[0].get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        updates: Dict[str, Any] = {}
        if payload.title is not None:
            updates["title"] = payload.title
        if payload.visibility is not None:
            updates["visibility"] = payload.visibility
        if payload.status is not None:
            updates["status"] = payload.status

        if updates:
            supabase.table("innovations").update(updates).eq("id", innovation_id).execute()

        return {"status": "success", "message": "Innovation updated"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{innovation_id}")
async def delete_innovation(
    innovation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Permanently delete an innovation and all associated assessments and provenance records.
    Requires creator ownership.
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    try:
        # Verify ownership
        inno_res = (
            supabase.table("innovations")
            .select("user_id")
            .eq("id", innovation_id)
            .execute()
        )
        if not inno_res.data:
            raise HTTPException(status_code=404, detail="Innovation not found")

        if inno_res.data[0].get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Cannot delete another creator's innovation.",
            )

        # Delete innovation (Postgres cascades delete features, assessments, provenance)
        supabase.table("innovations").delete().eq("id", innovation_id).execute()

        return {
            "status": "success",
            "message": f"Innovation {innovation_id} deleted successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete innovation: {str(e)}",
        )


# ─── Provenance Hash Chain & Audit Endpoints (Day 12) ──────────

@router.get("/{innovation_id}/provenance", response_model=ProvenanceChainResponse)
async def get_innovation_provenance(
    innovation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch full provenance version history and chain verification status for an innovation.
    Enforces Rule 4: Private by default.
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    try:
        # Verify ownership
        inno_res = supabase.table("innovations").select("user_id").eq("id", innovation_id).execute()
        if not inno_res.data:
            raise HTTPException(status_code=404, detail="Innovation not found")
        if inno_res.data[0].get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied. Private by default.")

        prov_res = (
            supabase.table("provenance_records")
            .select("*")
            .eq("innovation_id", innovation_id)
            .order("version", desc=False)
            .execute()
        )
        records = prov_res.data or []

        # Audit chain integrity
        audit = provenance.verify_chain_integrity(records)

        version_items = []
        for i, r in enumerate(records):
            prev_h = r.get("previous_hash")
            # Verify link with preceding item
            is_link_valid = True
            if i == 0:
                is_link_valid = prev_h in (None, "", "null")
            else:
                is_link_valid = prev_h == records[i - 1].get("document_hash")

            version_items.append(
                ProvenanceVersionItem(
                    id=str(r.get("id")),
                    innovation_id=innovation_id,
                    version=int(r.get("version", 1)),
                    document_hash=str(r.get("document_hash")),
                    previous_hash=prev_h,
                    snapshot=r.get("snapshot") or {},
                    created_at=str(r.get("created_at")),
                    is_link_valid=is_link_valid,
                )
            )

        return ProvenanceChainResponse(
            innovation_id=innovation_id,
            total_versions=len(version_items),
            is_chain_intact=audit["is_valid"],
            genesis_hash=audit["genesis_hash"],
            latest_hash=audit["latest_hash"],
            records=version_items,
            verified_at=audit["verified_at"],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch provenance chain: {str(e)}",
        )


@router.post("/{innovation_id}/verify-chain", response_model=ChainVerificationResponse)
async def verify_innovation_chain(
    innovation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    On-demand cryptographic audit: re-computes and verifies each link in the SHA-256 hash chain.
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    try:
        inno_res = supabase.table("innovations").select("user_id").eq("id", innovation_id).execute()
        if not inno_res.data:
            raise HTTPException(status_code=404, detail="Innovation not found")
        if inno_res.data[0].get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied. Private by default.")

        prov_res = (
            supabase.table("provenance_records")
            .select("*")
            .eq("innovation_id", innovation_id)
            .order("version", desc=False)
            .execute()
        )
        records = prov_res.data or []
        audit = provenance.verify_chain_integrity(records)

        return ChainVerificationResponse(
            innovation_id=innovation_id,
            is_valid=audit["is_valid"],
            total_versions=audit["total_versions"],
            genesis_hash=audit["genesis_hash"],
            latest_hash=audit["latest_hash"],
            audit_log=audit["audit_log"],
            verified_at=audit["verified_at"],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify chain: {str(e)}",
        )


@router.post("/{innovation_id}/version", status_code=status.HTTP_201_CREATED)
async def create_innovation_version(
    innovation_id: str,
    payload: CreateVersionRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Append a new version (v_{n+1}) to the immutable provenance hash chain.
    Automatically links previous_hash to maintain chain integrity.
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    try:
        # Check ownership and fetch current innovation
        inno_res = supabase.table("innovations").select("*").eq("id", innovation_id).execute()
        if not inno_res.data:
            raise HTTPException(status_code=404, detail="Innovation not found")
        inno = inno_res.data[0]
        if inno.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied. Private by default.")

        # Fetch latest provenance record to get last hash and version
        prov_res = (
            supabase.table("provenance_records")
            .select("*")
            .eq("innovation_id", innovation_id)
            .order("version", desc=True)
            .limit(1)
            .execute()
        )
        latest_rec = prov_res.data[0] if prov_res.data else None

        current_ver = int(latest_rec.get("version", 1)) if latest_rec else int(inno.get("current_version", 1))
        new_version = current_ver + 1
        previous_hash = latest_rec.get("document_hash") if latest_rec else None

        # Snapshot data for new version
        from datetime import datetime, timezone
        now_iso = datetime.now(timezone.utc).isoformat()
        new_snapshot = {
            "raw_input": payload.raw_input,
            "structured_data": payload.structured_data or inno.get("structured_data") or {},
            "timestamp": now_iso,
        }

        # Compute new hash linked to previous_hash
        new_doc_hash = provenance.compute_snapshot_hash(
            innovation_id=innovation_id,
            version=new_version,
            snapshot=new_snapshot,
            previous_hash=previous_hash,
            created_at_iso=now_iso,
        )

        # 1. Insert new provenance record into Supabase
        prov_insert = {
            "innovation_id": innovation_id,
            "version": new_version,
            "document_hash": new_doc_hash,
            "previous_hash": previous_hash,
            "snapshot": new_snapshot,
        }
        supabase.table("provenance_records").insert(prov_insert).execute()

        # 2. Update innovation record (increment version and update timestamp)
        inno_updates = {
            "current_version": new_version,
            "raw_input": payload.raw_input,
            "updated_at": now_iso,
        }
        if payload.title:
            inno_updates["title"] = payload.title
        if payload.structured_data:
            inno_updates["structured_data"] = payload.structured_data

        supabase.table("innovations").update(inno_updates).eq("id", innovation_id).execute()

        # 3. Update assessment if new scores provided
        if payload.scores:
            scores_data = payload.scores
            def extract_score(k: str) -> float:
                v = scores_data.get(k)
                if isinstance(v, dict):
                    return float(v.get("score", 0.0))
                elif isinstance(v, (int, float)):
                    return float(v)
                return 0.0

            assess_update = {
                "prior_art_density": extract_score("prior_art_density"),
                "feature_novelty": extract_score("feature_novelty"),
                "combination_distinctiveness": extract_score("combination_distinctiveness"),
                "research_freshness": extract_score("research_freshness"),
                "evidence_strength": extract_score("evidence_strength"),
                "search_confidence": extract_score("search_confidence"),
                "summary_text": payload.assessment_summary or scores_data.get("summary_text", ""),
            }
            supabase.table("assessments").upsert({"innovation_id": innovation_id, **assess_update}, on_conflict="innovation_id").execute()

        # 4. Update cached report if provided
        if payload.report:
            cache_report(innovation_id, payload.report)

        return {
            "status": "success",
            "message": f"Version {new_version} created and cryptographically chained to Version {current_ver}",
            "version": new_version,
            "document_hash": new_doc_hash,
            "previous_hash": previous_hash,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create innovation version: {str(e)}",
        )


# ─── Vault File Management Endpoints (Day 13) ───────────────

@router.post("/{innovation_id}/files", response_model=InnovationFileItem, status_code=status.HTTP_201_CREATED)
async def upload_file_to_vault(
    innovation_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload a research paper, schematic, or notes file (up to 10MB) to the Innovation Vault.
    Enforces Rule 4: Private by default.
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    inno_res = supabase.table("innovations").select("user_id").eq("id", innovation_id).execute()
    if not inno_res.data:
        raise HTTPException(status_code=404, detail="Innovation not found")
    if inno_res.data[0].get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied. Private by default.")

    file_bytes = await file.read()
    if len(file_bytes) > storage.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds 10MB limit ({len(file_bytes)} bytes > {storage.MAX_FILE_SIZE} bytes)",
        )

    try:
        uploaded = storage.upload_innovation_file(
            innovation_id=innovation_id,
            file_name=file.filename or "uploaded_file",
            file_bytes=file_bytes,
            mime_type=file.content_type,
        )
        return InnovationFileItem(
            id=uploaded["id"],
            innovation_id=uploaded["innovation_id"],
            file_name=uploaded["file_name"],
            file_path=uploaded["file_path"],
            file_size=uploaded.get("file_size", 0),
            mime_type=uploaded.get("mime_type"),
            created_at=str(uploaded.get("created_at")),
            download_url=uploaded.get("download_url"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


@router.get("/{innovation_id}/files", response_model=InnovationFileListResponse)
async def list_vault_files(
    innovation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    List all uploaded assets in the Innovation Vault for this innovation with active signed download URLs.
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    inno_res = supabase.table("innovations").select("user_id").eq("id", innovation_id).execute()
    if not inno_res.data:
        raise HTTPException(status_code=404, detail="Innovation not found")
    if inno_res.data[0].get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied. Private by default.")

    try:
        files = storage.list_innovation_files(innovation_id)
        items = [
            InnovationFileItem(
                id=f["id"],
                innovation_id=f["innovation_id"],
                file_name=f["file_name"],
                file_path=f["file_path"],
                file_size=f.get("file_size", 0),
                mime_type=f.get("mime_type"),
                created_at=str(f.get("created_at")),
                download_url=f.get("download_url"),
            )
            for f in files
        ]
        return InnovationFileListResponse(
            innovation_id=innovation_id,
            total=len(items),
            files=items,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list vault files: {str(e)}")


@router.delete("/{innovation_id}/files/{file_id}")
async def delete_vault_file(
    innovation_id: str,
    file_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Delete an uploaded file from Supabase Storage and remove its relational record.
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    inno_res = supabase.table("innovations").select("user_id").eq("id", innovation_id).execute()
    if not inno_res.data:
        raise HTTPException(status_code=404, detail="Innovation not found")
    if inno_res.data[0].get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied. Private by default.")

    try:
        storage.delete_innovation_file(file_id, innovation_id)
        return {"status": "success", "message": "File deleted successfully"}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete vault file: {str(e)}")


# ─── Freeform Development Notes Endpoints (Day 13) ──────────

@router.get("/{innovation_id}/notes", response_model=DevelopmentNotesResponse)
async def get_development_notes(
    innovation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch freeform running development/lab notes for an innovation.
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    inno_res = supabase.table("innovations").select("user_id, structured_data").eq("id", innovation_id).execute()
    if not inno_res.data:
        raise HTTPException(status_code=404, detail="Innovation not found")
    if inno_res.data[0].get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied. Private by default.")

    structured_data = inno_res.data[0].get("structured_data") or {}
    raw_notes = structured_data.get("development_notes", [])

    items = [
        DevelopmentNoteItem(
            id=n.get("id", str(uuid.uuid4())),
            title=n.get("title", "Lab Note"),
            content=n.get("content", ""),
            created_at=str(n.get("created_at")),
            updated_at=str(n.get("updated_at")) if n.get("updated_at") else None,
        )
        for n in raw_notes
    ]
    return DevelopmentNotesResponse(
        innovation_id=innovation_id,
        total=len(items),
        notes=items,
    )


@router.post("/{innovation_id}/notes", response_model=DevelopmentNoteItem, status_code=status.HTTP_201_CREATED)
async def add_development_note(
    innovation_id: str,
    payload: DevelopmentNoteCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Add a new timestamped running development note to an innovation.
    """
    from datetime import datetime, timezone
    user_id = current_user["id"]
    supabase = get_supabase()

    inno_res = supabase.table("innovations").select("user_id, structured_data").eq("id", innovation_id).execute()
    if not inno_res.data:
        raise HTTPException(status_code=404, detail="Innovation not found")
    if inno_res.data[0].get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied. Private by default.")

    structured_data = inno_res.data[0].get("structured_data") or {}
    notes = list(structured_data.get("development_notes", []))

    now_iso = datetime.now(timezone.utc).isoformat()
    note_id = str(uuid.uuid4())
    new_note = {
        "id": note_id,
        "title": payload.title or "Lab Note",
        "content": payload.content,
        "created_at": now_iso,
    }

    # Prepend newest note
    notes.insert(0, new_note)
    structured_data["development_notes"] = notes

    supabase.table("innovations").update({
        "structured_data": structured_data,
        "updated_at": now_iso,
    }).eq("id", innovation_id).execute()

    return DevelopmentNoteItem(**new_note)


@router.delete("/{innovation_id}/notes/{note_id}")
async def delete_development_note(
    innovation_id: str,
    note_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Delete a development note.
    """
    from datetime import datetime, timezone
    user_id = current_user["id"]
    supabase = get_supabase()

    inno_res = supabase.table("innovations").select("user_id, structured_data").eq("id", innovation_id).execute()
    if not inno_res.data:
        raise HTTPException(status_code=404, detail="Innovation not found")
    if inno_res.data[0].get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied. Private by default.")

    structured_data = inno_res.data[0].get("structured_data") or {}
    notes = structured_data.get("development_notes", [])
    updated_notes = [n for n in notes if n.get("id") != note_id]

    if len(updated_notes) == len(notes):
        raise HTTPException(status_code=404, detail="Note not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    structured_data["development_notes"] = updated_notes
    supabase.table("innovations").update({
        "structured_data": structured_data,
        "updated_at": now_iso,
    }).eq("id", innovation_id).execute()

    return {"status": "success", "message": "Development note deleted"}


# ─── Idea Re-Analysis & Provenance Advancing (Day 13) ────────

@router.post("/{innovation_id}/reanalyze", response_model=ReanalyzeResponse)
async def reanalyze_innovation(
    innovation_id: str,
    payload: ReanalyzeRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Re-run the full AI discovery pipeline on an updated technical idea description.
    Advances version from v_n to v_{n+1}, preserves running development notes,
    and cryptographically chains previous_hash into provenance_records.
    """
    from datetime import datetime, timezone
    user_id = current_user["id"]
    supabase = get_supabase()

    # 1. Ownership & existence check
    inno_res = supabase.table("innovations").select("*").eq("id", innovation_id).execute()
    if not inno_res.data:
        raise HTTPException(status_code=404, detail="Innovation not found")
    inno = inno_res.data[0]
    if inno.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied. Private by default.")

    # 2. Re-run analysis pipeline
    try:
        pipeline_res = await run_analysis_pipeline(payload.raw_text, custom_innovation_id=innovation_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Re-analysis failed: {str(e)}")

    # 3. Determine next version and previous_hash
    prov_res = (
        supabase.table("provenance_records")
        .select("*")
        .eq("innovation_id", innovation_id)
        .order("version", desc=True)
        .limit(1)
        .execute()
    )
    latest_rec = prov_res.data[0] if prov_res.data else None
    current_ver = int(latest_rec.get("version", 1)) if latest_rec else int(inno.get("current_version", 1))
    new_version = current_ver + 1
    previous_hash = latest_rec.get("document_hash") if latest_rec else None

    # 4. Prepare snapshot (preserve development notes from previous structured_data)
    now_iso = datetime.now(timezone.utc).isoformat()
    structured_dict = pipeline_res["structured_idea"].model_dump()
    existing_notes = (inno.get("structured_data") or {}).get("development_notes", [])
    if existing_notes:
        structured_dict["development_notes"] = existing_notes

    new_snapshot = {
        "raw_input": payload.raw_text,
        "structured_data": structured_dict,
        "timestamp": now_iso,
    }

    # 5. Compute new hash linked to previous_hash
    new_doc_hash = provenance.compute_snapshot_hash(
        innovation_id=innovation_id,
        version=new_version,
        snapshot=new_snapshot,
        previous_hash=previous_hash,
        created_at_iso=now_iso,
    )

    # 6. Insert new provenance record into Supabase
    prov_insert = {
        "innovation_id": innovation_id,
        "version": new_version,
        "document_hash": new_doc_hash,
        "previous_hash": previous_hash,
        "snapshot": new_snapshot,
    }
    supabase.table("provenance_records").insert(prov_insert).execute()

    # 7. Update innovation record
    inno_updates = {
        "title": pipeline_res["structured_idea"].title,
        "raw_input": payload.raw_text,
        "structured_data": structured_dict,
        "current_version": new_version,
        "updated_at": now_iso,
    }
    supabase.table("innovations").update(inno_updates).eq("id", innovation_id).execute()

    # 8. Upsert assessment scores
    raw_scores = pipeline_res["raw_scores"]
    assess_update = {
        "innovation_id": innovation_id,
        "prior_art_density": raw_scores["prior_art_density"]["score"],
        "feature_novelty": raw_scores["feature_novelty"]["score"],
        "combination_distinctiveness": raw_scores["combination_distinctiveness"]["score"],
        "research_freshness": raw_scores["research_freshness"]["score"],
        "evidence_strength": raw_scores["evidence_strength"]["score"],
        "search_confidence": raw_scores["search_confidence"]["score"],
        "summary_text": pipeline_res["assessment_summary"],
    }
    supabase.table("assessments").upsert(assess_update, on_conflict="innovation_id").execute()

    # 9. Cache new report
    cache_report(innovation_id, pipeline_res["report"])

    # 10. Fetch updated innovation for response
    updated_inno_res = supabase.table("innovations").select("*").eq("id", innovation_id).execute()
    updated_inno = updated_inno_res.data[0] if updated_inno_res.data else inno

    return ReanalyzeResponse(
        status="success",
        message=f"Idea re-analyzed successfully. Advanced to Version {new_version} and cryptographically chained to Version {current_ver}.",
        version=new_version,
        document_hash=new_doc_hash,
        previous_hash=previous_hash,
        innovation=updated_inno,
        scores=raw_scores,
        report=pipeline_res["report"],
    )


# ─── Creator Pathways Selection Endpoints (Day 15 / Week 3) ───

ALLOWED_PATHWAYS = {"protect", "share", "connect", "build"}

@router.get("/{innovation_id}/paths", response_model=PathSelectionResponse)
async def get_innovation_paths(
    innovation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get creator's selected commercialization pathways for an innovation.
    Enforces Rule 4: Private by default.
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    inno_res = supabase.table("innovations").select("user_id, structured_data, updated_at").eq("id", innovation_id).execute()
    if not inno_res.data:
        raise HTTPException(status_code=404, detail="Innovation not found")
    inno = inno_res.data[0]
    if inno.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied. Private by default.")

    structured_data = inno.get("structured_data") or {}
    selected_paths = structured_data.get("selected_paths", [])

    return PathSelectionResponse(
        status="success",
        innovation_id=innovation_id,
        selected_paths=selected_paths,
        updated_at=str(inno.get("updated_at") or ""),
        message=f"{len(selected_paths)} pathway(s) currently selected.",
    )


@router.post("/{innovation_id}/paths", response_model=PathSelectionResponse)
async def update_innovation_paths(
    innovation_id: str,
    payload: PathSelectionRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Save creator's selected commercialization pathways (protect, share, connect, build).
    Supports multi-path selection (pathways are non-mutually exclusive).
    Enforces Rule 4: Private by default.
    """
    from datetime import datetime, timezone
    user_id = current_user["id"]
    supabase = get_supabase()

    # Verify ownership
    inno_res = supabase.table("innovations").select("user_id, structured_data").eq("id", innovation_id).execute()
    if not inno_res.data:
        raise HTTPException(status_code=404, detail="Innovation not found")
    inno = inno_res.data[0]
    if inno.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied. Private by default.")

    # Validate pathway keys
    cleaned_paths = []
    for p in payload.paths:
        p_clean = p.strip().lower()
        if p_clean in ALLOWED_PATHWAYS and p_clean not in cleaned_paths:
            cleaned_paths.append(p_clean)

    now_iso = datetime.now(timezone.utc).isoformat()
    structured_data = inno.get("structured_data") or {}
    structured_data["selected_paths"] = cleaned_paths

    supabase.table("innovations").update({
        "structured_data": structured_data,
        "updated_at": now_iso,
    }).eq("id", innovation_id).execute()

    return PathSelectionResponse(
        status="success",
        innovation_id=innovation_id,
        selected_paths=cleaned_paths,
        updated_at=now_iso,
        message=f"Commercialization pathways updated: {', '.join(cleaned_paths) if cleaned_paths else 'None'}",
    )


# ─── Protect Path Endpoints (Day 16 / Week 3) ─────────────────

@router.post("/{innovation_id}/protect", response_model=PatentPrepResponse)
async def generate_innovation_patent_prep(
    innovation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate or regenerate a Provisional Patent Preparation Package (Day 16 Protect Path).
    Produces section checklists, suggested claim boundaries, prior art gaps, and fee calculations.
    Enforces Rule 4: Private by default.
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    inno_res = supabase.table("innovations").select("*").eq("id", innovation_id).execute()
    if not inno_res.data:
        raise HTTPException(status_code=404, detail="Innovation not found")
    inno = inno_res.data[0]
    if inno.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied. Private by default.")

    # Fetch assessment summary for prior art context
    assess_res = supabase.table("assessments").select("summary_text").eq("innovation_id", innovation_id).execute()
    prior_art_summary = assess_res.data[0].get("summary_text") if assess_res.data else None

    # Generate package
    package = await patent_prep.generate_patent_prep_package(inno, prior_art_summary)

    # Cache package in structured_data (do not mutate user's selected_paths strategy)
    from datetime import datetime, timezone
    now_iso = datetime.now(timezone.utc).isoformat()
    structured_data = inno.get("structured_data") or {}
    structured_data["patent_prep_package"] = package.model_dump()

    supabase.table("innovations").update({
        "structured_data": structured_data,
        "updated_at": now_iso,
    }).eq("id", innovation_id).execute()

    return PatentPrepResponse(
        status="success",
        innovation_id=innovation_id,
        package=package,
        message="Patent readiness & provisional preparation package generated successfully.",
    )


@router.get("/{innovation_id}/protect", response_model=PatentPrepResponse)
async def get_innovation_patent_prep(
    innovation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch existing patent readiness package or generate if not yet generated.
    Enforces Rule 4: Private by default.
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    inno_res = supabase.table("innovations").select("*").eq("id", innovation_id).execute()
    if not inno_res.data:
        raise HTTPException(status_code=404, detail="Innovation not found")
    inno = inno_res.data[0]
    if inno.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied. Private by default.")

    structured_data = inno.get("structured_data") or {}
    cached_pkg = structured_data.get("patent_prep_package")

    if cached_pkg:
        package = PatentPrepPackage(**cached_pkg)
    else:
        assess_res = supabase.table("assessments").select("summary_text").eq("innovation_id", innovation_id).execute()
        prior_art_summary = assess_res.data[0].get("summary_text") if assess_res.data else None
        package = await patent_prep.generate_patent_prep_package(inno, prior_art_summary)

        from datetime import datetime, timezone
        now_iso = datetime.now(timezone.utc).isoformat()
        structured_data["patent_prep_package"] = package.model_dump()

        supabase.table("innovations").update({
            "structured_data": structured_data,
            "updated_at": now_iso,
        }).eq("id", innovation_id).execute()

    return PatentPrepResponse(
        status="success",
        innovation_id=innovation_id,
        package=package,
        message="Patent preparation package retrieved successfully.",
    )


@router.get("/{innovation_id}/protect/pdf")
async def export_patent_prep_pdf(
    innovation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Stream a multi-page branded PDF of the Provisional Patent Preparation Package.
    Enforces Rule 4: Private by default.
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    inno_res = supabase.table("innovations").select("*").eq("id", innovation_id).execute()
    if not inno_res.data:
        raise HTTPException(status_code=404, detail="Innovation not found")
    inno = inno_res.data[0]
    if inno.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied. Private by default.")

    structured_data = inno.get("structured_data") or {}
    cached_pkg = structured_data.get("patent_prep_package")

    if cached_pkg:
        package = PatentPrepPackage(**cached_pkg)
    else:
        assess_res = supabase.table("assessments").select("summary_text").eq("innovation_id", innovation_id).execute()
        prior_art_summary = assess_res.data[0].get("summary_text") if assess_res.data else None
        package = await patent_prep.generate_patent_prep_package(inno, prior_art_summary)

    pdf_buffer = patent_prep.generate_patent_prep_pdf(package)
    filename = f"innovx_patent_prep_{innovation_id[:8]}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


# ─── Share Path: Defensive Publication Endpoints (Day 17 / Week 3) ───

@router.post("/{innovation_id}/publish", response_model=DefensivePubResponse)
async def generate_innovation_defensive_publication(
    innovation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate or regenerate a formal Defensive Publication document (Day 17 Share Path).
    Produces complete enabling disclosures adhering to IP.com and IBM TDB standards.
    Computes cryptographic SHA-256 hash and updates provenance snapshot.
    Enforces Rule 4: Private by default.
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    inno_res = supabase.table("innovations").select("*").eq("id", innovation_id).execute()
    if not inno_res.data:
        raise HTTPException(status_code=404, detail="Innovation not found")
    inno = inno_res.data[0]
    if inno.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied. Private by default.")

    # Generate publication
    pub = await defensive_pub.generate_defensive_publication(inno)

    # Cache publication in structured_data (do not mutate user's selected_paths strategy)
    from datetime import datetime, timezone
    now_iso = datetime.now(timezone.utc).isoformat()
    structured_data = inno.get("structured_data") or {}
    structured_data["defensive_publication"] = pub.model_dump()

    supabase.table("innovations").update({
        "structured_data": structured_data,
        "updated_at": now_iso,
    }).eq("id", innovation_id).execute()

    return DefensivePubResponse(
        status="success",
        innovation_id=innovation_id,
        publication=pub,
        message="Defensive publication generated successfully.",
    )


@router.get("/{innovation_id}/publish", response_model=DefensivePubResponse)
async def get_innovation_defensive_publication(
    innovation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Retrieve existing defensive publication or generate on-demand.
    Enforces Rule 4: Private by default.
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    inno_res = supabase.table("innovations").select("*").eq("id", innovation_id).execute()
    if not inno_res.data:
        raise HTTPException(status_code=404, detail="Innovation not found")
    inno = inno_res.data[0]
    if inno.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied. Private by default.")

    structured_data = inno.get("structured_data") or {}
    cached_pub = structured_data.get("defensive_publication")

    if cached_pub:
        pub = DefensivePublication(**cached_pub)
    else:
        pub = await defensive_pub.generate_defensive_publication(inno)
        from datetime import datetime, timezone
        now_iso = datetime.now(timezone.utc).isoformat()
        structured_data["defensive_publication"] = pub.model_dump()

        supabase.table("innovations").update({
            "structured_data": structured_data,
            "updated_at": now_iso,
        }).eq("id", innovation_id).execute()

    return DefensivePubResponse(
        status="success",
        innovation_id=innovation_id,
        publication=pub,
        message="Defensive publication retrieved successfully.",
    )


@router.get("/{innovation_id}/publish/pdf")
async def export_defensive_publication_pdf(
    innovation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Stream a multi-page branded PDF of the formal Defensive Publication Bulletin.
    Enforces Rule 4: Private by default.
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    inno_res = supabase.table("innovations").select("*").eq("id", innovation_id).execute()
    if not inno_res.data:
        raise HTTPException(status_code=404, detail="Innovation not found")
    inno = inno_res.data[0]
    if inno.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied. Private by default.")

    structured_data = inno.get("structured_data") or {}
    cached_pub = structured_data.get("defensive_publication")

    if cached_pub:
        pub = DefensivePublication(**cached_pub)
    else:
        pub = await defensive_pub.generate_defensive_publication(inno)

    pdf_buffer = defensive_pub.generate_defensive_pub_pdf(pub)
    filename = f"innovx_defensive_disclosure_{innovation_id[:8]}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.get("/{innovation_id}/publish/text")
async def export_defensive_publication_text(
    innovation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Export the defensive publication as standard Markdown for direct copy-paste or upload
    to IP.com, TDCommons, Research Disclosure, or arXiv.
    Enforces Rule 4: Private by default.
    """
    from fastapi.responses import Response

    user_id = current_user["id"]
    supabase = get_supabase()

    inno_res = supabase.table("innovations").select("*").eq("id", innovation_id).execute()
    if not inno_res.data:
        raise HTTPException(status_code=404, detail="Innovation not found")
    inno = inno_res.data[0]
    if inno.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied. Private by default.")

    structured_data = inno.get("structured_data") or {}
    cached_pub = structured_data.get("defensive_publication")

    if cached_pub:
        pub = DefensivePublication(**cached_pub)
    else:
        pub = await defensive_pub.generate_defensive_publication(inno)

    md_text = defensive_pub.format_publication_as_markdown(pub)
    filename = f"defensive_disclosure_{innovation_id[:8]}.md"

    return Response(
        content=md_text,
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


