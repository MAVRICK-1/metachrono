"""
OpenMetadata REST API client — aligned with OpenMetadata v1.12.6 (sandbox).

All paths are relative to OPENMETADATA_URL which should be set to
  https://sandbox.open-metadata.org/api/v1
  (or http://localhost:8585/api/v1 for local)

Swagger reference: https://sandbox.open-metadata.org/swagger.json
"""

import httpx
from typing import Any, Optional
from cachetools import TTLCache

from app.config import settings

_CACHE: TTLCache = TTLCache(maxsize=512, ttl=30)


class OMClient:
    def __init__(self):
        self._base = settings.OPENMETADATA_URL.rstrip("/")
        self._token: Optional[str] = None
        self._headers: dict[str, str] = {"Content-Type": "application/json"}

    # ── Authentication ──────────────────────────────────────────────────────

    async def _ensure_auth(self, client: httpx.AsyncClient):
        """JWT bearer auth — supports both pre-set token and username/password login."""
        if settings.OPENMETADATA_JWT_TOKEN:
            self._headers["Authorization"] = f"Bearer {settings.OPENMETADATA_JWT_TOKEN}"
            return
        if self._token:
            self._headers["Authorization"] = f"Bearer {self._token}"
            return
        # POST /v1/users/login
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

        async with httpx.AsyncClient(timeout=20) as client:
            await self._ensure_auth(client)
            resp = await client.get(
                f"{self._base}{path}",
                params={k: v for k, v in (params or {}).items() if v is not None},
                headers=self._headers,
            )
            resp.raise_for_status()
            data = resp.json()
            if cache:
                _CACHE[cache_key] = data
            return data

    async def post(self, path: str, body: dict) -> Any:
        async with httpx.AsyncClient(timeout=20) as client:
            await self._ensure_auth(client)
            resp = await client.post(
                f"{self._base}{path}", json=body, headers=self._headers
            )
            resp.raise_for_status()
            return resp.json()

    async def put(self, path: str, body: dict) -> Any:
        async with httpx.AsyncClient(timeout=20) as client:
            await self._ensure_auth(client)
            resp = await client.put(
                f"{self._base}{path}", json=body, headers=self._headers
            )
            resp.raise_for_status()
            return resp.json()

    # ── Entity CRUD ─────────────────────────────────────────────────────────

    async def get_entity(self, entity_type: str, entity_id: str, fields: str = "") -> dict:
        """GET /v1/{entityType}/{id}"""
        params = {}
        if fields:
            params["fields"] = fields
        return await self.get(f"/{entity_type}/{entity_id}", params=params)

    async def get_entity_versions(self, entity_type: str, entity_id: str) -> dict:
        """GET /v1/{entityType}/{id}/versions → EntityHistory"""
        return await self.get(f"/{entity_type}/{entity_id}/versions")

    async def get_entity_at_version(self, entity_type: str, entity_id: str, version: float) -> dict:
        """GET /v1/{entityType}/{id}/versions/{version}"""
        ver_str = f"{version:.1f}"
        return await self.get(f"/{entity_type}/{entity_id}/versions/{ver_str}")

    # ── Audit Logs ──────────────────────────────────────────────────────────

    async def get_audit_logs(
        self,
        entity_type: Optional[str] = None,
        entity_fqn: Optional[str] = None,
        event_type: Optional[str] = None,
        start_ts: Optional[int] = None,
        end_ts: Optional[int] = None,
        user_name: Optional[str] = None,
        limit: int = 50,
        after: Optional[str] = None,
    ) -> dict:
        """
        GET /v1/audit/logs
        Returns structured audit log entries with actor, timestamp, entity info.
        """
        params: dict[str, Any] = {"limit": limit}
        if entity_type:  params["entityType"] = entity_type
        if entity_fqn:   params["entityFQN"] = entity_fqn
        if event_type:   params["eventType"] = event_type
        if start_ts:     params["startTs"] = start_ts
        if end_ts:       params["endTs"] = end_ts
        if user_name:    params["userName"] = user_name
        if after:        params["after"] = after
        return await self.get("/audit/logs", params=params, cache=False)

    # ── Change Summary ───────────────────────────────────────────────────────

    async def get_change_summary(
        self,
        entity_type: str,
        entity_id: str,
        field_prefix: Optional[str] = None,
        limit: int = 100,
    ) -> dict:
        """
        GET /v1/changeSummary/{entityType}/{id}
        Returns who changed each field, source (Manual/AI), and when.
        """
        params: dict[str, Any] = {"limit": limit}
        if field_prefix:
            params["fieldPrefix"] = field_prefix
        return await self.get(f"/changeSummary/{entity_type}/{entity_id}", params=params)

    # ── Entity History (bulk time-range) ────────────────────────────────────

    async def get_entity_history(
        self,
        entity_type: str,
        start_ts: int,
        end_ts: int,
        limit: int = 50,
    ) -> dict:
        """
        GET /v1/{entityType}/history?startTs=&endTs=
        Returns all versions of all entities in a time range.
        """
        return await self.get(
            f"/{entity_type}/history",
            params={"startTs": start_ts, "endTs": end_ts, "limit": limit},
            cache=False,
        )

    # ── Change Events ────────────────────────────────────────────────────────

    async def get_events(
        self,
        entity_created: Optional[str] = None,
        entity_updated: Optional[str] = None,
        entity_deleted: Optional[str] = None,
        timestamp: Optional[int] = None,
    ) -> dict:
        """
        GET /v1/events
        Returns change events filtered by entity type and timestamp.
        """
        params: dict[str, Any] = {}
        if entity_created: params["entityCreated"] = entity_created
        if entity_updated: params["entityUpdated"] = entity_updated
        if entity_deleted: params["entityDeleted"] = entity_deleted
        if timestamp:      params["timestamp"] = timestamp
        return await self.get("/events", params=params, cache=False)

    # ── Search ──────────────────────────────────────────────────────────────

    async def search(
        self,
        query: str = "*",
        index: str = "dataAsset",
        size: int = 25,
        from_: int = 0,
    ) -> dict:
        """GET /v1/search/query"""
        return await self.get(
            "/search/query",
            params={"q": query, "index": index, "size": size, "from": from_},
        )

    # ── Lineage ─────────────────────────────────────────────────────────────

    async def get_lineage(
        self,
        entity_type: str,
        entity_id: str,
        upstream_depth: int = 3,
        downstream_depth: int = 3,
    ) -> dict:
        """GET /v1/lineage/{entity}/{id}"""
        return await self.get(
            f"/lineage/{entity_type}/{entity_id}",
            params={"upstreamDepth": upstream_depth, "downstreamDepth": downstream_depth},
            cache=False,
        )

    # ── Tables specific ─────────────────────────────────────────────────────

    async def list_tables(self, limit: int = 25, after: Optional[str] = None, database_schema: Optional[str] = None) -> dict:
        """GET /v1/tables"""
        params: dict[str, Any] = {"limit": limit, "fields": "owners,tags,domain"}
        if after: params["after"] = after
        if database_schema: params["databaseSchema"] = database_schema
        return await self.get("/tables", params=params)

    # ── Generic list ────────────────────────────────────────────────────────

    async def list_entities(self, entity_type: str, limit: int = 25, fields: str = "owners,tags,domain") -> dict:
        """GET /v1/{entityType}"""
        return await self.get(f"/{entity_type}", params={"limit": limit, "fields": fields})

    # ── System ───────────────────────────────────────────────────────────────

    async def get_version(self) -> dict:
        """GET /v1/system/version"""
        return await self.get("/system/version")

    # ── Data Quality ─────────────────────────────────────────────────────────

    async def get_test_cases(self, entity_fqn: Optional[str] = None, limit: int = 25) -> dict:
        params: dict[str, Any] = {"limit": limit}
        if entity_fqn:
            params["entityLink"] = f"<#E::table::{entity_fqn}>"
        return await self.get("/dataQuality/testCases", params=params, cache=False)


# ── Singleton ────────────────────────────────────────────────────────────────
om_client = OMClient()
