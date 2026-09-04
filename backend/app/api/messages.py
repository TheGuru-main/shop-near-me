import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.db import get_db
from app.models.message import Message, MessageThread
from app.models.user import User
from app.schemas.message import MessageCreate, MessagePublic, ThreadCreate, ThreadPublic
from app.services.placement import messaging_start_row

router = APIRouter(prefix="/messages", tags=["messages"])


def _pair(a: uuid.UUID, b: uuid.UUID) -> tuple[uuid.UUID, uuid.UUID]:
    return (a, b) if str(a) < str(b) else (b, a)


@router.get("/inbox")
@limiter.limit("60/minute")
async def inbox(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    threads = (
        db.query(MessageThread)
        .filter(
            or_(
                MessageThread.participant_a == user.id,
                MessageThread.participant_b == user.id,
            )
        )
        .order_by(MessageThread.updated_at.desc())
        .limit(100)
        .all()
    )
    out = []
    for t in threads:
        last = (
            db.query(Message)
            .filter(Message.thread_id == t.id, Message.deleted_at.is_(None))
            .order_by(Message.created_at.desc())
            .first()
        )
        out.append(
            {
                "thread": ThreadPublic.model_validate(t).model_dump(mode="json"),
                "last_message": MessagePublic.model_validate(last).model_dump(mode="json")
                if last
                else None,
            }
        )
    return {"count": len(out), "threads": out}


@router.post("/threads")
@limiter.limit("30/minute")
async def start_thread(
    request: Request,
    body: ThreadCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.to_user_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    other = db.get(User, body.to_user_id)
    if not other or other.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Recipient not found")

    a, b = _pair(user.id, other.id)
    thread = (
        db.query(MessageThread)
        .filter(
            MessageThread.participant_a == a,
            MessageThread.participant_b == b,
            MessageThread.context_type == body.context_type,
        )
        .first()
    )
    if not thread:
        thread = MessageThread(
            id=uuid.uuid4(),
            participant_a=a,
            participant_b=b,
            context_type=body.context_type,
            product_id=body.product_id,
            fairly_used_post_id=body.fairly_used_post_id,
        )
        db.add(thread)
        db.commit()
        db.refresh(thread)

    to_row = other.start_row
    if to_row is None:
        to_row = messaging_start_row(other.name, other.phone)
    from_row = user.start_row
    if from_row is None:
        from_row = messaging_start_row(user.name, user.phone)

    msg = Message(
        id=uuid.uuid4(),
        thread_id=thread.id,
        from_user_id=user.id,
        to_user_id=other.id,
        from_start_row=from_row,
        to_start_row=to_row,
        body=body.body,
        context_type=body.context_type,
        product_id=body.product_id,
        fairly_used_post_id=body.fairly_used_post_id,
    )
    db.add(msg)
    thread.updated_at = datetime.now(timezone.utc)
    db.add(thread)
    db.commit()
    db.refresh(msg)
    return {
        "thread": ThreadPublic.model_validate(thread).model_dump(mode="json"),
        "message": MessagePublic.model_validate(msg).model_dump(mode="json"),
    }


@router.get("/threads/{thread_id}")
@limiter.limit("60/minute")
async def get_thread(
    request: Request,
    thread_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    thread = db.get(MessageThread, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    if user.id not in (thread.participant_a, thread.participant_b):
        raise HTTPException(status_code=403, detail="Not a participant")
    messages = (
        db.query(Message)
        .filter(Message.thread_id == thread_id, Message.deleted_at.is_(None))
        .order_by(Message.created_at.asc())
        .limit(200)
        .all()
    )
    return {
        "thread": ThreadPublic.model_validate(thread).model_dump(mode="json"),
        "messages": [
            MessagePublic.model_validate(m).model_dump(mode="json") for m in messages
        ],
    }


@router.post("/threads/{thread_id}")
@limiter.limit("60/minute")
async def send_in_thread(
    request: Request,
    thread_id: uuid.UUID,
    body: MessageCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    thread = db.get(MessageThread, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    if user.id not in (thread.participant_a, thread.participant_b):
        raise HTTPException(status_code=403, detail="Not a participant")

    other_id = (
        thread.participant_b
        if thread.participant_a == user.id
        else thread.participant_a
    )
    other = db.get(User, other_id)
    if not other:
        raise HTTPException(status_code=404, detail="Recipient missing")

    to_row = other.start_row or messaging_start_row(other.name, other.phone)
    from_row = user.start_row or messaging_start_row(user.name, user.phone)

    msg = Message(
        id=uuid.uuid4(),
        thread_id=thread.id,
        from_user_id=user.id,
        to_user_id=other.id,
        from_start_row=from_row,
        to_start_row=to_row,
        body=body.body,
        context_type=thread.context_type,
        product_id=thread.product_id,
        fairly_used_post_id=thread.fairly_used_post_id,
    )
    db.add(msg)
    thread.updated_at = datetime.now(timezone.utc)
    db.add(thread)
    db.commit()
    db.refresh(msg)
    return MessagePublic.model_validate(msg).model_dump(mode="json")

@router.get("/lookup")
@limiter.limit("30/minute")
async def lookup_by_phone(
    request: Request,
    phone: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.services.phone import normalize_e164
    try:
        p = normalize_e164(phone)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid phone")
    other = (
        db.query(User)
        .filter(User.phone == p, User.deleted_at.is_(None))
        .first()
    )
    if not other:
        raise HTTPException(status_code=404, detail="No user with that phone")
    return {
        "id": str(other.id),
        "name": other.name,
        "phone": other.phone,
        "role": other.role,
        "primary_location": other.primary_location,
    }

@router.delete("/{message_id}")
@limiter.limit("30/minute")
async def delete_message(
    request: Request,
    message_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    msg = db.get(Message, message_id)
    if not msg or msg.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Not found")
    if msg.from_user_id != user.id:
        raise HTTPException(status_code=403, detail="Only sender can delete")
    msg.deleted_at = datetime.now(timezone.utc)
    db.add(msg)
    db.commit()
    return {"id": str(message_id), "deleted": True}

