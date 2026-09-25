from __future__ import annotations

import uuid
from functools import lru_cache

import boto3
from botocore.client import Config

from app.config import get_settings


@lru_cache
def _client():
    s = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=(s.b2_endpoint or None),
        aws_access_key_id=s.b2_key_id,
        aws_secret_access_key=s.b2_app_key,
        region_name=s.b2_region or "us-west-004",
        config=Config(signature_version="s3v4"),
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
    _client().put_object(
        Bucket=s.b2_bucket,
        Key=key,
        Body=data,
        ContentType=content_type or "application/octet-stream",
    )

    base = (s.b2_public_base or "").rstrip("/")
    if base:
        return f"{base}/{key}"
    ep = (s.b2_endpoint or "").rstrip("/")
    return f"{ep}/{s.b2_bucket}/{key}"
