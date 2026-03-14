"""Auth0 JWT validation — FastAPI dependency that returns the authenticated user's sub."""

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from ..config import settings

_bearer = HTTPBearer()

# Module-level JWKS cache; cleared on unknown-kid to handle key rotation.
_jwks_cache: dict | None = None


async def _fetch_jwks() -> dict:
    url = f"https://{settings.auth0_domain}/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, timeout=10)
        resp.raise_for_status()
    return resp.json()


async def _get_public_key(token: str) -> dict:
    """Return the JWK whose kid matches the token header, fetching JWKS as needed."""
    global _jwks_cache

    unverified_header = jwt.get_unverified_header(token)
    kid = unverified_header.get("kid")

    if _jwks_cache is None:
        _jwks_cache = await _fetch_jwks()

    for key in _jwks_cache.get("keys", []):
        if key.get("kid") == kid:
            return key

    # Kid not found — the signing key may have rotated; flush cache and retry once.
    _jwks_cache = await _fetch_jwks()
    for key in _jwks_cache.get("keys", []):
        if key.get("kid") == kid:
            return key

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unable to find signing key",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    """FastAPI dependency: validates Auth0 JWT and returns the owner id (sub claim)."""
    token = credentials.credentials
    try:
        public_key = await _get_public_key(token)
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=settings.auth0_audience,
            issuer=f"https://{settings.auth0_domain}/",
        )
        sub: str = payload["sub"]
        return sub
    except (JWTError, KeyError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
