# Import models here as they are added so init_db() registers them. 
from app.models.user import User
from app.models.product import Product

try:
    from app.models.message import Message, MessageThread
except Exception:
    Message = None  # type: ignore
    MessageThread = None  # type: ignore

try:
    from app.models.fairly_used import FairlyUsedPost, FairlyUsedComment
except Exception:
    FairlyUsedPost = None  # type: ignore
    FairlyUsedComment = None  # type: ignore

try:
    from app.models.premium import PremiumSubscription, EInvoice, Receipt
except Exception:
    PremiumSubscription = None  # type: ignore
    EInvoice = None  # type: ignore
    Receipt = None  # type: ignore

__all__ = ["User", "Product"]
