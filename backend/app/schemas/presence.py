from pydantic import BaseModel


class LiveBody(BaseModel):
    live: bool


class HeartbeatResponse(BaseModel):
    hb_at: str | None
    score: float
    live: bool
