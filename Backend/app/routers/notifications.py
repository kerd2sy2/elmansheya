import json
import os
import threading
import time
from fastapi import APIRouter, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from app.config import FIREBASE_SA_FILE, PUSH_TOKENS_FILE, load_json, save_json
from app.security import get_fcm_access_token
from app.services.notifications import (
    NOTIF_LOCK,
    create_system_notification,
    format_relative_time_ar,
    load_notifications,
    subscribe_fcm_tokens_to_topic,
)

router = APIRouter(tags=["Notifications"])

def _get_notifications_feed():
    raw_items = load_notifications()
    out_items = []
    for n in raw_items:
        item_copy = dict(n)
        item_copy['time_ar'] = format_relative_time_ar(n.get('timestamp'))
        out_items.append(item_copy)
    return {
        'success': True,
        'module': 'notifications',
        'version': 'v1',
        'data': out_items,
    }

@router.get("/api/v1/notifications")
@router.get("/api/v1/notifications/feed")
@router.get("/notifications")
@router.get("/notifications/feed")
async def notifications_feed():
    return _get_notifications_feed()

@router.post("/notifications/register-token")
@router.post("/api/v1/notifications/register-token")
async def register_push_token(request: Request, bg_tasks: BackgroundTasks):
    try:
        req_json = await request.json()
    except Exception:
        req_json = {}

    token = (req_json.get('token') or '').strip()
    if not token:
        return JSONResponse({'success': False, 'error': 'التوكن مطلوب'}, status_code=400)

    if token == 'diag':
        print(
            '[Gateway:notif-diag]',
            json.dumps({
                'stage': req_json.get('stage'),
                'platform': req_json.get('platform'),
                'exec_env': req_json.get('exec_env'),
                'has_scheduler': req_json.get('has_scheduler'),
                'has_channel_mgr': req_json.get('has_channel_mgr'),
                'has_handler_mod': req_json.get('has_handler_mod'),
                'perm_status': req_json.get('perm_status'),
                'scheduled_ok': req_json.get('scheduled_ok'),
                'error': req_json.get('error'),
            }, ensure_ascii=False),
            flush=True,
        )
        return {'success': True}

    with NOTIF_LOCK:
        tokens_map = load_json(PUSH_TOKENS_FILE)
        if not isinstance(tokens_map, dict):
            tokens_map = {}
        tokens_map[token] = {
            'token': token,
            'phone': (req_json.get('phone') or '').strip(),
            'device_fingerprint': (req_json.get('device_fingerprint') or '').strip(),
            'platform': (req_json.get('platform') or 'android').strip(),
            'project_id': 'elmansheya-960f1',
            'subscribed_topic': 'elmansheya_all',
            'updated_at': int(time.time()),
        }
        save_json(PUSH_TOKENS_FILE, tokens_map)

    # ربط التوكن بقناة البث العام في الخلفية عبر Google IID
    if not token.startswith('Expo') and os.path.exists(FIREBASE_SA_FILE):
        def _bg_subscribe():
            try:
                acc_tok, _ = get_fcm_access_token()
                if acc_tok:
                    subscribe_fcm_tokens_to_topic(acc_tok, 'elmansheya_all', [token])
            except Exception:
                pass
        bg_tasks.add_task(_bg_subscribe)

    return {'success': True}

@router.post("/notifications/create")
@router.post("/api/v1/notifications/create")
async def create_notification(request: Request):
    try:
        req_json = await request.json()
    except Exception:
        req_json = {}

    title = (req_json.get('title') or '').strip()
    body_text = (req_json.get('body') or '').strip()
    if not title or not body_text:
        return JSONResponse({'success': False, 'error': 'عنوان ونص الإشعار مطلوبان'}, status_code=400)

    notif = create_system_notification(
        (req_json.get('section') or 'general').strip(),
        (req_json.get('section_ar') or 'تنبيه عام').strip(),
        title,
        body_text,
        req_json.get('target_id') or '',
    )
    return JSONResponse({'success': True, 'data': notif}, status_code=201)
