"""
FastAPI Router for Crowdfunding Campaign Generator (Day 22 / Week 4 Build Path).
Endpoints:
- POST /api/campaigns/generate/{innovation_id} : Generate full campaign package via Gemini
- GET  /api/campaigns/{innovation_id}          : Retrieve cached campaign or generate on-demand
- PUT  /api/campaigns/{innovation_id}          : Update campaign draft copy & reward tiers
- POST /api/campaigns/{innovation_id}/export   : Generate formatted platform markdown
Enforces Rule 4: Private by default (creator ownership verification).
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.auth import get_current_user
from services.supabase_client import get_supabase
from services import campaign_gen, campaign_export
from models.schemas import (
    CrowdfundingCampaign,
    CampaignResponse,
    CampaignUpdateRequest,
    PlatformGuidesResponse,
    CampaignExportResponse,
)

router = APIRouter()


def _is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, AttributeError):
        return False


@router.post("/generate/{innovation_id}", response_model=CampaignResponse)
async def generate_campaign(
    innovation_id: str,
    platform: str = Query("kickstarter", description="Platform: kickstarter, indiegogo, crowd_supply"),
    current_user: dict = Depends(get_current_user),
):
    """
    Generate or regenerate a crowdfunding campaign package for an innovation.
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

    # Generate campaign package
    campaign = await campaign_gen.generate_crowdfunding_campaign(inno, platform=platform)

    now_iso = datetime.now(timezone.utc).isoformat()
    campaign_dump = campaign.model_dump()

    # Save to campaigns table in Supabase
    existing_campaign = (
        supabase.table("campaigns")
        .select("id")
        .eq("innovation_id", innovation_id)
        .execute()
    )

    if existing_campaign.data:
        campaign_id = existing_campaign.data[0]["id"]
        supabase.table("campaigns").update({
            "platform": platform.lower(),
            "campaign_data": campaign_dump,
            "updated_at": now_iso,
        }).eq("id", campaign_id).execute()
        campaign.id = campaign_id
    else:
        insert_res = supabase.table("campaigns").insert({
            "innovation_id": innovation_id,
            "platform": platform.lower(),
            "campaign_data": campaign_dump,
            "created_at": now_iso,
            "updated_at": now_iso,
        }).execute()
        if insert_res.data:
            campaign.id = insert_res.data[0]["id"]

    # Cache in innovation structured_data
    structured_data = inno.get("structured_data") or {}
    structured_data["campaign_data"] = campaign.model_dump()

    supabase.table("innovations").update({
        "structured_data": structured_data,
        "updated_at": now_iso,
    }).eq("id", innovation_id).execute()

    return CampaignResponse(
        status="success",
        campaign=campaign,
        message="AI Crowdfunding Campaign generated successfully.",
    )


@router.get("/guides", response_model=PlatformGuidesResponse)
async def get_crowdfunding_guides():
    """
    Retrieve platform-specific guidelines, submission checklists, and fee structures
    for Kickstarter, Indiegogo, and Crowd Supply.
    """
    guides = campaign_export.get_platform_guides()
    return PlatformGuidesResponse(status="success", guides=guides)


@router.get("/{innovation_id}", response_model=CampaignResponse)
async def get_campaign(
    innovation_id: str,
    platform: str = Query("kickstarter"),
    current_user: dict = Depends(get_current_user),
):
    """
    Retrieve existing campaign draft or generate on-demand.
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

    # Check campaigns table first
    camp_res = (
        supabase.table("campaigns")
        .select("*")
        .eq("innovation_id", innovation_id)
        .execute()
    )

    if camp_res.data:
        row = camp_res.data[0]
        data = row.get("campaign_data") or {}
        data["id"] = row.get("id")
        campaign = CrowdfundingCampaign(**data)
        return CampaignResponse(
            status="success",
            campaign=campaign,
            message="Campaign draft retrieved successfully.",
        )

    # Check structured_data cache
    structured_data = inno.get("structured_data") or {}
    cached_campaign = structured_data.get("campaign_data")
    if cached_campaign:
        campaign = CrowdfundingCampaign(**cached_campaign)
        return CampaignResponse(
            status="success",
            campaign=campaign,
            message="Campaign draft retrieved from cache.",
        )

    # Generate on-demand if not yet present
    campaign = await campaign_gen.generate_crowdfunding_campaign(inno, platform=platform)
    now_iso = datetime.now(timezone.utc).isoformat()
    campaign_dump = campaign.model_dump()

    insert_res = supabase.table("campaigns").insert({
        "innovation_id": innovation_id,
        "platform": platform.lower(),
        "campaign_data": campaign_dump,
        "created_at": now_iso,
        "updated_at": now_iso,
    }).execute()

    if insert_res.data:
        campaign.id = insert_res.data[0]["id"]

    structured_data["campaign_data"] = campaign.model_dump()
    supabase.table("innovations").update({
        "structured_data": structured_data,
        "updated_at": now_iso,
    }).eq("id", innovation_id).execute()

    return CampaignResponse(
        status="success",
        campaign=campaign,
        message="Campaign draft generated and initialized successfully.",
    )


@router.put("/{innovation_id}", response_model=CampaignResponse)
async def update_campaign(
    innovation_id: str,
    payload: CampaignUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Save creator edits to crowdfunding campaign pitch, reward tiers, and video scenes.
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

    # Fetch existing
    camp_res = (
        supabase.table("campaigns")
        .select("*")
        .eq("innovation_id", innovation_id)
        .execute()
    )

    if camp_res.data:
        existing_data = camp_res.data[0].get("campaign_data") or {}
        campaign_db_id = camp_res.data[0]["id"]
    else:
        # Fallback to structured_data
        existing_data = (inno.get("structured_data") or {}).get("campaign_data") or {}
        campaign_db_id = None

    campaign_obj = CrowdfundingCampaign(**existing_data) if existing_data else await campaign_gen.generate_crowdfunding_campaign(inno)

    # Apply updates from payload
    update_dict = payload.model_dump(exclude_unset=True)
    current_dict = campaign_obj.model_dump()
    current_dict.update(update_dict)
    now_iso = datetime.now(timezone.utc).isoformat()
    current_dict["updated_at"] = now_iso
    current_dict["id"] = campaign_db_id

    updated_campaign = CrowdfundingCampaign(**current_dict)
    updated_dump = updated_campaign.model_dump()

    # Save to campaigns table
    if campaign_db_id:
        supabase.table("campaigns").update({
            "campaign_data": updated_dump,
            "updated_at": now_iso,
        }).eq("id", campaign_db_id).execute()
    else:
        ins = supabase.table("campaigns").insert({
            "innovation_id": innovation_id,
            "platform": updated_campaign.platform,
            "campaign_data": updated_dump,
            "created_at": now_iso,
            "updated_at": now_iso,
        }).execute()
        if ins.data:
            updated_campaign.id = ins.data[0]["id"]

    # Cache in structured_data
    struct = inno.get("structured_data") or {}
    struct["campaign_data"] = updated_campaign.model_dump()
    supabase.table("innovations").update({
        "structured_data": struct,
        "updated_at": now_iso,
    }).eq("id", innovation_id).execute()

    return CampaignResponse(
        status="success",
        campaign=updated_campaign,
        message="Campaign draft saved successfully.",
    )


@router.post("/{innovation_id}/export", response_model=CampaignExportResponse)
async def export_campaign_markdown(
    innovation_id: str,
    platform: str = Query("kickstarter", description="kickstarter | indiegogo | crowdsupply"),
    current_user: dict = Depends(get_current_user),
):
    """
    Generate platform-optimized campaign copy formatted for Kickstarter, Indiegogo, or Crowd Supply.
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

    # Retrieve campaign
    camp_res = supabase.table("campaigns").select("*").eq("innovation_id", innovation_id).execute()
    if camp_res.data:
        campaign = CrowdfundingCampaign(**camp_res.data[0]["campaign_data"])
    else:
        campaign = await campaign_gen.generate_crowdfunding_campaign(inno, platform=platform)

    # Format platform-specific markdown
    plat_norm = platform.lower().replace("-", "").replace("_", "")
    if "indie" in plat_norm:
        full_md = campaign_export.export_indiegogo_format(campaign)
        chosen_plat = "indiegogo"
    elif "crowd" in plat_norm:
        full_md = campaign_export.export_crowdsupply_format(campaign)
        chosen_plat = "crowdsupply"
    else:
        full_md = campaign_export.export_kickstarter_format(campaign)
        chosen_plat = "kickstarter"

    word_count = len(full_md.split())

    return CampaignExportResponse(
        status="success",
        platform=chosen_plat,
        markdown_content=full_md,
        word_count=word_count,
    )


@router.get("/{innovation_id}/pdf")
async def export_campaign_pdf_download(
    innovation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate and stream a multi-page branded PDF for the Crowdfunding Campaign.
    Uses pure-Python ReportLab with zero system dependencies.
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

    # Retrieve campaign
    camp_res = supabase.table("campaigns").select("*").eq("innovation_id", innovation_id).execute()
    if camp_res.data:
        campaign = CrowdfundingCampaign(**camp_res.data[0]["campaign_data"])
    else:
        campaign = await campaign_gen.generate_crowdfunding_campaign(inno)

    pdf_buffer = campaign_export.generate_campaign_pdf(campaign)
    filename = f"InnovX_Campaign_{innovation_id[:8]}_{campaign.platform}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )

