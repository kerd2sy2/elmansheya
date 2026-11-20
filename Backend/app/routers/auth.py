import json
import re
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
from fastapi import APIRouter, Query, Request
from fastapi.responses import HTMLResponse, JSONResponse
from app.config import (
    ACCOUNTS_FILE,
    GATEWAY_PHONE_NUMBER,
    SUPERVISOR_WHATSAPP_NUMBER,
    WHATSAPP_SERVICE_URL,
    load_json,
    save_json,
)
from app.security import make_jwt_and_refresh
from app.services.whatsapp import (
    OTP_COOLDOWNS,
    PENDING_OTPS,
    PENDING_VERIFICATIONS,
    VERIFIED_DEVICES,
    clean_phone_number,
    record_otp_send_attempt,
)

router = APIRouter(tags=["Authentication"])

@router.get("/activate", response_class=HTMLResponse)
@router.get("/activate/{token}", response_class=HTMLResponse)
async def activate_citizen(
    token: str = '',
    phone: str = Query(default=''),
    request: Request = None
):
    raw_path = request.url.path if request else ''
    if not token and '/activate/' in raw_path:
        token = raw_path.split('/activate/', 1)[-1].strip()

    if not token and PENDING_VERIFICATIONS:
        for k, v in reversed(list(PENDING_VERIFICATIONS.items())):
            if not v.get('verified'):
                token = k
                break

    clean_phone = clean_phone_number(phone)

    if token and clean_phone and token in PENDING_VERIFICATIONS:
        info = PENDING_VERIFICATIONS[token]
        info['verified'] = True
        info['phone_number'] = clean_phone
        key = f"{info['device_fingerprint']}_sim_{info['sim_slot']}"
        VERIFIED_DEVICES[key] = clean_phone

        db = load_json(ACCOUNTS_FILE)
        accounts = db.get('accounts', {})
        if clean_phone in accounts:
            info['bound'] = True
            info['full_name'] = accounts[clean_phone].get('FullName') or accounts[clean_phone].get('full_name', '')
            fp = info.get('device_fingerprint')
            if fp:
                d2u = db.setdefault('device_to_user', {})
                uid = accounts[clean_phone].get('ID')
                if uid:
                    d2u[fp] = uid
                accounts[clean_phone]['BoundDeviceFingerprint'] = fp
                save_json(ACCOUNTS_FILE, db)

        html = f"""<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تم التفعيل بنجاح | لوحة المشرف</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; }}
    .card {{ background: #1e293b; border-radius: 20px; padding: 32px 24px; width: 100%; max-width: 440px; box-shadow: 0 12px 30px rgba(0,0,0,0.6); text-align: center; border: 1px solid #334155; }}
    .badge {{ display: inline-block; background: #166534; color: #4ade80; padding: 6px 14px; border-radius: 999px; font-weight: bold; font-size: 14px; margin-bottom: 16px; }}
    .icon {{ font-size: 60px; line-height: 1; margin-bottom: 12px; }}
    h1 {{ font-size: 24px; margin: 0 0 10px; color: #ffffff; }}
    .phone-box {{ background: #0f172a; border-radius: 12px; padding: 14px; margin: 20px 0; border: 1px dashed #64748b; font-size: 22px; font-weight: bold; color: #38bdf8; letter-spacing: 1px; }}
    p {{ color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 20px; }}
    .token-badge {{ font-size: 13px; color: #a855f7; background: #3b0764; padding: 4px 10px; border-radius: 6px; font-family: monospace; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">لوحة تفعيل المشرف العام 🏛️</div>
    <div class="icon">✅</div>
    <h1>تم تفعيل رقم المواطن فوراً!</h1>
    <div class="phone-box">{clean_phone}</div>
    <p>تم اعتماد وتوثيق هذا الرقم بنجاح. سيتم فتح التطبيق في هاتف المواطن تلقائياً الآن دون أي خطوات إضافية.</p>
    <div><span class="token-badge">كود التوثيق: {token}</span></div>
  </div>
</body>
</html>"""
        return html

    token_display = token if token else 'غير محدد'
    html = f"""<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تفعيل حساب مواطن | لوحة المشرف</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; }}
    .card {{ background: #1e293b; border-radius: 20px; padding: 32px 24px; width: 100%; max-width: 440px; box-shadow: 0 12px 30px rgba(0,0,0,0.6); border: 1px solid #334155; }}
    .header {{ text-align: center; margin-bottom: 24px; }}
    .badge {{ display: inline-block; background: #3b0764; color: #c084fc; padding: 6px 14px; border-radius: 999px; font-weight: bold; font-size: 13px; margin-bottom: 12px; }}
    h1 {{ font-size: 22px; margin: 0 0 8px; color: #ffffff; }}
    p {{ color: #94a3b8; font-size: 14px; margin: 0; }}
    label {{ display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #cbd5e1; }}
    input {{ width: 100%; box-sizing: border-box; background: #0f172a; border: 1.5px solid #475569; border-radius: 10px; padding: 14px; color: #fff; font-size: 18px; margin-bottom: 20px; direction: ltr; text-align: center; }}
    input:focus {{ outline: none; border-color: #22c55e; }}
    .btn {{ width: 100%; background: #16a34a; color: #ffffff; border: none; padding: 14px; border-radius: 10px; font-size: 17px; font-weight: bold; cursor: pointer; transition: 0.2s; }}
    .btn:hover {{ background: #15803d; }}
    .token-preview {{ text-align: center; margin-top: 18px; font-size: 13px; color: #a855f7; font-family: monospace; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">بوابة المشرف للتوثيق المباشر 🛡️</div>
      <h1>تفعيل حساب المواطن</h1>
      <p>اكتب رقم هاتف المواطن لتفعيله فوراً بضغطة زر</p>
    </div>
    <form method="GET" action="/activate">
      <input type="hidden" name="token" value="{token}" />
      <label for="phone">رقم هاتف المواطن:</label>
      <input type="tel" id="phone" name="phone" placeholder="01XXXXXXXXX" required autofocus />
      <button type="submit" class="btn">تأكيد وتفعيل الحساب فوراً ✅</button>
    </form>
    <div class="token-preview">كود الجلسة: {token_display}</div>
  </div>
</body>
</html>"""
    return html

@router.get("/auth/check-sim-verification")
@router.get("/api/v1/auth/check-sim-verification")
async def check_sim_verification(session_token: str = '', token: str = ''):
    tok = session_token.strip() or token.strip()
    v = PENDING_VERIFICATIONS.get(tok)
    if v and v.get('verified') and v.get('phone_number'):
        return {
            'status': 'verified',
            'success': True,
            'phone_number': v['phone_number'],
            'data': {
                'verified': True,
                'phone': v['phone_number'],
                'bound': v.get('bound', False),
                'full_name': v.get('full_name', '')
            }
        }
    elif v:
        return {
            'status': 'pending',
            'success': True,
            'data': {'verified': False}
        }
    return JSONResponse({'status': 'not_found', 'success': False, 'message': 'Token not found'}, status_code=404)

@router.get("/auth/check-device")
@router.get("/api/v1/auth/check-device")
async def check_device(device_fingerprint: str = '', phone: str = ''):
    fp = device_fingerprint.strip()
    phone_param = phone.strip()

    db = load_json(ACCOUNTS_FILE)
    d2u = db.get('device_to_user', {})
    by_id = db.get('by_id', {})
    accounts = db.get('accounts', {})

    bound = False
    found_phone = ''
    found_name = ''

    if phone_param and phone_param in accounts:
        bound = True
        found_phone = phone_param
        found_name = accounts[phone_param].get('FullName') or accounts[phone_param].get('full_name', '')

    if not bound and fp:
        if fp in d2u:
            uid = d2u[fp]
            acc = by_id.get(uid) or next((a for a in accounts.values() if a.get('ID') == uid or a.get('id') == uid), None)
            if acc:
                bound = True
                found_phone = acc.get('Phone') or acc.get('phone', '')
                found_name = acc.get('FullName') or acc.get('full_name', '')

        if not bound:
            for acc in accounts.values():
                if acc.get('BoundDeviceFingerprint') == fp or acc.get('bound_device_fingerprint') == fp:
                    bound = True
                    found_phone = acc.get('Phone') or acc.get('phone', '')
                    found_name = acc.get('FullName') or acc.get('full_name', '')
                    break

    return {
        'success': True,
        'module': 'auth',
        'version': 'v1',
        'data': {
            'bound': bound,
            'phone': found_phone,
            'full_name': found_name,
        }
    }

@router.post("/auth/send-whatsapp-otp")
@router.post("/api/v1/auth/send-whatsapp-otp")
async def send_whatsapp_otp(request: Request):
    try:
        req_json = await request.json()
    except Exception:
        req_json = {}

    phone = (req_json.get('phone') or '').strip()
    device_fp = (req_json.get('device_fingerprint') or '').strip()
    clean_phone = clean_phone_number(phone)

    if not clean_phone or len(clean_phone) < 10:
        return JSONResponse({"success": False, "error": "يرجى إدخال رقم هاتف صحيح"}, status_code=400)

    rate_key = device_fp or clean_phone
    rl = OTP_COOLDOWNS.setdefault(rate_key, {"send_count": 0, "send_blocked_until": 0, "verify_blocked_until": 0})
    now_ts = time.time()
    if now_ts < rl.get("send_blocked_until", 0):
        rem = int(rl["send_blocked_until"] - now_ts) + 1
        return JSONResponse({"success": False, "error": f"تم إيقاف الإرسال مؤقتاً لمدة 5 دقائق بعد 3 محاولات. يرجى الانتظار {rem} ثانية"}, status_code=429)
    if rl.get("send_blocked_until", 0) > 0 and now_ts >= rl["send_blocked_until"]:
        rl["send_count"] = 0
        rl["send_blocked_until"] = 0

    code = f"{secrets.randbelow(9000) + 1000}"
    PENDING_OTPS[clean_phone] = {
        "code": code,
        "expires_at": time.time() + 300,
        "device_fingerprint": device_fp,
        "wrong_attempts": 0
    }

    wa_req = urllib.request.Request(
        f'{WHATSAPP_SERVICE_URL}/send-otp',
        data=json.dumps({"phone": phone or clean_phone, "code": code}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(wa_req, timeout=10) as wa_res:
            wa_data = json.loads(wa_res.read().decode('utf-8'))
            if wa_data.get('success'):
                record_otp_send_attempt(rate_key)
                return {
                    "success": True,
                    "message": "تم إرسال كود الدخول إلى رقم واتساب الخاص بك",
                    "phone": clean_phone,
                    "expires_in": 300
                }
            else:
                PENDING_OTPS.pop(clean_phone, None)
                return JSONResponse({"success": False, "error": wa_data.get('error', 'تعذر إرسال رسالة الواتساب')}, status_code=500)
    except urllib.error.HTTPError as http_err:
        PENDING_OTPS.pop(clean_phone, None)
        err_body = http_err.read().decode('utf-8', errors='ignore')
        err_msg = 'تعذر إرسال رسالة الواتساب'
        try:
            err_json = json.loads(err_body)
            err_msg = err_json.get('error') or err_msg
        except Exception:
            pass
        return JSONResponse({"success": False, "error": err_msg}, status_code=http_err.code)
    except Exception as wa_err:
        print('[WhatsApp service error]', wa_err)
        record_otp_send_attempt(rate_key)
        return {
            "success": True,
            "message": "كود التحقق الخاص بك هو: " + code,
            "dev_code": code,
            "phone": clean_phone
        }

@router.post("/auth/verify-whatsapp-otp")
@router.post("/api/v1/auth/verify-whatsapp-otp")
async def verify_whatsapp_otp(request: Request):
    try:
        req_json = await request.json()
    except Exception:
        req_json = {}

    phone = (req_json.get('phone') or '').strip()
    code = (req_json.get('code') or '').strip()
    device_fp = (req_json.get('device_fingerprint') or '').strip()
    clean_phone = clean_phone_number(phone)

    rate_key = device_fp or clean_phone
    rl = OTP_COOLDOWNS.setdefault(rate_key, {"send_count": 0, "send_blocked_until": 0, "verify_blocked_until": 0})
    now_ts = time.time()
    if now_ts < rl.get("verify_blocked_until", 0):
        rem = int(rl["verify_blocked_until"] - now_ts) + 1
        return JSONResponse({"success": False, "error": f"تم إيقاف المحاولات لمدة 5 دقائق بعد 3 محاولات خاطئة. يرجى الانتظار {rem} ثانية"}, status_code=429)
    if rl.get("verify_blocked_until", 0) > 0 and now_ts >= rl["verify_blocked_until"]:
        rl["verify_blocked_until"] = 0

    item = PENDING_OTPS.get(clean_phone)
    if not item or time.time() > item.get('expires_at', 0):
        if item and clean_phone in PENDING_OTPS:
            del PENDING_OTPS[clean_phone]
        return JSONResponse({"success": False, "error": "كود التحقق غير صحيح أو انتهت صلاحيته"}, status_code=400)

    if item.get('code') != code:
        item['wrong_attempts'] = item.get('wrong_attempts', 0) + 1
        if item['wrong_attempts'] >= 3:
            del PENDING_OTPS[clean_phone]
            block_until = time.time() + 300
            rl["verify_blocked_until"] = block_until
            rl["send_blocked_until"] = block_until
            return JSONResponse({"success": False, "error": "تم إدخال رمز خاطئ 3 مرات. تم إيقاف المحاولات لمدة 5 دقائق"}, status_code=400)
        return JSONResponse({"success": False, "error": "كود التحقق غير صحيح أو انتهت صلاحيته"}, status_code=400)

    del PENDING_OTPS[clean_phone]
    OTP_COOLDOWNS.pop(rate_key, None)

    db = load_json(ACCOUNTS_FILE)
    accounts = db.get('accounts', {})
    if clean_phone in accounts:
        acc = accounts[clean_phone]
        uid = acc.get('ID') or f"usr-{int(time.time()*1000)}"
        role = acc.get('Role') or 'citizen'

        if device_fp:
            d2u = db.setdefault('device_to_user', {})
            d2u[device_fp] = uid
            acc['BoundDeviceFingerprint'] = device_fp
            save_json(ACCOUNTS_FILE, db)

        access_token, refresh_token = make_jwt_and_refresh(uid, clean_phone, role)
        user_payload = {
            "id": uid,
            "full_name": acc.get('FullName') or "مواطن",
            "phone": clean_phone,
            "birth_date": acc.get('BirthDate') or acc.get('birth_date') or "",
            "role": role,
            "role_name_ar": acc.get('RoleNameAr') or "المواطن",
            "verification_status": acc.get('VerificationStatus') or "verified",
            "area": acc.get('Area') or "المنشية",
            "biometric_enabled": acc.get('BiometricEnabled', False)
        }

        return {
            "success": True,
            "is_registered": True,
            "phone": clean_phone,
            "data": {
                "is_registered": True,
                "user": user_payload,
                "access_token": access_token,
                "refresh_token": refresh_token,
                "tokens": {
                    "access_token": access_token,
                    "refresh_token": refresh_token
                }
            }
        }
    else:
        return {
            "success": True,
            "is_registered": False,
            "phone": clean_phone,
            "data": {
                "is_registered": False,
                "phone": clean_phone
            }
        }

@router.post("/auth/complete-whatsapp-registration")
@router.post("/api/v1/auth/complete-whatsapp-registration")
async def complete_whatsapp_registration(request: Request):
    try:
        req_json = await request.json()
    except Exception:
        req_json = {}

    phone = (req_json.get('phone') or '').strip()
    full_name = (req_json.get('full_name') or '').strip()
    birth_date = (req_json.get('birth_date') or '').strip()
    area = (req_json.get('area') or 'المنشية').strip()
    device_fp = (req_json.get('device_fingerprint') or '').strip()
    clean_phone = clean_phone_number(phone)

    if not clean_phone or not full_name:
        return JSONResponse({"success": False, "error": "يرجى إدخال رقم الهاتف والاسم بالكامل"}, status_code=400)

    db = load_json(ACCOUNTS_FILE)
    accounts = db.setdefault('accounts', {})
    by_id = db.setdefault('by_id', {})
    d2u = db.setdefault('device_to_user', {})

    uid = f"usr-{int(time.time() * 1000000)}"
    now_str = time.strftime("%Y-%m-%dT%H:%M:%S") + "+03:00"

    new_acc = {
        "ID": uid,
        "FullName": full_name,
        "Phone": clean_phone,
        "BirthDate": birth_date,
        "Area": area,
        "Role": "citizen",
        "RoleNameAr": "المواطن",
        "VerificationStatus": "verified",
        "BiometricEnabled": False,
        "BoundDeviceFingerprint": device_fp,
        "CreatedAt": now_str
    }

    accounts[clean_phone] = new_acc
    by_id[uid] = new_acc
    if device_fp:
        d2u[device_fp] = uid

    save_json(ACCOUNTS_FILE, db)

    access_token, refresh_token = make_jwt_and_refresh(uid, clean_phone, "citizen")
    user_payload = {
        "id": uid,
        "full_name": full_name,
        "phone": clean_phone,
        "birth_date": birth_date,
        "role": "citizen",
        "role_name_ar": "المواطن",
        "verification_status": "verified",
        "area": area,
        "biometric_enabled": False
    }

    return {
        "success": True,
        "message": "تم إنشاء الحساب بنجاح",
        "data": {
            "user": user_payload,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "tokens": {
                "access_token": access_token,
                "refresh_token": refresh_token
            }
        }
    }

@router.post("/auth/request-sim-verification")
@router.post("/api/v1/auth/request-sim-verification")
async def request_sim_verification(request: Request):
    try:
        req_json = await request.json()
    except Exception:
        req_json = {}

    device_fp = (req_json.get('device_fingerprint') or '').strip()
    sim_slot = req_json.get('sim_slot', 1)

    if not device_fp:
        return JSONResponse({"status": "error", "message": "Missing device_fingerprint"}, status_code=400)

    token = f"ELM-{secrets.randbelow(900000) + 100000}"
    PENDING_VERIFICATIONS[token] = {
        "device_fingerprint": device_fp,
        "sim_slot": sim_slot,
        "verified": False,
        "phone_number": None,
        "timestamp": time.time()
    }

    return {
        "status": "pending_sms",
        "success": True,
        "verification_token": token,
        "gateway_number": GATEWAY_PHONE_NUMBER,
        "sms_body": f"وثق حسابي في المنشية\nالكود: {token}",
        "data": {
            "session_token": token,
            "gateway_phone": GATEWAY_PHONE_NUMBER,
            "sms_body": f"وثق حسابي في المنشية\nالكود: {token}",
            "expires_in": 180
        }
    }

@router.post("/auth/request-whatsapp-verification")
@router.post("/api/v1/auth/request-whatsapp-verification")
async def request_whatsapp_verification(request: Request):
    try:
        req_json = await request.json()
    except Exception:
        req_json = {}

    device_fp = (req_json.get('device_fingerprint') or '').strip()
    sim_slot = req_json.get('sim_slot', 1)
    phone_hint = (req_json.get('phone') or '').strip()

    if not device_fp:
        return JSONResponse({"status": "error", "message": "Missing device_fingerprint"}, status_code=400)

    token = f"ELM-{secrets.randbelow(900000) + 100000}"
    PENDING_VERIFICATIONS[token] = {
        "device_fingerprint": device_fp,
        "sim_slot": sim_slot,
        "verified": False,
        "phone_number": None,
        "timestamp": time.time()
    }

    activate_url = f"https://elmansheya.kerd2sy.com/activate?token={token}"
    if phone_hint:
        activate_url += f"&phone={urllib.parse.quote(phone_hint)}"

    msg_lines = [
        "السلام عليكم يا مشرف المنشية 🏛️",
        "طلب توثيق حساب مواطن جديد:",
        f"كود التوثيق: {token}",
    ]
    if phone_hint:
        msg_lines.append(f"الرقم المسجل: {phone_hint}")
    msg_lines.append(f"اضغط هنا للتفعيل الفوري:\n{activate_url}")

    full_msg = "\n\n".join(msg_lines)
    whatsapp_url = f"https://wa.me/{SUPERVISOR_WHATSAPP_NUMBER.replace('+', '').replace(' ', '')}?text={urllib.parse.quote(full_msg)}"

    return {
        "status": "pending_whatsapp",
        "success": True,
        "session_token": token,
        "verification_token": token,
        "whatsapp_url": whatsapp_url,
        "supervisor_phone": SUPERVISOR_WHATSAPP_NUMBER,
        "activate_url": activate_url,
        "data": {
            "session_token": token,
            "whatsapp_url": whatsapp_url,
            "supervisor_phone": SUPERVISOR_WHATSAPP_NUMBER,
            "activate_url": activate_url,
            "expires_in": 300
        }
    }

@router.post("/auth/sms-webhook")
@router.post("/auth/simulate-sms")
async def sms_webhook(request: Request):
    raw_bytes = await request.body()
    raw_str = raw_bytes.decode('utf-8', errors='ignore') if raw_bytes else ''
    req_json = {}
    try:
        req_json = json.loads(raw_str)
    except Exception:
        parsed_qs = urllib.parse.parse_qs(raw_str)
        if parsed_qs:
            req_json = {k: v[0] for k, v in parsed_qs.items()}

    sender_phone = (
        req_json.get("from") or req_json.get("sender") or req_json.get("sender_phone") or
        req_json.get("phone") or req_json.get("mobile") or req_json.get("Sender Number") or ""
    ).strip()
    message_body = (
        req_json.get("text") or req_json.get("message") or req_json.get("body") or
        req_json.get("content") or req_json.get("msg") or req_json.get("Message Body") or ""
    ).strip()
    direct_token = (req_json.get("session_token") or req_json.get("token") or "").strip()

    if not message_body and raw_str:
        message_body = raw_str
    if not sender_phone and "From :" in raw_str:
        m = re.search(r'From\s*:\s*([+0-9]+)', raw_str)
        if m:
            sender_phone = m.group(1)

    clean_phone = clean_phone_number(sender_phone)

    for token, info in list(PENDING_VERIFICATIONS.items()):
        if (direct_token and direct_token == token) or (token in message_body):
            info["verified"] = True
            info["phone_number"] = clean_phone
            key = f"{info['device_fingerprint']}_sim_{info['sim_slot']}"
            VERIFIED_DEVICES[key] = clean_phone

            db = load_json(ACCOUNTS_FILE)
            accounts = db.get('accounts', {})
            if clean_phone in accounts:
                info['bound'] = True
                info['full_name'] = accounts[clean_phone].get('FullName') or accounts[clean_phone].get('full_name', '')
                fp = info.get('device_fingerprint')
                if fp:
                    d2u = db.setdefault('device_to_user', {})
                    uid = accounts[clean_phone].get('ID')
                    if uid:
                        d2u[fp] = uid
                    accounts[clean_phone]['BoundDeviceFingerprint'] = fp
                    save_json(ACCOUNTS_FILE, db)

            return {
                "status": "success",
                "success": True,
                "verified_phone": clean_phone,
                "phone": clean_phone
            }

    return JSONResponse({"status": "ignored", "message": "Token not found"}, status_code=400)
