from __future__ import annotations

import uuid
from functools import lru_cache

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.config import get_settings


def _endpoint() -> str:
    s = get_settings()
    ep = (s.b2_endpoint or "").strip().rstrip("/")
    if not ep:
        raise RuntimeError("B2_ENDPOINT is empty")
    if "backblazeb2.com" not in ep:
        raise RuntimeError(
            "B2_ENDPOINT must be https://s3.<region>.backblazeb2.com "
            f"(got {ep!r})"
        )
    return ep


@lru_cache
def _client():
    s = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=_endpoint(),
        aws_access_key_id=(s.b2_key_id or "").strip(),
        aws_secret_access_key=(s.b2_app_key or "").strip(),
        region_name=(s.b2_region or "eu-central-003").strip(),
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
        ),
    )


def upload_bytes(
    data: bytes,
    content_type: str,
    *,
    prefix: str = "uploads",
    ext: str = "bin",
) -> str:
    s = get_settings()
    if not s.b2_bucket or not s.b2_key_id or not s.b2_app_key:
        raise RuntimeError("B2 not configured (B2_KEY_ID / B2_APP_KEY / B2_BUCKET)")

    key = f"{prefix.strip('/')}/{uuid.uuid4().hex}.{ext.lstrip('.')}"
    try:
        _client().put_object(
            Bucket=(s.b2_bucket or "").strip(),
            Key=key,
            Body=data,
            ContentType=content_type or "application/octet-stream",
        )
    except ClientError as e:
        raise RuntimeError(f"B2 put_object failed: {e}") from e

    base = (s.b2_public_base or "").rstrip("/")
    if base:
        return f"{base}/{key}"
    return f"{_endpoint()}/{(s.b2_bucket or '').strip()}/{key}"
