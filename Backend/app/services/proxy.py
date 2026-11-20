import json
import httpx
from fastapi import Request, Response
from app.config import ACCOUNTS_FILE, UPSTREAM_URL, load_json, save_json
from app.services.notifications import emit_section_notification_on_write

async def forward_to_upstream(request: Request, client: httpx.AsyncClient) -> Response:
    path = request.url.path
    query = request.url.query
    target_url = f"{UPSTREAM_URL}{path}"
    if query:
        target_url = f"{target_url}?{query}"

    body_bytes = await request.body()
    headers = dict(request.headers)
    headers.pop("host", None)
    headers.pop("content-length", None)

    # 1. فحص تكرار تسجيل الحساب من نفس الهاتف لمنع الحسابات الوهمية
    if path.endswith('/auth/register') and request.method == 'POST' and body_bytes:
        try:
            req_json = json.loads(body_bytes.decode('utf-8'))
            fp = (req_json.get('device_fingerprint') or '').strip()
            if fp:
                db = load_json(ACCOUNTS_FILE)
                d2u = db.get('device_to_user', {})
                accounts = db.get('accounts', {})
                is_bound = fp in d2u or any(
                    (a.get('BoundDeviceFingerprint') == fp or a.get('bound_device_fingerprint') == fp)
                    for a in accounts.values()
                )
                if is_bound:
                    err_resp = {
                        'success': False,
                        'module': 'auth',
                        'isolated': True,
                        'error': {
                            'code': 'DEVICE_ALREADY_BOUND',
                            'message': 'هذا الهاتف مسجل به حساب مواطن آخر بالفعل. يُسمح بحساب واحد فقط لكل هاتف تجنباً للحسابات الزائفة.'
                        }
                    }
                    return Response(
                        content=json.dumps(err_resp, ensure_ascii=False),
                        status_code=400,
                        media_type="application/json"
                    )
        except Exception as e:
            print('[Proxy:register-check]', e)

    # 2. إرسال الطلب للأبستريم عبر httpx غير المتزامن عالي السرعة
    try:
        resp = await client.request(
            method=request.method,
            url=target_url,
            content=body_bytes if body_bytes else None,
            headers=headers,
            timeout=180.0
        )
        upstream_resp_body = resp.content
        status = resp.status_code

        # 3. إشعار تلقائي لجميع المواطنين عند نشر أو اعتماد عناصر جديدة
        if status in (200, 201) and body_bytes and '/storage/upload' not in path and request.method in ('POST', 'PUT'):
            try:
                req_json_notif = json.loads(body_bytes.decode('utf-8'))
                resp_json_notif = json.loads(upstream_resp_body.decode('utf-8')) if upstream_resp_body else {}
                emit_section_notification_on_write(path, req_json_notif, resp_json_notif)
            except Exception as e:
                print('[Proxy:auto-notification]', e)

        # 4. تثبيت بصمة الجهاز عند نجاح الدخول أو التسجيل
        if status in (200, 201) and ('/auth/login' in path or '/auth/register' in path) and body_bytes:
            try:
                req_json = json.loads(body_bytes.decode('utf-8'))
                fp = (req_json.get('device_fingerprint') or '').strip()
                resp_json = json.loads(upstream_resp_body.decode('utf-8')) if upstream_resp_body else {}
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
                    print(f'[Proxy] Bound device fingerprint {fp[:16]}... to user {user_phone}')
            except Exception as e:
                print('[Proxy:bind-on-success]', e)

        resp_headers = {
            k: v for k, v in resp.headers.items()
            if k.lower() not in ('content-length', 'transfer-encoding', 'connection', 'access-control-allow-origin', 'content-encoding')
        }
        return Response(content=upstream_resp_body, status_code=status, headers=resp_headers)

    except httpx.HTTPStatusError as e:
        return Response(content=e.response.content, status_code=e.response.status_code)
    except Exception as e:
        err_body = json.dumps({'success': False, 'error': {'code': 'GATEWAY_ERROR', 'message': str(e)}}).encode('utf-8')
        return Response(content=err_body, status_code=502, media_type="application/json")
