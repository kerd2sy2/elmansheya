import concurrent.futures
import json
import os
import secrets
import threading
import time
import urllib.request
from app.config import (
    CRAFTSMEN_FILE,
    FILE_LOCK,
    FIREBASE_SA_FILE,
    NEWS_FILE,
    NOTIFICATIONS_FILE,
    PUSH_TOKENS_FILE,
    REPORTS_FILE,
    load_json,
    save_json,
)
from app.security import get_fcm_access_token

NOTIF_LOCK = threading.Lock()

def format_relative_time_ar(ts):
    try:
        diff = max(0, int(time.time()) - int(ts or 0))
    except Exception:
        return 'الآن'
    if diff < 60:
        return 'الآن'
    mins = diff // 60
    if mins < 60:
        if mins == 1:
            return 'منذ دقيقة'
        if mins == 2:
            return 'منذ دقيقتين'
        if mins <= 10:
            return f'منذ {mins} دقائق'
        return f'منذ {mins} دقيقة'
    hours = diff // 3600
    if hours < 24:
        if hours == 1:
            return 'منذ ساعة'
        if hours == 2:
            return 'منذ ساعتين'
        if hours <= 10:
            return f'منذ {hours} ساعات'
        return f'منذ {hours} ساعة'
    days = diff // 86400
    if days == 1:
        return 'منذ يوم'
    if days == 2:
        return 'منذ يومين'
    return f'منذ {days} يوم'

def prune_notifications(items):
    if not isinstance(items, list):
        return []
    now_ts = int(time.time())
    cutoff = now_ts - 172800  # 48 hours

    reports_map = {}
    try:
        rep_list = load_json(REPORTS_FILE)
        if isinstance(rep_list, list):
            for r in rep_list:
                if isinstance(r, dict) and r.get('id'):
                    reports_map[str(r['id'])] = r.get('status', '')
    except Exception:
        pass

    fresh = []
    for item in items:
        if not isinstance(item, dict):
            continue
        if int(item.get('timestamp', 0)) < cutoff:
            continue
        if item.get('section') == 'reports':
            target_id = str(item.get('target_id') or '')
            if target_id and reports_map.get(target_id) in ('pending_approval', 'rejected', 'declined'):
                continue
        fresh.append(item)

    return fresh[:25]

def build_seed_notifications():
    now_ts = int(time.time())
    seeds = []

    news_data = load_json(NEWS_FILE)
    if isinstance(news_data, dict):
        news_items = list(news_data.get('pinned_featured') or []) + list(news_data.get('small_news') or [])
        for idx, n in enumerate(news_items[:3]):
            title = (n.get('title') or '').strip()
            if not title:
                continue
            seeds.append({
                'id': f"seed-news-{n.get('id', idx)}",
                'section': 'news',
                'section_ar': 'قسم الأخبار',
                'title': title,
                'body': (n.get('summary') or title).strip()[:140],
                'target_id': str(n.get('id') or ''),
                'created_at': n.get('published_at') or time.strftime('%Y-%m-%dT%H:%M:%S+03:00'),
                'timestamp': now_ts - (idx * 600 + 300),
            })

    reports_data = load_json(REPORTS_FILE)
    if isinstance(reports_data, list):
        approved_reports = [
            rep for rep in reports_data
            if isinstance(rep, dict) and rep.get('status') not in ('pending_approval', 'rejected', 'declined')
        ]
        for idx, rep in enumerate(reversed(approved_reports[-2:])):
            title = (rep.get('title') or '').strip()
            if not title:
                continue
            kind = (rep.get('report_type_ar') or 'بلاغ').strip()
            addr = (rep.get('manual_address') or 'قرية المنشية').strip()
            seeds.append({
                'id': f"seed-report-{rep.get('id', idx)}",
                'section': 'reports',
                'section_ar': 'قسم البلاغات',
                'title': title,
                'body': f'{kind} - {addr}',
                'target_id': str(rep.get('id') or ''),
                'created_at': rep.get('created_at') or time.strftime('%Y-%m-%dT%H:%M:%S+03:00'),
                'timestamp': now_ts - ((idx + 3) * 900),
            })

    craftsmen_data = load_json(CRAFTSMEN_FILE)
    if isinstance(craftsmen_data, list):
        for idx, cr in enumerate(reversed(craftsmen_data[-2:])):
            name = (cr.get('full_name') or '').strip()
            if not name:
                continue
            spec = (cr.get('specialty') or 'حرفي').strip()
            area = (cr.get('area') or 'المنشية').strip()
            seeds.append({
                'id': f"seed-craft-{cr.get('id', idx)}",
                'section': 'craftsmen',
                'section_ar': 'قسم الصنايعية',
                'title': f'انضمام {name} ({spec})',
                'body': f'المنطقة: {area}',
                'target_id': str(cr.get('id') or ''),
                'created_at': time.strftime('%Y-%m-%dT%H:%M:%S+03:00'),
                'timestamp': now_ts - ((idx + 5) * 1200),
            })

    seeds.sort(key=lambda x: x.get('timestamp', 0), reverse=True)
    return prune_notifications(seeds)

def load_notifications():
    with NOTIF_LOCK:
        if not os.path.exists(NOTIFICATIONS_FILE):
            items = build_seed_notifications()
            if items:
                save_json(NOTIFICATIONS_FILE, items)
            return list(items)
        raw_items = load_json(NOTIFICATIONS_FILE)
        pruned = prune_notifications(raw_items)
        if isinstance(raw_items, list) and len(pruned) != len(raw_items):
            save_json(NOTIFICATIONS_FILE, pruned)
        return list(pruned)

def subscribe_fcm_tokens_to_topic(access_tok: str, topic_name: str, tokens: list):
    """ربط حزمة من التوكنات (حتى 1000 توكن لكل طلب) بـ Topic في Firebase بمكالمة واحدة فقط"""
    if not access_tok or not topic_name or not tokens:
        return
    clean_topic = topic_name.strip().lstrip('/')
    if not clean_topic.startswith('topics/'):
        clean_topic = f"topics/{clean_topic}"
    for i in range(0, len(tokens), 1000):
        chunk = [str(t).strip() for t in tokens[i:i + 1000] if str(t).strip() and not str(t).startswith('Expo')]
        if not chunk:
            continue
        try:
            payload = json.dumps({
                'to': f"/{clean_topic}",
                'registration_tokens': chunk,
            }, ensure_ascii=False).encode('utf-8')
            req = urllib.request.Request(
                'https://iid.googleapis.com/iid/v1:batchAdd',
                data=payload,
                headers={
                    'Authorization': f'Bearer {access_tok}',
                    'access_token_auth': 'true',
                    'Content-Type': 'application/json; charset=utf-8',
                },
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                resp.read()
        except Exception as e:
            print(f'[Gateway:fcm-topic-sub] {e}')

def send_fcm_v1_message(access_tok, project_id, target_key, target_val, title, body, str_data):
    url = f'https://fcm.googleapis.com/v1/projects/{project_id}/messages:send'
    payload = json.dumps({
        'message': {
            target_key: target_val,
            'notification': {
                'title': title,
                'body': body
            },
            'data': str_data,
            'android': {
                'priority': 'HIGH',
                'ttl': '86400s',
                'notification': {
                    'channel_id': 'elmansheya_alerts_v2',
                    'notification_priority': 'PRIORITY_MAX',
                    'visibility': 'PUBLIC',
                    'default_sound': True,
                    'default_vibrate_timings': True,
                    'default_light_settings': True,
                    'sound': 'default',
                    'color': '#973c00',
                },
            },
        }
    }, ensure_ascii=False).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            'Authorization': f'Bearer {access_tok}',
            'Content-Type': 'application/json; charset=utf-8',
        },
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=8) as r:
        r.read()

def dispatch_push_to_tokens(title: str, body: str, data: dict):
    """بث إشعار فوري موحد: إرسال مباشر وفوري لكل جهاز مسجل + بث عام عبر FCM Topic"""
    try:
        with NOTIF_LOCK:
            tokens_map = load_json(PUSH_TOKENS_FILE)
        if not isinstance(tokens_map, dict):
            tokens_map = {}

        expo_messages = []
        raw_fcm_tokens = []
        unsubscribed_fcm = []
        for tok, info in tokens_map.items():
            t = str(tok or '').strip()
            if not t or len(t) < 20 or t == 'diag':
                continue
            if t.startswith('ExponentPushToken[') or t.startswith('ExpoPushToken['):
                expo_messages.append({
                    'to': t,
                    'sound': 'default',
                    'title': title,
                    'body': body,
                    'data': data,
                    'priority': 'high',
                    'channelId': 'elmansheya_alerts_v2',
                })
            else:
                raw_fcm_tokens.append(t)
                if not isinstance(info, dict) or not info.get('subscribed_topic'):
                    unsubscribed_fcm.append(t)

        if expo_messages:
            def _send_expo_batch(batch):
                try:
                    payload = json.dumps(batch, ensure_ascii=False).encode('utf-8')
                    req = urllib.request.Request(
                        'https://exp.host/--/api/v2/push/send',
                        data=payload,
                        headers={
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                        method='POST',
                    )
                    with urllib.request.urlopen(req, timeout=5) as r:
                        r.read()
                except Exception as ex:
                    print('[Gateway:expo-send]', ex, flush=True)

            batches = [expo_messages[i:i + 100] for i in range(0, len(expo_messages), 100)]
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                list(executor.map(_send_expo_batch, batches))

        if os.path.exists(FIREBASE_SA_FILE):
            access_tok, project_id = get_fcm_access_token()
            if access_tok and project_id:
                str_data = {str(k): str(v or '') for k, v in (data or {}).items()}

                # ١. إرسال فوري مباشر لجميع أجهزة أندرويد المسجلة (وصول لحظي بدون انتظار نشر التوبيك)
                if raw_fcm_tokens:
                    def _send_direct(tok):
                        try:
                            send_fcm_v1_message(access_tok, project_id, 'token', tok, title, body, str_data)
                        except Exception as ex:
                            print(f'[Gateway:fcm-direct-err] {tok[:15]}...: {ex}', flush=True)

                    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                        list(executor.map(_send_direct, raw_fcm_tokens))
                    print(f'[Gateway:push-dispatch] Sent directly to {len(raw_fcm_tokens)} registered devices', flush=True)

                # ٢. إرسال عام للتوبيك كبث احتياطي
                try:
                    send_fcm_v1_message(access_tok, project_id, 'topic', 'elmansheya_all', title, body, str_data)
                    print('[Gateway:push-dispatch] Broadcast sent to topic "elmansheya_all"', flush=True)
                except Exception as topic_err:
                    print('[Gateway:fcm-topic]', topic_err, flush=True)

                # ربط أي توكن جديد بالتوبيك في الخلفية
                if unsubscribed_fcm:
                    try:
                        subscribe_fcm_tokens_to_topic(access_tok, 'elmansheya_all', unsubscribed_fcm)
                        with NOTIF_LOCK:
                            cur_map = load_json(PUSH_TOKENS_FILE)
                            if isinstance(cur_map, dict):
                                for u_tok in unsubscribed_fcm:
                                    if u_tok in cur_map and isinstance(cur_map[u_tok], dict):
                                        cur_map[u_tok]['subscribed_topic'] = 'elmansheya_all'
                                save_json(PUSH_TOKENS_FILE, cur_map)
                    except Exception as sub_err:
                        print('[Gateway:fcm-topic-sub-err]', sub_err, flush=True)
    except Exception as e:
        print('[Gateway:push-dispatch]', e, flush=True)

def create_system_notification(section, section_ar, title, body, target_id=''):
    sec_ar = str(section_ar or 'تنبيه عام').strip()
    raw_title = str(title or '').strip()
    raw_body = str(body or '').strip()

    notif = {
        'id': f"notif-{int(time.time() * 1000)}-{secrets.randbelow(1000)}",
        'section': section or 'general',
        'section_ar': sec_ar,
        'title': raw_title,
        'body': raw_body,
        'target_id': str(target_id or ''),
        'created_at': time.strftime('%Y-%m-%dT%H:%M:%S+03:00'),
        'timestamp': int(time.time()),
    }
    with NOTIF_LOCK:
        items = load_json(NOTIFICATIONS_FILE)
        if not isinstance(items, list):
            items = [] if os.path.exists(NOTIFICATIONS_FILE) else build_seed_notifications()
        items.insert(0, notif)
        items = prune_notifications(items)
        save_json(NOTIFICATIONS_FILE, items)

    # إضافة تصنيف القسم بوضوح لعنوان الإشعار حتى يظهر في شريط إشعارات الهاتف
    push_title = raw_title
    if sec_ar and sec_ar not in raw_title:
        push_title = f"{sec_ar}: {raw_title}"

    threading.Thread(
        target=dispatch_push_to_tokens,
        args=(
            push_title,
            raw_body,
            {
                'section': notif['section'],
                'section_ar': notif['section_ar'],
                'target_id': notif['target_id'],
                'id': notif['id'],
            },
        ),
        daemon=True,
    ).start()
    return notif

def emit_section_notification_on_write(path: str, req_json: dict, resp_json: dict):
    resp_data = resp_json.get('data') if isinstance(resp_json, dict) else {}
    if not isinstance(resp_data, dict):
        resp_data = {}
    item_id = resp_data.get('id') or resp_json.get('id') or ''

    if '/news/publish' in path:
        title = (req_json.get('title') or resp_data.get('title') or 'خبر جديد بالقرية').strip()
        summary = (req_json.get('summary') or req_json.get('content') or resp_data.get('summary') or title).strip()
        create_system_notification('news', 'قسم الأخبار', title, summary[:160], item_id)
    elif '/reports/approve' in path or '/reports/update-status' in path or '/reports/status' in path:
        new_status = (req_json.get('status') or resp_data.get('status') or '').strip()
        if new_status in ('approved', 'in_progress', 'resolved'):
            title = (resp_data.get('title') or req_json.get('title') or 'بلاغ معتمد').strip()
            kind = (resp_data.get('report_type_ar') or req_json.get('report_type_ar') or 'بلاغ').strip()
            addr = (resp_data.get('manual_address') or req_json.get('manual_address') or 'المنشية').strip()
            create_system_notification('reports', 'قسم البلاغات', f'موافقة على بلاغ: {title}', f'{kind} - {addr}', item_id)
    elif '/craftsmen/create' in path or '/craftsmen/register' in path:
        name = (req_json.get('full_name') or resp_data.get('full_name') or 'حرفي جديد').strip()
        spec = (req_json.get('specialty') or req_json.get('profession_ar') or resp_data.get('specialty') or 'حرفي').strip()
        area = (req_json.get('area') or resp_data.get('area') or 'المنشية').strip()
        create_system_notification('craftsmen', 'قسم الصنايعية', f'انضمام {name} ({spec})', f'المنطقة: {area}', item_id)
    elif '/services/create-item' in path:
        name = (req_json.get('title') or req_json.get('name') or resp_data.get('title') or 'خدمة جديدة').strip()
        addr = (req_json.get('address') or resp_data.get('address') or req_json.get('description') or 'تمت إضافة خدمة جديدة في دليل الخدمات.').strip()
        create_system_notification('services', 'قسم الخدمات', name, addr[:160], item_id)
