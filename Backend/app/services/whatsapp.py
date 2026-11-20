import re
import time

PENDING_VERIFICATIONS = {}
VERIFIED_DEVICES = {}
PENDING_OTPS = {}
OTP_COOLDOWNS = {}

def clean_phone_number(phone: str) -> str:
    cleaned = re.sub(r'[^0-9]', '', str(phone or ''))
    if cleaned.startswith('20') and len(cleaned) == 12:
        return '0' + cleaned[2:]
    elif cleaned.startswith('966') and len(cleaned) >= 12:
        return '0' + cleaned[3:]
    return cleaned

def record_otp_send_attempt(rate_key: str):
    rl = OTP_COOLDOWNS.setdefault(rate_key, {"send_count": 0, "send_blocked_until": 0, "verify_blocked_until": 0})
    rl["send_count"] += 1
    if rl["send_count"] >= 3:
        rl["send_blocked_until"] = time.time() + 300
