from datetime import datetime, timezone

HB_MAX = 100.0
HB_DECAY_PER_STEP = 0.03  # 3% per 10 minutes
HB_STEP_SEC = 10 * 60


def heartbeat_score(hb_at: datetime | None, now: datetime | None = None) -> float:
    if hb_at is None:
        return 0.0
    now = now or datetime.now(timezone.utc)
    if hb_at.tzinfo is None:
        hb_at = hb_at.replace(tzinfo=timezone.utc)
    elapsed = max(0.0, (now - hb_at).total_seconds())
    steps = int(elapsed // HB_STEP_SEC)
    score = HB_MAX
    for _ in range(steps):
        score *= 1.0 - HB_DECAY_PER_STEP
    return round(max(0.0, score), 2)


def pulse_now() -> datetime:
    return datetime.now(timezone.utc)
