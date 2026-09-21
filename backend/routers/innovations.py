"""
Innovations Router — Placeholder for Week 2 CRUD operations.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def list_innovations():
    """List user's innovations. (Week 2)"""
    return {"message": "Innovation management will be implemented in Week 2", "innovations": []}
