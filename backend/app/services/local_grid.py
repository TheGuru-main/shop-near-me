LOCAL_UID = "26012002"
LOCAL_S = 13  # digit sum of 26012002
LOCAL_R = 2
COL_PRIMARY = 1
COL_CITY = 2


def digit_sum(n: int | str) -> int:
    return sum(int(ch) for ch in str(n) if ch.isdigit())


def norm_name(s: str) -> str:
    return "".join((s or "").split()).lower()


def name_len(s: str) -> int:
    return len(norm_name(s)) or 1


def local_start_row(city: str) -> int:
    L = name_len(city)
    return ((L + LOCAL_S - 1) % LOCAL_R) + 1


def register_local(
    user_id: str,
    name: str,
    business_types: list[str] | None,
    primary_location: str,
    city: str,
) -> dict:
    """2x2 grid: fixed UID, col1=primary channel, col2=city channel."""
    row = local_start_row(city)
    entity = {
        "user_id": user_id,
        "name": name,
        "business_types": business_types or [],
        "primary_location": primary_location,
        "city": city,
        "uid": LOCAL_UID,
        "S": LOCAL_S,
        "L": name_len(city),
        "start_row": row,
        "cells": [
            {"col": COL_PRIMARY, "row": row, "channel": "primary"},
            {"col": COL_CITY, "row": row, "channel": "city"},
        ],
    }
    return entity
