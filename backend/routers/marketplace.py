"""
Marketplace Router (Day 18 / Week 3).
Handles confidential, NDA-gated marketplace listings.
Enforces Rule 4 (Private by default) and Rule 6 (Confidentiality protection):
Only non-confidential sanitized summaries are exposed publicly;
underlying patentable claims remain shielded.
"""
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query

from services.supabase_client import get_supabase
from services.auth import get_current_user, ensure_user_profile
from models.schemas import (
    SanitizedListingDraft,
    SanitizeDraftResponse,
    MarketplaceListingCreateRequest,
    MarketplaceListingItem,
    MarketplaceListingListResponse,
    MarketplaceListingUpdateRequest,
    AccessRequestCreateRequest,
    AccessRequestItem,
    AccessRequestListResponse,
    AccessRequestReviewRequest,
    ListingAccessStatusResponse,
    FullInnovationDisclosureResponse,
    MessageItem,
    MessageSendRequest,
    MessageThreadItem,
    MessageListResponse,
    ThreadListResponse,
    CreatorListingSummaryItem,
    CreatorListingListResponse,
)
from services import marketplace_sanitizer

router = APIRouter()


def _is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


def _ensure_profile(supabase, user: dict):
    """Ensure a row exists in profiles for user_id to satisfy foreign keys."""
    user_id = user["id"]
    try:
        res = supabase.table("profiles").select("id").eq("id", user_id).execute()
        if not res.data:
            supabase.table("profiles").insert({
                "id": user_id,
                "full_name": user.get("email", "").split("@")[0] or "InnovX Creator",
                "role": "creator",
            }).execute()
    except Exception as e:
        print(f"[WARN] Profile ensure error: {e}")


@router.post("/sanitize/{innovation_id}", response_model=SanitizeDraftResponse)
async def generate_sanitized_draft_endpoint(
    innovation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate an AI-sanitized public summary that withholds patentable mechanisms.
    Only the creator of the innovation may request sanitization.
    """
    if not _is_valid_uuid(innovation_id):
        raise HTTPException(status_code=400, detail="Invalid innovation ID format")

    user_id = current_user["id"]
    supabase = get_supabase()

    # Verify ownership
    res = (
        supabase.table("innovations")
        .select("*")
        .eq("id", innovation_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(
            status_code=404,
            detail="Innovation not found or access unauthorized"
        )

    inno = res.data[0]
    title = inno.get("title", "Untitled Innovation")
    raw_input = inno.get("raw_input", "")
    struct = inno.get("structured_data") or {}
    domain = struct.get("domain", "Technology")

    draft = await marketplace_sanitizer.generate_sanitized_draft(
        title=title,
        domain=domain,
        raw_input=raw_input,
        structured_data=struct,
    )

    return SanitizeDraftResponse(
        status="success",
        innovation_id=innovation_id,
        draft=draft,
        message="AI-sanitized public summary drafted successfully.",
    )


@router.post("/listings", response_model=MarketplaceListingItem)
async def create_or_update_listing(
    payload: MarketplaceListingCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Publish or update a sanitized marketplace listing for an innovation.
    Enforces Rule 4 & Rule 6: only sanitized text is stored in marketplace_listings.
    """
    if not _is_valid_uuid(payload.innovation_id):
        raise HTTPException(status_code=400, detail="Invalid innovation ID format")

    user_id = current_user["id"]
    supabase = get_supabase()
    _ensure_profile(supabase, current_user)

    # Verify user owns innovation
    inno_res = (
        supabase.table("innovations")
        .select("*")
        .eq("id", payload.innovation_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not inno_res.data:
        raise HTTPException(
            status_code=404,
            detail="Innovation not found or you do not have permission to list it."
        )

    inno = inno_res.data[0]

    # Check if a listing already exists for this innovation
    existing = (
        supabase.table("marketplace_listings")
        .select("*")
        .eq("innovation_id", payload.innovation_id)
        .execute()
    )

    listing_record = {
        "innovation_id": payload.innovation_id,
        "creator_id": user_id,
        "public_title": payload.public_title.strip(),
        "public_description": payload.public_description.strip(),
        "domain": payload.domain or inno.get("structured_data", {}).get("domain", "Technology"),
        "stage": payload.stage or "concept",
        "available_for": payload.available_for or ["license", "co_development"],
        "preferred_terms": payload.preferred_terms.strip() if payload.preferred_terms else None,
        "status": "active",
    }

    if existing.data:
        # Update existing listing
        listing_id = existing.data[0]["id"]
        res = (
            supabase.table("marketplace_listings")
            .update(listing_record)
            .eq("id", listing_id)
            .execute()
        )
        saved = res.data[0]
    else:
        # Insert new listing
        res = supabase.table("marketplace_listings").insert(listing_record).execute()
        saved = res.data[0]

    # Update innovation visibility to 'marketplace'
    supabase.table("innovations").update({
        "visibility": "marketplace",
    }).eq("id", payload.innovation_id).execute()

    return MarketplaceListingItem(
        id=saved["id"],
        innovation_id=saved["innovation_id"],
        creator_id=saved["creator_id"],
        public_title=saved["public_title"],
        public_description=saved["public_description"],
        domain=saved.get("domain"),
        stage=saved.get("stage"),
        available_for=saved.get("available_for") or [],
        preferred_terms=saved.get("preferred_terms"),
        status=saved.get("status", "active"),
        created_at=str(saved.get("created_at")),
        target_market=payload.target_market,
        commercial_value_prop=payload.commercial_value_prop,
        withheld_confidential_elements=payload.withheld_confidential_elements,
    )


@router.get("/listings", response_model=MarketplaceListingListResponse)
async def list_public_marketplace_listings(
    domain: Optional[str] = Query(None, description="Filter by domain"),
    stage: Optional[str] = Query(None, description="Filter by development stage"),
    available_for: Optional[str] = Query(None, description="Filter by commercial availability"),
    search: Optional[str] = Query(None, description="Search query in title or description"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    Public catalog of active marketplace listings.
    Displays ONLY sanitized non-confidential summaries.
    """
    supabase = get_supabase()

    query = (
        supabase.table("marketplace_listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", desc=True)
    )

    if domain:
        query = query.ilike("domain", f"%{domain}%")
    if stage:
        query = query.eq("stage", stage)

    res = query.execute()
    data = res.data or []

    # Filter in-memory for array contains and search
    filtered = []
    for row in data:
        if available_for:
            av_list = row.get("available_for") or []
            if available_for not in av_list:
                continue

        if search:
            s = search.lower()
            title = (row.get("public_title") or "").lower()
            desc = (row.get("public_description") or "").lower()
            dom = (row.get("domain") or "").lower()
            if s not in title and s not in desc and s not in dom:
                continue

        filtered.append(row)

    total = len(filtered)
    paginated = filtered[offset : offset + limit]

    items: List[MarketplaceListingItem] = [
        MarketplaceListingItem(
            id=row["id"],
            innovation_id=row["innovation_id"],
            creator_id=row["creator_id"],
            public_title=row["public_title"],
            public_description=row["public_description"],
            domain=row.get("domain"),
            stage=row.get("stage"),
            available_for=row.get("available_for") or [],
            preferred_terms=row.get("preferred_terms"),
            status=row.get("status", "active"),
            created_at=str(row.get("created_at")),
        )
        for row in paginated
    ]

    return MarketplaceListingListResponse(total=total, listings=items)


@router.get("/listings/my", response_model=MarketplaceListingListResponse)
async def list_my_marketplace_listings(
    current_user: dict = Depends(get_current_user),
):
    """
    List all marketplace listings created by the logged-in creator.
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    res = (
        supabase.table("marketplace_listings")
        .select("*")
        .eq("creator_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    data = res.data or []

    items = [
        MarketplaceListingItem(
            id=row["id"],
            innovation_id=row["innovation_id"],
            creator_id=row["creator_id"],
            public_title=row["public_title"],
            public_description=row["public_description"],
            domain=row.get("domain"),
            stage=row.get("stage"),
            available_for=row.get("available_for") or [],
            preferred_terms=row.get("preferred_terms"),
            status=row.get("status", "active"),
            created_at=str(row.get("created_at")),
        )
        for row in data
    ]

    return MarketplaceListingListResponse(total=len(items), listings=items)


@router.get("/listings/{listing_id}", response_model=MarketplaceListingItem)
async def get_marketplace_listing_by_id(
    listing_id: str,
):
    """
    Fetch a single marketplace listing by ID (public sanitized view).
    """
    if not _is_valid_uuid(listing_id):
        raise HTTPException(status_code=400, detail="Invalid listing ID format")

    supabase = get_supabase()
    res = supabase.table("marketplace_listings").select("*").eq("id", listing_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Listing not found")

    row = res.data[0]
    return MarketplaceListingItem(
        id=row["id"],
        innovation_id=row["innovation_id"],
        creator_id=row["creator_id"],
        public_title=row["public_title"],
        public_description=row["public_description"],
        domain=row.get("domain"),
        stage=row.get("stage"),
        available_for=row.get("available_for") or [],
        preferred_terms=row.get("preferred_terms"),
        status=row.get("status", "active"),
        created_at=str(row.get("created_at")),
    )


@router.patch("/listings/{listing_id}", response_model=MarketplaceListingItem)
async def update_marketplace_listing(
    listing_id: str,
    payload: MarketplaceListingUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Update a listing's status, terms, or sanitized description.
    Only the listing creator may edit.
    """
    if not _is_valid_uuid(listing_id):
        raise HTTPException(status_code=400, detail="Invalid listing ID format")

    user_id = current_user["id"]
    supabase = get_supabase()

    # Verify ownership
    existing = (
        supabase.table("marketplace_listings")
        .select("*")
        .eq("id", listing_id)
        .eq("creator_id", user_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Listing not found or access denied")

    updates: Dict[str, Any] = {}
    if payload.public_title is not None:
        updates["public_title"] = payload.public_title.strip()
    if payload.public_description is not None:
        updates["public_description"] = payload.public_description.strip()
    if payload.domain is not None:
        updates["domain"] = payload.domain
    if payload.stage is not None:
        updates["stage"] = payload.stage
    if payload.available_for is not None:
        updates["available_for"] = payload.available_for
    if payload.preferred_terms is not None:
        updates["preferred_terms"] = payload.preferred_terms.strip()
    if payload.status is not None:
        if payload.status not in ["active", "paused", "closed"]:
            raise HTTPException(status_code=400, detail="Invalid status value")
        updates["status"] = payload.status

    if not updates:
        row = existing.data[0]
    else:
        res = (
            supabase.table("marketplace_listings")
            .update(updates)
            .eq("id", listing_id)
            .execute()
        )
        row = res.data[0]

        # If status set to closed or paused, adjust innovation visibility
        if payload.status == "closed":
            supabase.table("innovations").update({"visibility": "private"}).eq(
                "id", row["innovation_id"]
            ).execute()
        elif payload.status == "active":
            supabase.table("innovations").update({"visibility": "marketplace"}).eq(
                "id", row["innovation_id"]
            ).execute()

    return MarketplaceListingItem(
        id=row["id"],
        innovation_id=row["innovation_id"],
        creator_id=row["creator_id"],
        public_title=row["public_title"],
        public_description=row["public_description"],
        domain=row.get("domain"),
        stage=row.get("stage"),
        available_for=row.get("available_for") or [],
        preferred_terms=row.get("preferred_terms"),
        status=row.get("status", "active"),
        created_at=str(row.get("created_at")),
    )


@router.delete("/listings/{listing_id}")
async def delete_marketplace_listing(
    listing_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Remove a listing from the marketplace.
    Reverts innovation visibility to 'private'.
    """
    if not _is_valid_uuid(listing_id):
        raise HTTPException(status_code=400, detail="Invalid listing ID format")

    user_id = current_user["id"]
    supabase = get_supabase()

    existing = (
        supabase.table("marketplace_listings")
        .select("*")
        .eq("id", listing_id)
        .eq("creator_id", user_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Listing not found or access denied")

    inno_id = existing.data[0]["innovation_id"]

    # Delete listing
    supabase.table("marketplace_listings").delete().eq("id", listing_id).execute()

    # Revert innovation visibility
    supabase.table("innovations").update({"visibility": "private"}).eq(
        "id", inno_id
    ).execute()

    return {"status": "success", "message": "Marketplace listing removed"}


# ─── NDA Gating & Access Request Endpoints (Day 19 / Week 3) ────

@router.post("/listings/{listing_id}/request-access", response_model=AccessRequestItem)
async def request_listing_access(
    listing_id: str,
    payload: Optional[AccessRequestCreateRequest] = None,
    current_user: dict = Depends(get_current_user),
):
    """
    Prospective buyer signs digital Mutual NDA and submits access request.
    Enforces Rule 6: Full claims remain confidential pending creator approval.
    """
    if not _is_valid_uuid(listing_id):
        raise HTTPException(status_code=400, detail="Invalid listing ID format")

    user_id = current_user["id"]
    supabase = get_supabase()
    _ensure_profile(supabase, current_user)

    # Fetch listing
    list_res = supabase.table("marketplace_listings").select("*").eq("id", listing_id).execute()
    if not list_res.data:
        raise HTTPException(status_code=404, detail="Marketplace listing not found")

    listing = list_res.data[0]
    if listing["creator_id"] == user_id:
        raise HTTPException(
            status_code=400,
            detail="You are the creator of this listing; you already possess unrestricted access."
        )

    # Check if request already exists
    existing = (
        supabase.table("access_requests")
        .select("*")
        .eq("listing_id", listing_id)
        .eq("requestor_id", user_id)
        .execute()
    )
    if existing.data:
        row = existing.data[0]
        return AccessRequestItem(
            id=row["id"],
            listing_id=row["listing_id"],
            requestor_id=row["requestor_id"],
            requestor_email=current_user.get("email"),
            listing_title=listing.get("public_title"),
            domain=listing.get("domain"),
            stage=listing.get("stage"),
            nda_accepted=row.get("nda_accepted", True),
            nda_accepted_at=str(row.get("nda_accepted_at")),
            status=row.get("status", "pending"),
            created_at=str(row.get("created_at")),
        )

    # Insert new access request with digital NDA acceptance timestamp
    now_iso = datetime.now(timezone.utc).isoformat()
    record = {
        "listing_id": listing_id,
        "requestor_id": user_id,
        "nda_accepted": True,
        "nda_accepted_at": now_iso,
        "status": "pending",
    }
    insert_res = supabase.table("access_requests").insert(record).execute()
    new_row = insert_res.data[0]

    return AccessRequestItem(
        id=new_row["id"],
        listing_id=new_row["listing_id"],
        requestor_id=new_row["requestor_id"],
        requestor_email=current_user.get("email"),
        listing_title=listing.get("public_title"),
        domain=listing.get("domain"),
        stage=listing.get("stage"),
        nda_accepted=new_row.get("nda_accepted", True),
        nda_accepted_at=str(new_row.get("nda_accepted_at")),
        status=new_row.get("status", "pending"),
        created_at=str(new_row.get("created_at")),
    )


@router.get("/listings/{listing_id}/access-status", response_model=ListingAccessStatusResponse)
async def get_listing_access_status(
    listing_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Check if the authenticated user has requested/obtained NDA-gated access for a listing.
    """
    if not _is_valid_uuid(listing_id):
        raise HTTPException(status_code=400, detail="Invalid listing ID format")

    user_id = current_user["id"]
    supabase = get_supabase()

    # Check if user is creator
    list_res = supabase.table("marketplace_listings").select("creator_id").eq("id", listing_id).execute()
    if list_res.data and list_res.data[0]["creator_id"] == user_id:
        return ListingAccessStatusResponse(
            has_requested=True,
            status="approved",
            nda_accepted=True,
        )

    res = (
        supabase.table("access_requests")
        .select("*")
        .eq("listing_id", listing_id)
        .eq("requestor_id", user_id)
        .execute()
    )
    if not res.data:
        return ListingAccessStatusResponse(
            has_requested=False,
            status="none",
            nda_accepted=False,
        )

    row = res.data[0]
    return ListingAccessStatusResponse(
        has_requested=True,
        status=row.get("status", "pending"),
        nda_accepted=row.get("nda_accepted", False),
        request_id=row["id"],
    )


@router.get("/access-requests/incoming", response_model=AccessRequestListResponse)
async def list_incoming_access_requests(
    current_user: dict = Depends(get_current_user),
):
    """
    List all inbound access requests across all listings owned by the creator.
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    # 1. Fetch user's listings
    my_listings = (
        supabase.table("marketplace_listings")
        .select("id, public_title, domain, stage")
        .eq("creator_id", user_id)
        .execute()
    )
    listings_by_id = {row["id"]: row for row in (my_listings.data or [])}
    if not listings_by_id:
        return AccessRequestListResponse(total=0, requests=[])

    # 2. Fetch requests for these listings
    listing_ids = list(listings_by_id.keys())
    req_res = (
        supabase.table("access_requests")
        .select("*")
        .in_("listing_id", listing_ids)
        .order("created_at", desc=True)
        .execute()
    )
    requests = req_res.data or []

    # 3. Fetch requestor profiles
    requestor_ids = list(set([r["requestor_id"] for r in requests]))
    profiles_by_id = {}
    if requestor_ids:
        prof_res = (
            supabase.table("profiles")
            .select("id, full_name")
            .in_("id", requestor_ids)
            .execute()
        )
        profiles_by_id = {p["id"]: p for p in (prof_res.data or [])}

    items = []
    for r in requests:
        listing = listings_by_id.get(r["listing_id"], {})
        profile = profiles_by_id.get(r["requestor_id"], {})
        items.append(
            AccessRequestItem(
                id=r["id"],
                listing_id=r["listing_id"],
                requestor_id=r["requestor_id"],
                requestor_name=profile.get("full_name") or "Prospective Licensee",
                listing_title=listing.get("public_title"),
                domain=listing.get("domain"),
                stage=listing.get("stage"),
                nda_accepted=r.get("nda_accepted", True),
                nda_accepted_at=str(r.get("nda_accepted_at")),
                status=r.get("status", "pending"),
                created_at=str(r.get("created_at")),
            )
        )

    return AccessRequestListResponse(total=len(items), requests=items)


@router.get("/access-requests/my", response_model=AccessRequestListResponse)
async def list_my_access_requests(
    current_user: dict = Depends(get_current_user),
):
    """
    List all access requests submitted by the logged-in buyer.
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    req_res = (
        supabase.table("access_requests")
        .select("*")
        .eq("requestor_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    requests = req_res.data or []
    if not requests:
        return AccessRequestListResponse(total=0, requests=[])

    listing_ids = list(set([r["listing_id"] for r in requests]))
    list_res = (
        supabase.table("marketplace_listings")
        .select("id, public_title, domain, stage")
        .in_("id", listing_ids)
        .execute()
    )
    listings_by_id = {l["id"]: l for l in (list_res.data or [])}

    items = []
    for r in requests:
        listing = listings_by_id.get(r["listing_id"], {})
        items.append(
            AccessRequestItem(
                id=r["id"],
                listing_id=r["listing_id"],
                requestor_id=r["requestor_id"],
                requestor_email=current_user.get("email"),
                listing_title=listing.get("public_title"),
                domain=listing.get("domain"),
                stage=listing.get("stage"),
                nda_accepted=r.get("nda_accepted", True),
                nda_accepted_at=str(r.get("nda_accepted_at")),
                status=r.get("status", "pending"),
                created_at=str(r.get("created_at")),
            )
        )

    return AccessRequestListResponse(total=len(items), requests=items)


@router.post("/access-requests/{request_id}/review", response_model=AccessRequestItem)
async def review_access_request(
    request_id: str,
    payload: AccessRequestReviewRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Creator approves or rejects a buyer's NDA access request.
    Upon approval, requestor is authorized to view the uncensored report.
    """
    if not _is_valid_uuid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID format")

    if payload.action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")

    user_id = current_user["id"]
    supabase = get_supabase()

    # Fetch request
    req_res = supabase.table("access_requests").select("*").eq("id", request_id).execute()
    if not req_res.data:
        raise HTTPException(status_code=404, detail="Access request not found")

    req = req_res.data[0]
    listing_id = req["listing_id"]

    # Verify that current user owns the listing
    list_res = (
        supabase.table("marketplace_listings")
        .select("*")
        .eq("id", listing_id)
        .eq("creator_id", user_id)
        .execute()
    )
    if not list_res.data:
        raise HTTPException(status_code=403, detail="You do not have permission to review this request")

    listing = list_res.data[0]
    new_status = "approved" if payload.action == "approve" else "rejected"

    update_res = (
        supabase.table("access_requests")
        .update({"status": new_status})
        .eq("id", request_id)
        .execute()
    )
    updated = update_res.data[0]

    return AccessRequestItem(
        id=updated["id"],
        listing_id=updated["listing_id"],
        requestor_id=updated["requestor_id"],
        listing_title=listing.get("public_title"),
        domain=listing.get("domain"),
        stage=listing.get("stage"),
        nda_accepted=updated.get("nda_accepted", True),
        nda_accepted_at=str(updated.get("nda_accepted_at")),
        status=updated.get("status"),
        created_at=str(updated.get("created_at")),
    )


@router.get("/listings/{listing_id}/full-report", response_model=FullInnovationDisclosureResponse)
async def get_confidential_full_disclosure(
    listing_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Access the complete uncensored technical disclosure and prior-art report.
    Enforces Rule 6: Strictly prohibited unless Mutual NDA was executed AND creator approved.
    """
    if not _is_valid_uuid(listing_id):
        raise HTTPException(status_code=400, detail="Invalid listing ID format")

    user_id = current_user["id"]
    supabase = get_supabase()

    # Fetch listing
    list_res = supabase.table("marketplace_listings").select("*").eq("id", listing_id).execute()
    if not list_res.data:
        raise HTTPException(status_code=404, detail="Marketplace listing not found")

    listing = list_res.data[0]
    inno_id = listing["innovation_id"]
    creator_id = listing["creator_id"]

    is_creator = creator_id == user_id
    is_approved_requestor = False

    if not is_creator:
        # Check approved access request
        req_res = (
            supabase.table("access_requests")
            .select("*")
            .eq("listing_id", listing_id)
            .eq("requestor_id", user_id)
            .eq("status", "approved")
            .eq("nda_accepted", True)
            .execute()
        )
        if req_res.data:
            is_approved_requestor = True

    if not is_creator and not is_approved_requestor:
        raise HTTPException(
            status_code=403,
            detail=(
                "Access Denied (Rule 6 NDA Gating): Uncensored claims, schematics, and full innovation "
                "reports are strictly restricted. You must digitally execute the Mutual NDA and receive "
                "creator authorization prior to viewing confidential disclosures."
            ),
        )

    # Fetch underlying innovation
    inno_res = supabase.table("innovations").select("*").eq("id", inno_id).execute()
    if not inno_res.data:
        raise HTTPException(status_code=404, detail="Underlying innovation record not found")

    inno = inno_res.data[0]

    # Fetch assessment scores
    assess_res = supabase.table("assessments").select("*").eq("innovation_id", inno_id).execute()
    scores = None
    if assess_res.data:
        a = assess_res.data[0]
        scores = {
            "prior_art_density": a.get("prior_art_density"),
            "feature_novelty": a.get("feature_novelty"),
            "combination_distinctiveness": a.get("combination_distinctiveness"),
            "research_freshness": a.get("research_freshness"),
            "evidence_strength": a.get("evidence_strength"),
            "commercial_viability": a.get("commercial_viability"),
        }

    now_iso = datetime.now(timezone.utc).isoformat()
    return FullInnovationDisclosureResponse(
        status="success",
        listing_id=listing_id,
        innovation_id=inno_id,
        title=inno.get("title", listing.get("public_title")),
        raw_input=inno.get("raw_input", ""),
        structured_data=inno.get("structured_data"),
        scores=scores,
        assessment_summary=inno.get("assessment_summary"),
        report=inno.get("report"),
        disclosed_under_nda=True,
        authorized_at=now_iso,
    )


# ─── Day 20: In-Platform Confidential Messaging & Management Endpoints ────────

@router.post("/listings/{listing_id}/messages", response_model=MessageItem)
async def send_listing_message(
    listing_id: str,
    payload: MessageSendRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Send a secure in-platform message regarding a marketplace listing.
    Enforces Rule 6 (Confidentiality & Access Gating):
    - A buyer can ONLY message if their access request is APPROVED and Mutual NDA was executed.
    - A creator can message any requestor regarding their listing.
    - Zero IP Leakage: Unauthorized buyers receive 403 Forbidden.
    """
    if not _is_valid_uuid(listing_id):
        raise HTTPException(status_code=400, detail="Invalid listing ID format")

    user_id = current_user["id"]
    supabase = get_supabase()

    # 1. Fetch listing
    list_res = supabase.table("marketplace_listings").select("*").eq("id", listing_id).execute()
    if not list_res.data:
        raise HTTPException(status_code=404, detail="Marketplace listing not found")

    listing = list_res.data[0]
    creator_id = listing["creator_id"]
    is_creator = (user_id == creator_id)

    # 2. Authorization check
    if is_creator:
        if not payload.receiver_id:
            raise HTTPException(
                status_code=400,
                detail="receiver_id is required when creator sends a message to an interested party."
            )
        if not _is_valid_uuid(payload.receiver_id):
            raise HTTPException(status_code=400, detail="Invalid receiver ID format")
        target_receiver_id = payload.receiver_id

        # Verify target submitted an access request for this listing
        req_res = (
            supabase.table("access_requests")
            .select("*")
            .eq("listing_id", listing_id)
            .eq("requestor_id", target_receiver_id)
            .execute()
        )
        if not req_res.data:
            raise HTTPException(
                status_code=400,
                detail="Recipient has not submitted an access request for this listing."
            )
    else:
        # Buyer sending to creator: verify buyer has an APPROVED access request with NDA accepted
        target_receiver_id = creator_id
        req_res = (
            supabase.table("access_requests")
            .select("*")
            .eq("listing_id", listing_id)
            .eq("requestor_id", user_id)
            .eq("status", "approved")
            .eq("nda_accepted", True)
            .execute()
        )
        if not req_res.data:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Access Denied (Rule 6 Confidentiality): Direct confidential messaging is only available "
                    "to prospective buyers who have executed the Mutual NDA and received creator approval."
                )
            )

    # 3. Ensure profiles exist
    ensure_user_profile(user_id, email=current_user.get("email"))
    ensure_user_profile(target_receiver_id)

    # 4. Insert message
    msg_record = {
        "listing_id": listing_id,
        "sender_id": user_id,
        "receiver_id": target_receiver_id,
        "content": payload.content.strip(),
    }
    insert_res = supabase.table("messages").insert(msg_record).execute()
    if not insert_res.data:
        raise HTTPException(status_code=500, detail="Failed to save message")

    saved_msg = insert_res.data[0]

    # 5. Fetch sender & receiver profile names
    sender_prof = supabase.table("profiles").select("full_name").eq("id", user_id).execute()
    receiver_prof = supabase.table("profiles").select("full_name").eq("id", target_receiver_id).execute()

    sender_name = (sender_prof.data[0].get("full_name") if sender_prof.data else None) or "You"
    receiver_name = (receiver_prof.data[0].get("full_name") if receiver_prof.data else None) or "Partner"

    return MessageItem(
        id=saved_msg["id"],
        listing_id=listing_id,
        sender_id=user_id,
        receiver_id=target_receiver_id,
        sender_name=sender_name,
        receiver_name=receiver_name,
        content=saved_msg["content"],
        created_at=str(saved_msg["created_at"]),
        is_from_creator=is_creator,
    )


@router.get("/listings/{listing_id}/messages", response_model=MessageListResponse)
async def get_listing_messages(
    listing_id: str,
    buyer_id: Optional[str] = Query(None, description="Buyer ID to filter conversation (if creator is viewing)"),
    current_user: dict = Depends(get_current_user),
):
    """
    Retrieve message history for a listing between creator and a specific buyer.
    Rule 6: Unauthorized users receive 403 Forbidden.
    """
    if not _is_valid_uuid(listing_id):
        raise HTTPException(status_code=400, detail="Invalid listing ID format")

    user_id = current_user["id"]
    supabase = get_supabase()

    list_res = supabase.table("marketplace_listings").select("*").eq("id", listing_id).execute()
    if not list_res.data:
        raise HTTPException(status_code=404, detail="Marketplace listing not found")

    listing = list_res.data[0]
    creator_id = listing["creator_id"]
    is_creator = (user_id == creator_id)

    if is_creator:
        target_buyer_id = buyer_id
        if not target_buyer_id:
            # Pick first buyer with messages or access request
            first_msg = (
                supabase.table("messages")
                .select("sender_id, receiver_id")
                .eq("listing_id", listing_id)
                .order("created_at", desc=False)
                .limit(1)
                .execute()
            )
            if first_msg.data:
                fm = first_msg.data[0]
                target_buyer_id = fm["receiver_id"] if fm["sender_id"] == creator_id else fm["sender_id"]
            else:
                first_req = (
                    supabase.table("access_requests")
                    .select("requestor_id")
                    .eq("listing_id", listing_id)
                    .order("created_at", desc=False)
                    .limit(1)
                    .execute()
                )
                if first_req.data:
                    target_buyer_id = first_req.data[0]["requestor_id"]

        if not target_buyer_id:
            return MessageListResponse(
                listing_id=listing_id,
                listing_title=listing.get("public_title", "Untitled"),
                messages=[],
            )
    else:
        # User is buyer: check approved access request
        req_res = (
            supabase.table("access_requests")
            .select("*")
            .eq("listing_id", listing_id)
            .eq("requestor_id", user_id)
            .eq("status", "approved")
            .eq("nda_accepted", True)
            .execute()
        )
        if not req_res.data:
            raise HTTPException(
                status_code=403,
                detail="Access Denied: You must have an approved access request under Mutual NDA to view listing messages."
            )
        target_buyer_id = user_id

    # Fetch messages between creator_id and target_buyer_id
    msgs_res = (
        supabase.table("messages")
        .select("*")
        .eq("listing_id", listing_id)
        .order("created_at", desc=False)
        .execute()
    )
    raw_msgs = msgs_res.data or []

    # Filter messages strictly between these two parties
    filtered_msgs = [
        m for m in raw_msgs
        if (m["sender_id"] == creator_id and m["receiver_id"] == target_buyer_id) or
           (m["sender_id"] == target_buyer_id and m["receiver_id"] == creator_id)
    ]

    # Fetch names
    user_ids = list(set([m["sender_id"] for m in filtered_msgs] + [creator_id, target_buyer_id]))
    names_by_id = {}
    if user_ids:
        prof_res = supabase.table("profiles").select("id, full_name").in_("id", user_ids).execute()
        names_by_id = {p["id"]: p.get("full_name") or "InnovX Member" for p in (prof_res.data or [])}

    partner_id = target_buyer_id if is_creator else creator_id
    partner_name = names_by_id.get(partner_id, "Partner")

    items = [
        MessageItem(
            id=m["id"],
            listing_id=m["listing_id"],
            sender_id=m["sender_id"],
            receiver_id=m["receiver_id"],
            sender_name=names_by_id.get(m["sender_id"], "User"),
            receiver_name=names_by_id.get(m["receiver_id"], "User"),
            content=m["content"],
            created_at=str(m["created_at"]),
            is_from_creator=(m["sender_id"] == creator_id),
        )
        for m in filtered_msgs
    ]

    return MessageListResponse(
        listing_id=listing_id,
        listing_title=listing.get("public_title", "Untitled"),
        partner_id=partner_id,
        partner_name=partner_name,
        messages=items,
    )


@router.get("/messages/threads", response_model=ThreadListResponse)
async def list_user_message_threads(
    current_user: dict = Depends(get_current_user),
):
    """
    List all messaging threads for the authenticated user across listings.
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    # Fetch all messages where current user is sender or receiver
    res_sender = (
        supabase.table("messages")
        .select("*")
        .eq("sender_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    res_receiver = (
        supabase.table("messages")
        .select("*")
        .eq("receiver_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    all_msgs = (res_sender.data or []) + (res_receiver.data or [])
    all_msgs.sort(key=lambda m: m.get("created_at", ""), reverse=True)

    if not all_msgs:
        return ThreadListResponse(total=0, threads=[])

    # Group by (listing_id, partner_id)
    thread_map = {}
    for m in all_msgs:
        lid = m["listing_id"]
        partner_id = m["receiver_id"] if m["sender_id"] == user_id else m["sender_id"]
        key = (lid, partner_id)
        if key not in thread_map:
            thread_map[key] = {
                "listing_id": lid,
                "partner_id": partner_id,
                "last_message": m["content"],
                "last_message_at": str(m["created_at"]),
                "message_count": 1,
            }
        else:
            thread_map[key]["message_count"] += 1

    listing_ids = list(set([t["listing_id"] for t in thread_map.values()]))
    partner_ids = list(set([t["partner_id"] for t in thread_map.values()]))

    list_res = supabase.table("marketplace_listings").select("id, public_title, creator_id").in_("id", listing_ids).execute()
    listings_by_id = {l["id"]: l for l in (list_res.data or [])}

    prof_res = supabase.table("profiles").select("id, full_name").in_("id", partner_ids).execute()
    profiles_by_id = {p["id"]: p.get("full_name") or "InnovX Member" for p in (prof_res.data or [])}

    threads = []
    for t in thread_map.values():
        l_info = listings_by_id.get(t["listing_id"], {})
        creator_id = l_info.get("creator_id")
        partner_role = "creator" if t["partner_id"] == creator_id else "buyer"

        threads.append(
            MessageThreadItem(
                listing_id=t["listing_id"],
                listing_title=l_info.get("public_title", "Untitled Innovation"),
                partner_id=t["partner_id"],
                partner_name=profiles_by_id.get(t["partner_id"], "InnovX Member"),
                partner_role=partner_role,
                last_message=t["last_message"],
                last_message_at=t["last_message_at"],
                message_count=t["message_count"],
            )
        )

    threads.sort(key=lambda x: x.last_message_at, reverse=True)
    return ThreadListResponse(total=len(threads), threads=threads)


@router.get("/my-listings-summary", response_model=CreatorListingListResponse)
async def get_creator_listings_summary(
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch all marketplace listings created by current user with request and message counts.
    Directly powers the Creator's 'Manage Listings' view.
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    list_res = (
        supabase.table("marketplace_listings")
        .select("*")
        .eq("creator_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    listings = list_res.data or []
    if not listings:
        return CreatorListingListResponse(total=0, listings=[])

    listing_ids = [l["id"] for l in listings]

    # Fetch access requests
    req_res = (
        supabase.table("access_requests")
        .select("id, listing_id, status")
        .in_("listing_id", listing_ids)
        .execute()
    )
    reqs = req_res.data or []

    # Fetch messages
    msg_res = (
        supabase.table("messages")
        .select("id, listing_id")
        .in_("listing_id", listing_ids)
        .execute()
    )
    msgs = msg_res.data or []

    # Aggregate counts
    pending_counts = {}
    approved_counts = {}
    for r in reqs:
        lid = r["listing_id"]
        if r.get("status") == "pending":
            pending_counts[lid] = pending_counts.get(lid, 0) + 1
        elif r.get("status") == "approved":
            approved_counts[lid] = approved_counts.get(lid, 0) + 1

    msg_counts = {}
    for m in msgs:
        lid = m["listing_id"]
        msg_counts[lid] = msg_counts.get(lid, 0) + 1

    items = []
    for l in listings:
        lid = l["id"]
        items.append(
            CreatorListingSummaryItem(
                id=lid,
                innovation_id=l["innovation_id"],
                public_title=l["public_title"],
                domain=l.get("domain"),
                stage=l.get("stage"),
                available_for=l.get("available_for") or [],
                status=l.get("status", "active"),
                pending_requests_count=pending_counts.get(lid, 0),
                approved_requests_count=approved_counts.get(lid, 0),
                messages_count=msg_counts.get(lid, 0),
                created_at=str(l.get("created_at")),
            )
        )

    return CreatorListingListResponse(total=len(items), listings=items)


@router.get("/my-unlocked-listings", response_model=MarketplaceListingListResponse)
async def list_buyer_unlocked_listings(
    current_user: dict = Depends(get_current_user),
):
    """
    List all innovations that the current user has unlocked under executed Mutual NDA.
    Directly powers the 'Interested Party / Buyer Vault' dashboard.
    """
    user_id = current_user["id"]
    supabase = get_supabase()

    req_res = (
        supabase.table("access_requests")
        .select("listing_id, status, nda_accepted")
        .eq("requestor_id", user_id)
        .eq("status", "approved")
        .eq("nda_accepted", True)
        .execute()
    )
    approved_requests = req_res.data or []
    if not approved_requests:
        return MarketplaceListingListResponse(total=0, listings=[])

    listing_ids = list(set([r["listing_id"] for r in approved_requests]))
    list_res = (
        supabase.table("marketplace_listings")
        .select("*")
        .in_("id", listing_ids)
        .execute()
    )
    data = list_res.data or []

    # Get creator names
    creator_ids = list(set([r.get("creator_id") for r in data if r.get("creator_id")]))
    profiles_by_id = {}
    if creator_ids:
        prof_res = (
            supabase.table("profiles")
            .select("id, full_name")
            .in_("id", creator_ids)
            .execute()
        )
        profiles_by_id = {p["id"]: p.get("full_name") for p in (prof_res.data or [])}

    items = [
        MarketplaceListingItem(
            id=row["id"],
            innovation_id=row["innovation_id"],
            creator_id=row["creator_id"],
            public_title=row["public_title"],
            public_description=row["public_description"],
            domain=row.get("domain"),
            stage=row.get("stage"),
            available_for=row.get("available_for") or [],
            preferred_terms=row.get("preferred_terms"),
            status=row.get("status", "active"),
            created_at=str(row.get("created_at")),
            creator_name=profiles_by_id.get(row.get("creator_id")),
        )
        for row in data
    ]

    return MarketplaceListingListResponse(total=len(items), listings=items)


