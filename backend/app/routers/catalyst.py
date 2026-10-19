from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.models import User
from app.services.auth import get_optional_current_user
from app.services.catalyst import catalyst_service

router = APIRouter(prefix="/api/catalyst", tags=["Zoho Catalyst Cloud"])


@router.get("/status")
async def get_catalyst_status():
    """Retrieve status of Zoho Catalyst cloud database integration."""
    return {
        "is_configured": catalyst_service.is_configured,
        "project_id": catalyst_service.project_id if catalyst_service.is_configured else "Not Configured",
        "data_center": catalyst_service.data_center,
        "tables": {
            "users": "Users",
            "submissions": "Submissions",
            "progress": "UserProgress",
        },
        "mode": "zoho_catalyst_cloud" if catalyst_service.is_configured else "local_sqlite_hybrid",
    }


@router.post("/test")
async def test_catalyst_connection():
    """Test live connectivity with Zoho Catalyst Data Store."""
    res = await catalyst_service.test_connection()
    return res


@router.post("/sync")
async def sync_user_data(
    current_user: User = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Synchronize user profile and activity to Zoho Catalyst Cloud."""
    if not current_user:
        return {
            "synced": False,
            "message": "Anonymous user session. Please sign in to sync with Zoho Catalyst Cloud.",
        }

    row_id = await catalyst_service.sync_user_to_cloud({
        "username": current_user.username,
        "email": current_user.email,
        "display_name": current_user.display_name,
        "target_company": current_user.target_company,
        "streak_days": current_user.streak_days,
        "created_at": current_user.created_at,
    })

    return {
        "synced": True,
        "catalyst_row_id": row_id or current_user.catalyst_row_id or "local_cached",
        "message": "User profile successfully queued for Zoho Catalyst Cloud sync.",
    }
