import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def send_otp_sms(phone_e164: str, otp: str) -> bool:
    """
    Africa's Talking SMS.
    Set AT_USERNAME, AT_API_KEY in env. If missing, log only (dev).
    """
    username = getattr(settings, "at_username", "") or ""
    api_key = getattr(settings, "at_api_key", "") or ""
    message = f"Your Shop Near Me verification code is {otp}. Valid 10 minutes."

    if not username or not api_key:
        logger.warning("AT credentials missing; OTP not sent via SMS phone=%s", phone_e164)
        return False

    url = "https://api.africastalking.com/version1/messaging"
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "apiKey": api_key,
    }
    data = {
        "username": username,
        "to": phone_e164,
        "message": message,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, data=data, headers=headers)
        if resp.status_code >= 400:
            logger.error("AT SMS failed: %s %s", resp.status_code, resp.text)
            return False
        return True
