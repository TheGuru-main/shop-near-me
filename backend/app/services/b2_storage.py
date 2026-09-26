"""Backblaze B2 via native API (avoids S3-compat SSL issues on some hosts)."""

from __future__ import annotations

import base64
import hashlib
import time
import uuid
from urllib.parse import quote

import httpx

from app.config import get_settings

_auth_cache: dict | None = None
_auth_at: float = 0.0
_AUTH_TTL = 3600.0


def _settings():
    return get_settings()


def _authorize() -> dict:
    global _auth_cache, _auth_at
    s = _settings()
    key_id = (s.b2_key_id or "").strip()
    app_key = (s.b2_app_key or "").strip()
    if not key_id or not app_key:
        raise RuntimeError("B2_KEY_ID / B2_APP_KEY not set")

    now = time.time()
    if _auth_cache and (now - _auth_at) < _AUTH_TTL:
        return _auth_cache

    token = base64.b64encode(f"{key_id}:{app_key}".encode()).decode()
    with httpx.Client(timeout=30.0) as client:
        r = client.get(
            "https://api.backblazeb2.com/b2api/v2/b2_authorize_account",
            headers={"Authorization": f"Basic {token}"},
        )
        if r.status_code != 200:
            raise RuntimeError(f"B2 authorize failed: {r.status_code} {r.text[:200]}")
        data = r.json()

    _auth_cache = data
    _auth_at = now
    return data


def _bucket_id(auth: dict) -> str:
    s = _settings()
    # Optional: set B2_BUCKET_ID on Render to skip list
    bid = getattr(s, "b2_bucket_id", None) or ""
    bid = str(bid).strip()
    if bid:
        return bid

    name = (s.b2_bucket or "").strip()
    if not name:
        raise RuntimeError("B2_BUCKET not set")

    api = auth["apiUrl"].rstrip("/")
    with httpx.Client(timeout=30.0) as client:
        r = client.post(
            f"{api}/b2api/v2/b2_list_buckets",
            headers={"Authorization": auth["authorizationToken"]},
            json={"accountId": auth["accountId"]},
        )
        if r.status_code != 200:
            raise RuntimeError(f"B2 list_buckets failed: {r.status_code} {r.text[:200]}")
        for b in r.json().get("buckets") or []:
            if b.get("bucketName") == name:
                return b["bucketId"]
    raise RuntimeError(f"B2 bucket not found: {name}")


def upload_bytes(
    data: bytes,
    content_type: str,
    *,
    prefix: str = "uploads",
    ext: str = "bin",
) -> str:
    s = _settings()
    auth = _authorize()
    bucket_id = _bucket_id(auth)
    api = auth["apiUrl"].rstrip("/")

    with httpx.Client(timeout=60.0) as client:
        r = client.post(
            f"{api}/b2api/v2/b2_get_upload_url",
            headers={"Authorization": auth["authorizationToken"]},
            json={"bucketId": bucket_id},
        )
        if r.status_code != 200:
            raise RuntimeError(f"B2 get_upload_url failed: {r.status_code} {r.text[:200]}")
        up = r.json()
        upload_url = up["uploadUrl"]
        upload_auth = up["authorizationToken"]

        key = f"{prefix.strip('/')}/{uuid.uuid4().hex}.{ext.lstrip('.')}"
        # B2: UTF-8 then percent-encode (including /)
        file_name = quote(key, safe="")
        sha1 = hashlib.sha1(data).hexdigest()
        ctype = (content_type or "b2/x-auto").split(";")[0].strip() or "b2/x-auto"

        r2 = client.post(
            upload_url,
            headers={
                "Authorization": upload_auth.strip(),
                "X-Bz-File-Name": file_name,
                "X-Bz-Content-Sha1": sha1,
                "Content-Type": ctype,
                "Content-Length": str(len(data)),
            },
            content=data,
        )
        if r2.status_code == 401:
            # one retry with fresh upload URL
            r = client.post(
                f"{api}/b2api/v2/b2_get_upload_url",
                headers={"Authorization": auth["authorizationToken"]},
                json={"bucketId": bucket_id},
            )
            if r.status_code != 200:
                raise RuntimeError(
                    f"B2 get_upload_url retry failed: {r.status_code} {r.text[:200]}"
                )
            up = r.json()
            r2 = client.post(
                up["uploadUrl"],
                headers={
                    "Authorization": up["authorizationToken"].strip(),
                    "X-Bz-File-Name": file_name,
                    "X-Bz-Content-Sha1": sha1,
                    "Content-Type": ctype,
                    "Content-Length": str(len(data)),
                },
                content=data,
            )
        if r2.status_code != 200:
            raise RuntimeError(f"B2 upload failed: {r2.status_code} {r2.text[:300]}")

    base = (s.b2_public_base or "").rstrip("/")
    if base:
        return f"{base}/{key}"

    # fallback download URL from auth
    dl = (auth.get("downloadUrl") or "").rstrip("/")
    bucket = (s.b2_bucket or "").strip()
    if dl and bucket:
        return f"{dl}/file/{bucket}/{key}"
    return key
