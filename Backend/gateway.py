import json
import os
import random
import re
import time
import urllib.request
import urllib.error
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
import sys
import secrets
import hashlib
import base64
import hmac

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'go-api', 'data')
ACCOUNTS_FILE = os.path.join(DATA_DIR, 'auth_accounts.json')
REPORTS_FILE = os.path.join(DATA_DIR, 'reports.json')
UPSTREAM_URL = 'http://127.0.0.1:8082'

# إدارة جلسات توثيق الشرائح والواتساب
PENDING_VERIFICATIONS = {}
VERIFIED_DEVICES = {}
PENDING_OTPS = {}
GATEWAY_PHONE_NUMBER = os.environ.get('SMS_GATEWAY_PHONE', '+201550888841')
SUPERVISOR_WHATSAPP_NUMBER = os.environ.get('SUPERVISOR_WHATSAPP', '+201550888841')

def make_jwt_and_refresh(user_id, phone, role):
    now = int(time.time())
    session_id = f"sess-{user_id}-{int(time.time()*1000)}"
    payload = {
        "sub": user_id,
        "phone": phone,
        "role": role,
        "sid": session_id,
        "iat": now,
        "exp": now + (30 * 24 * 3600)  # 30 days
    }
    header_b64 = base64.urlsafe_b64encode(b'{"alg":"HS256","typ":"JWT"}').decode('utf-8').rstrip('=')
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode('utf-8')).decode('utf-8').rstrip('=')
    signing_input = f"{header_b64}.{payload_b64}"
    secret = os.environ.get('JWT_SECRET', 'elmansheya-dev-hmac-secret-key-2026-change-in-prod').encode('utf-8')
    sig = base64.urlsafe_b64encode(hmac.new(secret, signing_input.encode('utf-8'), hashlib.sha256).digest()).decode('utf-8').rstrip('=')
    access_token = f"{signing_input}.{sig}"
    raw_refresh = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
    return access_token, raw_refresh

def load_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}

def save_json(path, data):
    try:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print('[Gateway] Failed to save JSON:', e)

class GatewayHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def handle_expect_100(self):
        self.wfile.write(b"HTTP/1.1 100 Continue\r\n\r\n")
        return True

    def send_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Connection', 'close')
        self.end_headers()
        self.wfile.write(body)

    def send_html(self, html_str, status=200):
        body = html_str.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Connection', 'close')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors()
        self.send_header('Connection', 'close')
        self.end_headers()

    def do_GET(self):
        try:
            self._handle_get()
        except Exception as e:
            import traceback
            traceback.print_exc()
            self.send_response(500)
            self.end_headers()

    def _handle_get(self):
        # رابط التفعيل السريع للمشرف عبر الواتساب /activate
        if self.path.startswith('/activate'):
            token = ''
            if '/activate/' in self.path:
                token = self.path.split('/activate/', 1)[-1].split('?')[0].strip()

            query = self.path.split('?', 1)[-1] if '?' in self.path else ''
            params = dict(p.split('=', 1) for p in query.split('&') if '=' in p)
            if not token:
                token = urllib.parse.unquote(params.get('token', '')).strip()
            phone = urllib.parse.unquote(params.get('phone', '')).strip()

            # لو المشرف فتح الرابط بدون توكن (بسبب اقتطاع واتساب للرابط)، نأخذ أحدث كود قيد الانتظار تلقائياً!
            if not token and PENDING_VERIFICATIONS:
                for k, v in reversed(list(PENDING_VERIFICATIONS.items())):
                    if not v.get('verified'):
                        token = k
                        break

            clean_phone = re.sub(r'[^0-9]', '', phone)
            if clean_phone.startswith('20') and len(clean_phone) == 12:
                clean_phone = '0' + clean_phone[2:]
            elif clean_phone.startswith('966') and len(clean_phone) >= 12:
                clean_phone = '0' + clean_phone[3:]

            # إذا تم تقديم التوكن ورقم الهاتف، يتم التفعيل فوراً!
            if token and clean_phone and token in PENDING_VERIFICATIONS:
                info = PENDING_VERIFICATIONS[token]
                info['verified'] = True
                info['phone_number'] = clean_phone
                key = f"{info['device_fingerprint']}_sim_{info['sim_slot']}"
                VERIFIED_DEVICES[key] = clean_phone

                # فحص إن كان مسجلاً بالداتابيز
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

                # عرض صفحة النجاح للمشرف
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
                self.send_html(html)
                return

            # إذا تم فتح الرابط ولم يحدد الرقم بعد، المشرف يكتب رقم هاتف المواطن
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
            self.send_html(html)
            return

        # فحص حالة وصول رسالة التوثيق من الشريحة /auth/check-sim-verification
        if '/auth/check-sim-verification' in self.path:
            token = ''
            if '?' in self.path:
                query = self.path.split('?', 1)[-1]
                params = dict(p.split('=', 1) for p in query.split('&') if '=' in p)
                token = urllib.parse.unquote(params.get('session_token') or params.get('token', '')).strip()
            if not token:
                parts = self.path.split('/auth/check-sim-verification/')
                if len(parts) > 1:
                    token = parts[1].split('?')[0].strip()

            v = PENDING_VERIFICATIONS.get(token)
            if v and v.get('verified') and v.get('phone_number'):
                self.send_json({
                    'status': 'verified',
                    'success': True,
                    'phone_number': v['phone_number'],
                    'data': {
                        'verified': True,
                        'phone': v['phone_number'],
                        'bound': v.get('bound', False),
                        'full_name': v.get('full_name', '')
                    }
                })
            elif v:
                self.send_json({
                    'status': 'pending',
                    'success': True,
                    'data': {'verified': False}
                })
            else:
                self.send_json({
                    'status': 'not_found',
                    'success': False,
                    'message': 'Token not found'
                }, 404)
            return

        # 1. فحص الهاتف المسجل مسبقاً /check-device
        if '/auth/check-device' in self.path:
            query = self.path.split('?', 1)[-1] if '?' in self.path else ''
            params = dict(p.split('=', 1) for p in query.split('&') if '=' in p)
            fp = urllib.parse.unquote(params.get('device_fingerprint', '')).strip()
            phone_param = urllib.parse.unquote(params.get('phone', '')).strip()

            db = load_json(ACCOUNTS_FILE)
            d2u = db.get('device_to_user', {})
            by_id = db.get('by_id', {})
            accounts = db.get('accounts', {})

            bound = False
            found_phone = ''
            found_name = ''

            # أ. فحص رقم الهاتف إذا تم تمريره
            if phone_param and phone_param in accounts:
                bound = True
                found_phone = phone_param
                found_name = accounts[phone_param].get('FullName') or accounts[phone_param].get('full_name', '')

            # ب. فحص بصمة الجهاز
            if not bound and fp:
                # 1. فحص خريطة الأجهزة
                if fp in d2u:
                    uid = d2u[fp]
                    acc = by_id.get(uid) or next((a for a in accounts.values() if a.get('ID') == uid or a.get('id') == uid), None)
                    if acc:
                        bound = True
                        found_phone = acc.get('Phone') or acc.get('phone', '')
                        found_name = acc.get('FullName') or acc.get('full_name', '')

                # 2. فحص حسابات المواطنين المباشرة
                if not bound:
                    for acc in accounts.values():
                        if acc.get('BoundDeviceFingerprint') == fp or acc.get('bound_device_fingerprint') == fp:
                            bound = True
                            found_phone = acc.get('Phone') or acc.get('phone', '')
                            found_name = acc.get('FullName') or acc.get('full_name', '')
                            break

            resp = {
                'success': True,
                'module': 'auth',
                'version': 'v1',
                'data': {
                    'bound': bound,
                    'phone': found_phone,
                    'full_name': found_name,
                }
            }
            body = json.dumps(resp, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_cors()
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        # 2. فحص بلاغاتي الخاصة بالمواطن /reports/my-reports
        if '/reports/my-reports' in self.path:
            query = self.path.split('?', 1)[-1] if '?' in self.path else ''
            params = dict(p.split('=', 1) for p in query.split('&') if '=' in p)
            phone = urllib.parse.unquote(params.get('phone', '')).strip()
            uid = urllib.parse.unquote(params.get('user_id', '')).strip()

            reports = load_json(REPORTS_FILE)
            if not isinstance(reports, list):
                reports = []

            out = []
            if phone or uid:
                for rep in reports:
                    rep_phone = (rep.get('user_phone') or '').strip()
                    rep_uid = (rep.get('user_id') or '').strip()
                    if (phone and rep_phone == phone) or (uid and rep_uid == uid):
                        out.append(rep)

            resp = {
                'success': True,
                'module': 'reports',
                'version': 'v1',
                'data': out
            }
            body = json.dumps(resp, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_cors()
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        # تحويل باقي طلبات GET للأبستريم
        self.proxy_request('GET')

    def do_POST(self):
        content_len = int(self.headers.get('Content-Length', 0))
        body_bytes = self.rfile.read(content_len) if content_len > 0 else b''

        # إرسال كود OTP للمواطن عبر واتساب السيرفر تلقائياً /auth/send-whatsapp-otp
        if '/auth/send-whatsapp-otp' in self.path:
            try:
                req_json = json.loads(body_bytes.decode('utf-8')) if body_bytes else {}
                phone = (req_json.get('phone') or '').strip()
                device_fp = (req_json.get('device_fingerprint') or '').strip()

                clean_phone = re.sub(r'[^0-9]', '', phone)
                if clean_phone.startswith('20') and len(clean_phone) == 12:
                    clean_phone = '0' + clean_phone[2:]
                elif clean_phone.startswith('966') and len(clean_phone) >= 12:
                    clean_phone = '0' + clean_phone[3:]

                if not clean_phone or len(clean_phone) < 10:
                    self.send_json({"success": False, "error": "يرجى إدخال رقم هاتف صحيح"}, 400)
                    return

                # توليد كود مكون من 4 أرقام
                code = f"{secrets.randbelow(9000) + 1000}"
                PENDING_OTPS[clean_phone] = {
                    "code": code,
                    "expires_at": time.time() + 300,
                    "device_fingerprint": device_fp,
                    "wrong_attempts": 0
                }

                # استدعاء خدمة الواتساب المحلية لإرسال الكود
                wa_req = urllib.request.Request(
                    'http://127.0.0.1:3005/send-otp',
                    data=json.dumps({"phone": clean_phone, "code": code}).encode('utf-8'),
                    headers={'Content-Type': 'application/json'}
                )
                try:
                    wa_res = urllib.request.urlopen(wa_req, timeout=8)
                    wa_data = json.loads(wa_res.read().decode('utf-8'))
                    if wa_data.get('success'):
                        self.send_json({
                            "success": True,
                            "message": "تم إرسال كود الدخول إلى رقم واتساب الخاص بك",
                            "phone": clean_phone,
                            "expires_in": 300
                        })
                        return
                    else:
                        self.send_json({"success": False, "error": wa_data.get('error', 'تعذر إرسال رسالة الواتساب')}, 500)
                        return
                except Exception as wa_err:
                    print('[WhatsApp service error]', wa_err)
                    # إذا كانت خدمة الواتساب قيد الربط، نرجع الكود في الرد لأغراض الاختبار
                    self.send_json({
                        "success": True,
                        "message": "كود التحقق الخاص بك هو: " + code,
                        "dev_code": code,
                        "phone": clean_phone
                    })
                    return
            except Exception as e:
                self.send_json({"success": False, "error": str(e)}, 500)
                return

        # التحقق من كود الـ OTP /auth/verify-whatsapp-otp
        if '/auth/verify-whatsapp-otp' in self.path:
            try:
                req_json = json.loads(body_bytes.decode('utf-8')) if body_bytes else {}
                phone = (req_json.get('phone') or '').strip()
                code = (req_json.get('code') or '').strip()
                device_fp = (req_json.get('device_fingerprint') or '').strip()

                clean_phone = re.sub(r'[^0-9]', '', phone)
                if clean_phone.startswith('20') and len(clean_phone) == 12:
                    clean_phone = '0' + clean_phone[2:]
                elif clean_phone.startswith('966') and len(clean_phone) >= 12:
                    clean_phone = '0' + clean_phone[3:]

                item = PENDING_OTPS.get(clean_phone)
                # فحص وجود الكود وصلاحيته ثم تتبع محاولات الإدخال الخاطئة
                if not item or time.time() > item.get('expires_at', 0):
                    if item and clean_phone in PENDING_OTPS:
                        del PENDING_OTPS[clean_phone]
                    self.send_json({"success": False, "error": "كود التحقق غير صحيح أو انتهت صلاحيته"}, 400)
                    return

                if item.get('code') != code:
                    item['wrong_attempts'] = item.get('wrong_attempts', 0) + 1
                    if item['wrong_attempts'] >= 3:
                        del PENDING_OTPS[clean_phone]
                        self.send_json({"success": False, "error": "تم إدخال رمز خاطئ 3 مرات. يرجى طلب رمز جديد"}, 400)
                        return
                    self.send_json({"success": False, "error": "كود التحقق غير صحيح أو انتهت صلاحيته"}, 400)
                    return

                # مسح الكود بعد الاستخدام
                del PENDING_OTPS[clean_phone]

                # فحص هل المستخدم مسجل مسبقاً
                db = load_json(ACCOUNTS_FILE)
                accounts = db.get('accounts', {})
                if clean_phone in accounts:
                    acc = accounts[clean_phone]
                    uid = acc.get('ID') or f"usr-{int(time.time()*1000)}"
                    role = acc.get('Role') or 'citizen'

                    # ربط البصمة إذا وجدت
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
                        "role": role,
                        "role_name_ar": acc.get('RoleNameAr') or "المواطن",
                        "verification_status": acc.get('VerificationStatus') or "verified",
                        "area": acc.get('Area') or "المنشية",
                        "biometric_enabled": acc.get('BiometricEnabled', False)
                    }

                    self.send_json({
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
                    })
                    return
                else:
                    self.send_json({
                        "success": True,
                        "is_registered": False,
                        "phone": clean_phone,
                        "data": {
                            "is_registered": False,
                            "phone": clean_phone
                        }
                    })
                    return
            except Exception as e:
                self.send_json({"success": False, "error": str(e)}, 500)
                return

        # إكمال تسجيل حساب مواطن جديد بالاسم وتاريخ الميلاد بعد كود الواتساب
        if '/auth/complete-whatsapp-registration' in self.path:
            try:
                req_json = json.loads(body_bytes.decode('utf-8')) if body_bytes else {}
                phone = (req_json.get('phone') or '').strip()
                full_name = (req_json.get('full_name') or '').strip()
                birth_date = (req_json.get('birth_date') or '').strip()
                area = (req_json.get('area') or 'المنشية').strip()
                device_fp = (req_json.get('device_fingerprint') or '').strip()

                clean_phone = re.sub(r'[^0-9]', '', phone)
                if clean_phone.startswith('20') and len(clean_phone) == 12:
                    clean_phone = '0' + clean_phone[2:]
                elif clean_phone.startswith('966') and len(clean_phone) >= 12:
                    clean_phone = '0' + clean_phone[3:]

                if not clean_phone or not full_name:
                    self.send_json({"success": False, "error": "يرجى إدخال رقم الهاتف والاسم بالكامل"}, 400)
                    return

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

                self.send_json({
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
                })
                return
            except Exception as e:
                self.send_json({"success": False, "error": str(e)}, 500)
                return

        # ١. طلب بدء توثيق الشريحة وإصدار كود الرسالة /auth/request-sim-verification
        if '/auth/request-sim-verification' in self.path:
            try:
                req_json = json.loads(body_bytes.decode('utf-8')) if body_bytes else {}
                device_fp = (req_json.get('device_fingerprint') or '').strip()
                sim_slot = req_json.get('sim_slot', 1)

                if not device_fp:
                    self.send_json({"status": "error", "message": "Missing device_fingerprint"}, 400)
                    return

                # توليد كود توثيق (Token) فريد لكل محاولة توثيق شريحة
                token = f"ELM-{secrets.randbelow(900000) + 100000}"
                PENDING_VERIFICATIONS[token] = {
                    "device_fingerprint": device_fp,
                    "sim_slot": sim_slot,
                    "verified": False,
                    "phone_number": None,
                    "timestamp": time.time()
                }

                self.send_json({
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
                })
                return
            except Exception as e:
                print('[Gateway:request-sim-verification error]', e)
                self.send_json({"status": "error", "message": str(e)}, 500)
                return

        # ١-ب. طلب توثيق عبر واتساب المشرف العام /auth/request-whatsapp-verification
        if '/auth/request-whatsapp-verification' in self.path:
            try:
                req_json = json.loads(body_bytes.decode('utf-8')) if body_bytes else {}
                device_fp = (req_json.get('device_fingerprint') or '').strip()
                sim_slot = req_json.get('sim_slot', 1)
                phone_hint = (req_json.get('phone') or '').strip()

                if not device_fp:
                    self.send_json({"status": "error", "message": "Missing device_fingerprint"}, 400)
                    return

                token = f"ELM-{secrets.randbelow(900000) + 100000}"
                PENDING_VERIFICATIONS[token] = {
                    "device_fingerprint": device_fp,
                    "sim_slot": sim_slot,
                    "verified": False,
                    "phone_number": None,
                    "timestamp": time.time()
                }

                # رابط التفعيل الذي سيصل للمشرف في رسالة الواتساب
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

                self.send_json({
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
                })
                return
            except Exception as e:
                print('[Gateway:request-whatsapp-verification error]', e)
                self.send_json({"status": "error", "message": str(e)}, 500)
                return

        # ٢. استقبال رسالة الـ SMS من الهاتف الراسل عبر البوابة المجانية /auth/sms-webhook
        if '/auth/sms-webhook' in self.path or '/auth/simulate-sms' in self.path:
            try:
                raw_str = body_bytes.decode('utf-8', errors='ignore') if body_bytes else ''
                print(f"[Gateway:sms-webhook received] RAW: {raw_str}")
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

                # في حال إرسال القالب كنص خام
                if not message_body and raw_str:
                    message_body = raw_str
                if not sender_phone and "From :" in raw_str:
                    m = re.search(r'From\s*:\s*([+0-9]+)', raw_str)
                    if m:
                        sender_phone = m.group(1)

                # تنظيف رقم الراسل
                clean_phone = re.sub(r'[^0-9]', '', sender_phone)
                if clean_phone.startswith('20') and len(clean_phone) == 12:
                    clean_phone = '0' + clean_phone[2:]
                elif clean_phone.startswith('966') and len(clean_phone) >= 12:
                    clean_phone = '0' + clean_phone[3:]

                found = False
                for token, info in list(PENDING_VERIFICATIONS.items()):
                    if (direct_token and direct_token == token) or (token in message_body):
                        info["verified"] = True
                        info["phone_number"] = clean_phone
                        key = f"{info['device_fingerprint']}_sim_{info['sim_slot']}"
                        VERIFIED_DEVICES[key] = clean_phone

                        # ربط الحساب إذا كان موجوداً في الداتابيز
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

                        found = True
                        self.send_json({
                            "status": "success",
                            "success": True,
                            "verified_phone": clean_phone,
                            "phone": clean_phone
                        })
                        return

                if not found:
                    self.send_json({"status": "ignored", "message": "Token not found"}, 400)
                    return
            except Exception as e:
                print('[Gateway:sms-webhook error]', e)
                self.send_json({"status": "error", "message": str(e)}, 500)
                return

        # أ. معالجة إنشاء حساب جديد لمنع الحسابات الوهمية على نفس الهاتف
        if '/auth/register' in self.path and body_bytes:
            try:
                req_json = json.loads(body_bytes.decode('utf-8'))
                fp = (req_json.get('device_fingerprint') or '').strip()

                db = load_json(ACCOUNTS_FILE)
                d2u = db.get('device_to_user', {})
                accounts = db.get('accounts', {})

                # فحص ما إذا كان الهاتف مقترناً بالفعل بحساب آخر
                if fp:
                    is_bound = fp in d2u or any(
                        (a.get('BoundDeviceFingerprint') == fp or a.get('bound_device_fingerprint') == fp)
                        for a in accounts.values()
                    )
                    if is_bound:
                        self.send_response(400)
                        self.send_cors()
                        self.send_header('Content-Type', 'application/json; charset=utf-8')
                        self.end_headers()
                        err_resp = {
                            'success': False,
                            'module': 'auth',
                            'isolated': True,
                            'error': {
                                'code': 'DEVICE_ALREADY_BOUND',
                                'message': 'هذا الهاتف مسجل به حساب مواطن آخر بالفعل. يُسمح بحساب واحد فقط لكل هاتف تجنباً للحسابات الزائفة.'
                            }
                        }
                        self.wfile.write(json.dumps(err_resp, ensure_ascii=False).encode('utf-8'))
                        return
            except Exception as e:
                print('[Gateway:register-check]', e)

        # تحويل الطلب للأبستريم
        upstream_resp_body, status, headers = self.forward_to_upstream('POST', body_bytes)

        # إذا نجح تسجيل الدخول أو إنشاء الحساب: نثبت البصمة في auth_accounts.json
        if status in (200, 201) and ('/auth/login' in self.path or '/auth/register' in self.path) and body_bytes:
            try:
                req_json = json.loads(body_bytes.decode('utf-8'))
                fp = (req_json.get('device_fingerprint') or '').strip()
                resp_json = json.loads(upstream_resp_body.decode('utf-8'))
                user_id = resp_json.get('data', {}).get('user', {}).get('id')
                user_phone = resp_json.get('data', {}).get('user', {}).get('phone')

                if fp and (user_id or user_phone):
                    db = load_json(ACCOUNTS_FILE)
                    d2u = db.setdefault('device_to_user', {})
                    accounts = db.setdefault('accounts', {})
                    by_id = db.setdefault('by_id', {})

                    uid = user_id or (accounts.get(user_phone, {}).get('ID'))
                    if uid:
                        d2u[fp] = uid

                    email = (req_json.get('email') or '').strip()

                    if user_phone and user_phone in accounts:
                        accounts[user_phone]['BoundDeviceFingerprint'] = fp
                        accounts[user_phone]['bound_device_fingerprint'] = fp
                        if email:
                            accounts[user_phone]['Email'] = email
                            accounts[user_phone]['email'] = email

                    if uid and uid in by_id:
                        by_id[uid]['BoundDeviceFingerprint'] = fp
                        by_id[uid]['bound_device_fingerprint'] = fp
                        if email:
                            by_id[uid]['Email'] = email
                            by_id[uid]['email'] = email

                    save_json(ACCOUNTS_FILE, db)
                    print(f'[Gateway] Bound device fingerprint {fp[:16]}... to user {user_phone}')
            except Exception as e:
                print('[Gateway:bind-on-success]', e)

        self.send_response(status)
        self.send_cors()
        for k, v in headers.items():
            if k.lower() not in ('content-length', 'transfer-encoding', 'connection', 'access-control-allow-origin'):
                self.send_header(k, v)
        self.send_header('Content-Length', str(len(upstream_resp_body)))
        self.end_headers()
        self.wfile.write(upstream_resp_body)

    def proxy_request(self, method):
        body, status, headers = self.forward_to_upstream(method, None)
        self.send_response(status)
        self.send_cors()
        for k, v in headers.items():
            if k.lower() not in ('content-length', 'transfer-encoding', 'connection', 'access-control-allow-origin'):
                self.send_header(k, v)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def forward_to_upstream(self, method, body_bytes):
        target = f"{UPSTREAM_URL}{self.path}"
        req = urllib.request.Request(target, data=body_bytes, method=method)
        for k, v in self.headers.items():
            if k.lower() not in ('host', 'content-length'):
                req.add_header(k, v)

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return resp.read(), resp.status, dict(resp.headers)
        except urllib.error.HTTPError as e:
            return e.read(), e.code, dict(e.headers)
        except Exception as e:
            err_body = json.dumps({'success': False, 'error': {'code': 'GATEWAY_ERROR', 'message': str(e)}}).encode('utf-8')
            return err_body, 502, {'Content-Type': 'application/json'}

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    server = HTTPServer(('0.0.0.0', port), GatewayHandler)
    print(f'[Gateway] Running on port {port} -> Upstream: {UPSTREAM_URL}')
    server.serve_forever()
