import logging
from typing import Any, Dict, List, Optional
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.models import Problem, Submission, User

logger = logging.getLogger("cforge.catalyst")


class ZohoCatalystService:
    """Service to integrate with Zoho Catalyst Cloud Data Store (ZCQL & REST API)."""

    def __init__(self):
        self.project_id = settings.CATALYST_PROJECT_ID
        self.client_id = settings.CATALYST_CLIENT_ID
        self.client_secret = settings.CATALYST_CLIENT_SECRET
        self.refresh_token = settings.CATALYST_REFRESH_TOKEN
        self.data_center = settings.CATALYST_DATA_CENTER.lower()
        self._cached_access_token: Optional[str] = None

    @property
    def is_configured(self) -> bool:
        """Returns True if Catalyst project ID is specified."""
        return bool(self.project_id and self.project_id.strip())

    @property
    def base_url(self) -> str:
        """Resolve Zoho Catalyst API domain based on regional data center."""
        domain = {
            "in": "https://api.catalyst.zoho.in",
            "eu": "https://api.catalyst.zoho.eu",
            "com": "https://api.catalyst.zoho.com",
            "au": "https://api.catalyst.zoho.com.au",
            "ca": "https://api.catalyst.zoho.ca",
        }.get(self.data_center, "https://api.catalyst.zoho.com")
        return f"{domain}/baas/v1/project/{self.project_id}"

    async def get_access_token(self) -> Optional[str]:
        """Fetch or refresh OAuth access token from Zoho Accounts."""
        if self._cached_access_token:
            return self._cached_access_token

        if not (self.client_id and self.client_secret and self.refresh_token):
            return None

        accounts_domain = {
            "in": "https://accounts.zoho.in",
            "eu": "https://accounts.zoho.eu",
            "com": "https://accounts.zoho.com",
        }.get(self.data_center, "https://accounts.zoho.com")

        token_url = f"{accounts_domain}/oauth/v2/token"
        params = {
            "refresh_token": self.refresh_token,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "refresh_token",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(token_url, params=params)
                if res.status_code == 200:
                    data = res.json()
                    self._cached_access_token = data.get("access_token")
                    return self._cached_access_token
                else:
                    logger.warning("Zoho Catalyst OAuth refresh failed: %s", res.text)
        except Exception as e:
            logger.error("Error refreshing Zoho Catalyst token: %s", e)
        return None

    async def get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        token = await self.get_access_token()
        if token:
            headers["Authorization"] = f"Zoho-oauthtoken {token}"
        return headers

    async def test_connection(self) -> Dict[str, Any]:
        """Verify Catalyst project connectivity and Data Store availability."""
        if not self.is_configured:
            return {
                "status": "unconfigured",
                "message": "Catalyst Project ID not set. Operating in local SQLite mode.",
                "project_id": None,
                "data_center": self.data_center,
            }

        try:
            token = await self.get_access_token()
            headers = await self.get_headers()
            url = f"{self.base_url}/datastore/table"
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(url, headers=headers)
                if res.status_code in (200, 201):
                    return {
                        "status": "connected",
                        "message": "Successfully connected to Zoho Catalyst Cloud Data Store.",
                        "project_id": self.project_id,
                        "data_center": self.data_center,
                    }
                else:
                    return {
                        "status": "error",
                        "code": res.status_code,
                        "message": f"Zoho Catalyst responded with code {res.status_code}: {res.text}",
                        "project_id": self.project_id,
                    }
        except Exception as e:
            return {
                "status": "offline",
                "message": f"Could not reach Zoho Catalyst: {str(e)}",
                "project_id": self.project_id,
            }

    async def sync_user_to_cloud(self, user_dict: Dict[str, Any]) -> Optional[str]:
        """Save or sync a user profile to Catalyst Data Store table 'Users'."""
        if not self.is_configured:
            return None

        table = settings.CATALYST_TABLE_USERS
        url = f"{self.base_url}/table/{table}/row"
        headers = await self.get_headers()

        payload = [
            {
                "username": user_dict.get("username"),
                "email": user_dict.get("email"),
                "display_name": user_dict.get("display_name"),
                "target_company": user_dict.get("target_company"),
                "streak_days": user_dict.get("streak_days", 1),
                "created_at": str(user_dict.get("created_at")),
            }
        ]

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code in (200, 201):
                    data = res.json()
                    row_id = data.get("data", [{}])[0].get("ROWID")
                    logger.info("Synced user %s to Zoho Catalyst (ROWID: %s)", user_dict.get("username"), row_id)
                    return str(row_id)
        except Exception as e:
            logger.warning("Zoho Catalyst sync user failed (will use local): %s", e)
        return None

    async def sync_submission_to_cloud(
        self,
        username: str,
        problem_slug: str,
        verdict: str,
        time_ms: float,
        memory_kb: int,
    ) -> Optional[str]:
        """Save a submission entry to Catalyst Data Store table 'Submissions'."""
        if not self.is_configured:
            return None

        table = settings.CATALYST_TABLE_SUBMISSIONS
        url = f"{self.base_url}/table/{table}/row"
        headers = await self.get_headers()

        payload = [
            {
                "username": username,
                "problem_slug": problem_slug,
                "verdict": verdict,
                "time_ms": time_ms,
                "memory_kb": memory_kb,
            }
        ]

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code in (200, 201):
                    data = res.json()
                    return str(data.get("data", [{}])[0].get("ROWID"))
        except Exception as e:
            logger.warning("Zoho Catalyst submission sync failed: %s", e)
        return None


catalyst_service = ZohoCatalystService()
