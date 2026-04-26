"""
OpenMetadata REST API client.

Wraps all HTTP calls to the OM server with authentication, retries,
and light response caching.
"""

import httpx
from typing import Any, Optional
from cachetools import TTLCache
from datetime import datetime

from app.config import settings

_CACHE: TTLCache = TTLCache(maxsize=512, ttl=30)


class OMClient:
    def __init__(self):
        self._base = settings.OPENMETADATA_URL.rstrip("/")
        self._token: Optional[str] = None
        self._headers: dict[str, str] = {"Content-Type": "application/json"}

    # ── Authentication ──────────────────────────────────────────────────────

    async def _ensure_auth(self, client: httpx.AsyncClient):
        if settings.OPENMETADATA_JWT_TOKEN:
            self._headers["Authorization"] = f"Bearer {settings.OPENMETADATA_JWT_TOKEN}"
            return
        if self._token:
            return
        resp = await client.post(
            f"{self._base}/users/login",
            json={
                "email": settings.OPENMETADATA_USERNAME,
                "password": settings.OPENMETADATA_PASSWORD,
            },
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            self._token = data.get("accessToken", "")
            self._headers["Authorization"] = f"Bearer {self._token}"

    # ── Generic HTTP helpers ────────────────────────────────────────────────

    async def get(self, path: str, params: Optional[dict] = None, cache: bool = True) -> Any:
        cache_key = f"{path}:{str(params)}"
        if cache and cache_key in _CACHE:
            return _CACHE[cache_key]

        async with httpx.AsyncClient(timeout=15) as client:
            await self._ensure_auth(client)
            resp = await client.get(
                f"{self._base}{path}",
                params=params or {},
                headers=self._headers,
            )
            resp.raise_for_status()
            data = resp.json()
            if cache:
                _CACHE[cache_key] = data
            return data

    async def post(self, path: str, body: dict) -> Any:
        async with httpx.AsyncClient(timeout=15) as client:
            await self._ensure_auth(client)
            resp = await client.post(
                f"{self._base}{path}",
                json=body,
                headers=self._headers,
            )
            resp.raise_for_status()
            return resp.json()

    async def put(self, path: str, body: dict) -> Any:
        async with httpx.AsyncClient(timeout=15) as client:
            await self._ensure_auth(client)
            resp = await client.put(
                f"{self._base}{path}",
                json=body,
                headers=self._headers,
            )
            resp.raise_for_status()
            return resp.json()

    # ── Entity helpers ──────────────────────────────────────────────────────

    async def get_entity(self, entity_type: str, entity_id: str) -> dict:
        """Fetch the current state of any entity."""
        return await self.get(f"/{entity_type}/{entity_id}")

    async def get_entity_versions(self, entity_type: str, entity_id: str) -> dict:
        """Return the version history list for an entity."""
        return await self.get(f"/{entity_type}/{entity_id}/versions")

    async def get_entity_at_version(
        self, entity_type: str, entity_id: str, version: float
    ) -> dict:
        """Return entity snapshot at a specific version number."""
        ver_str = f"{version:.1f}"
        return await self.get(f"/{entity_type}/{entity_id}/versions/{ver_str}")

    # ── Search ──────────────────────────────────────────────────────────────

    async def search(
        self,
        query: str = "*",
        index: str = "dataAsset",
        size: int = 25,
        from_: int = 0,
        filters: Optional[dict] = None,
    ) -> dict:
        params: dict[str, Any] = {
            "q": query,
            "index": index,
            "size": size,
            "from": from_,
        }
        return await self.get("/search/query", params=params)

    # ── Lineage ─────────────────────────────────────────────────────────────

    async def get_lineage(
        self,
        entity_type: str,
        entity_id: str,
        upstream_depth: int = 3,
        downstream_depth: int = 3,
    ) -> dict:
        return await self.get(
            f"/lineage/{entity_type}/{entity_id}",
            params={
                "upstreamDepth": upstream_depth,
                "downstreamDepth": downstream_depth,
            },
            cache=False,
        )

    # ── Activity feed / change events ───────────────────────────────────────

    async def get_feed(
        self,
        entity_link: Optional[str] = None,
        limit: int = 25,
        after: Optional[str] = None,
    ) -> dict:
        params: dict[str, Any] = {"limit": limit}
        if entity_link:
            params["entityLink"] = entity_link
        if after:
            params["after"] = after
        return await self.get("/feed", params=params, cache=False)

    async def get_change_events(
        self,
        entity_type: Optional[str] = None,
        start_ts: Optional[int] = None,
        end_ts: Optional[int] = None,
        event_type: Optional[str] = None,
        limit: int = 50,
    ) -> dict:
        params: dict[str, Any] = {"limit": limit}
        if entity_type:
            params["entityType"] = entity_type
        if start_ts:
            params["timestamp"] = start_ts
        if event_type:
            params["eventType"] = event_type
        return await self.get("/events/subscriptions/eventsRecord", params=params, cache=False)

    # ── Data Quality ────────────────────────────────────────────────────────

    async def get_test_cases(
        self,
        entity_fqn: Optional[str] = None,
        limit: int = 25,
    ) -> dict:
        params: dict[str, Any] = {"limit": limit}
        if entity_fqn:
            params["entityLink"] = f"<#E::table::{entity_fqn}>"
        return await self.get("/dataQuality/testCases", params=params, cache=False)

    async def get_test_case_results(
        self,
        test_case_fqn: str,
        start_ts: Optional[int] = None,
        end_ts: Optional[int] = None,
        limit: int = 30,
    ) -> dict:
        params: dict[str, Any] = {"limit": limit}
        if start_ts:
            params["startTs"] = start_ts
        if end_ts:
            params["endTs"] = end_ts
        return await self.get(
            f"/dataQuality/testCases/{test_case_fqn}/testCaseResult",
            params=params,
            cache=False,
        )

    # ── Tags / Classification ────────────────────────────────────────────────

    async def get_tags(self, limit: int = 50) -> dict:
        return await self.get("/tags", params={"limit": limit})

    async def get_classifications(self, limit: int = 50) -> dict:
        return await self.get("/classifications", params={"limit": limit})

    # ── Teams / Users ────────────────────────────────────────────────────────

    async def get_user(self, user_id: str) -> dict:
        return await self.get(f"/users/{user_id}")

    # ── Tables specific ─────────────────────────────────────────────────────

    async def list_tables(
        self,
        limit: int = 25,
        after: Optional[str] = None,
        database_schema: Optional[str] = None,
    ) -> dict:
        params: dict[str, Any] = {"limit": limit, "fields": "owners,tags,domain"}
        if after:
            params["after"] = after
        if database_schema:
            params["databaseSchema"] = database_schema
        return await self.get("/tables", params=params)

    async def get_table_profile(self, entity_fqn: str) -> dict:
        return await self.get(
            "/tables/name/{fqn}/tableProfile".replace("{fqn}", entity_fqn),
            cache=False,
        )


# ── Singleton ────────────────────────────────────────────────────────────────

om_client = OMClient()
