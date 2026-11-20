import base64
import hashlib
import hmac
import json
import os
import secrets
import subprocess
import tempfile
import time
import urllib.parse
import urllib.request
from app.config import FIREBASE_SA_FILE, JWT_SECRET, load_json

_FCM_TOKEN_CACHE = {'token': '', 'expires_at': 0}

def b64url(raw_bytes: bytes) -> str:
    return base64.urlsafe_b64encode(raw_bytes).decode('utf-8').rstrip('=')

def make_jwt_and_refresh(user_id: str, phone: str, role: str):
    now = int(time.time())
    session_id = f"sess-{user_id}-{int(time.time() * 1000)}"
    payload = {
        "sub": user_id,
        "phone": phone,
        "role": role,
        "sid": session_id,
        "iat": now,
        "exp": now + (30 * 24 * 3600)  # 30 days
    }
    header_b64 = b64url(b'{"alg":"HS256","typ":"JWT"}')
    payload_b64 = b64url(json.dumps(payload).encode('utf-8'))
    signing_input = f"{header_b64}.{payload_b64}"
    secret_bytes = JWT_SECRET.encode('utf-8')
    sig = b64url(hmac.new(secret_bytes, signing_input.encode('utf-8'), hashlib.sha256).digest())
    access_token = f"{signing_input}.{sig}"
    raw_refresh = b64url(secrets.token_bytes(32))
    return access_token, raw_refresh

def get_fcm_access_token():
    now_ts = int(time.time())
    if _FCM_TOKEN_CACHE['token'] and now_ts < _FCM_TOKEN_CACHE['expires_at']:
        return _FCM_TOKEN_CACHE['token'], None

    if not os.path.exists(FIREBASE_SA_FILE):
        return '', None

    sa = load_json(FIREBASE_SA_FILE)
    client_email = sa.get('client_email')
    private_key = sa.get('private_key')
    token_uri = sa.get('token_uri') or 'https://oauth2.googleapis.com/token'
    project_id = sa.get('project_id') or 'elmansheya-960f1'
    if not client_email or not private_key:
        return '', project_id

    header = b64url(b'{"alg":"RS256","typ":"JWT"}')
    claims = b64url(json.dumps({
        'iss': client_email,
        'scope': 'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/cloud-platform',
        'aud': token_uri,
        'iat': now_ts,
        'exp': now_ts + 3600,
    }, separators=(',', ':')).encode('utf-8'))
    signing_input = f'{header}.{claims}'.encode('utf-8')

    key_path = None
    try:
        fd, key_path = tempfile.mkstemp(prefix='fcm_', suffix='.pem')
        with os.fdopen(fd, 'w', encoding='utf-8') as kf:
            kf.write(private_key)
        proc = subprocess.run(
            ['openssl', 'dgst', '-sha256', '-sign', key_path],
            input=signing_input,
            capture_output=True,
            timeout=10,
            check=True,
        )
        jwt_token = f'{header}.{claims}.{b64url(proc.stdout)}'
    finally:
        if key_path and os.path.exists(key_path):
            try:
                os.remove(key_path)
            except Exception:
                pass

    form = urllib.parse.urlencode({
        'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion': jwt_token,
    }).encode('utf-8')
    req = urllib.request.Request(
        token_uri,
        data=form,
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        res_json = json.loads(resp.read().decode('utf-8'))
        access_tok = res_json.get('access_token', '')
        if access_tok:
            _FCM_TOKEN_CACHE['token'] = access_tok
            _FCM_TOKEN_CACHE['expires_at'] = now_ts + 3000
        return access_tok, project_id
