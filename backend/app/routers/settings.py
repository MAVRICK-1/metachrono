"""
Settings router — runtime configuration without redeployment.
Allows updating the OpenMetadata JWT token via API.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.om_client import om_client

router = APIRouter(prefix="/settings", tags=["settings"])


class TokenUpdate(BaseModel):
    token: str


@router.post("/token")
async def update_token(body: TokenUpdate):
    """Update the OpenMetadata JWT token at runtime."""
    if not body.token or len(body.token) < 20:
        raise HTTPException(status_code=400, detail="Invalid token")
    om_client._token = body.token
    om_client._headers["Authorization"] = f"Bearer {body.token}"
    # Verify it works
    try:
        await om_client.get("/system/version")
        return {"status": "ok", "message": "Token updated and verified ✅"}
    except Exception as e:
        return {"status": "warning", "message": f"Token set but verification failed: {e}"}


@router.get("/status")
async def connection_status():
    """Check current OpenMetadata connection."""
    try:
        v = await om_client.get("/system/version")
        return {"connected": True, "version": v}
    except Exception as e:
        return {"connected": False, "error": str(e)}
