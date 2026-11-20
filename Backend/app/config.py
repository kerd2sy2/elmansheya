import json
import os
import threading

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'go-api', 'data')

ACCOUNTS_FILE = os.path.join(DATA_DIR, 'auth_accounts.json')
REPORTS_FILE = os.path.join(DATA_DIR, 'reports.json')
NEWS_FILE = os.path.join(DATA_DIR, 'news.json')
CRAFTSMEN_FILE = os.path.join(DATA_DIR, 'craftsmen.json')
NOTIFICATIONS_FILE = os.path.join(DATA_DIR, 'notifications.json')
PUSH_TOKENS_FILE = os.path.join(DATA_DIR, 'push_tokens.json')
FIREBASE_SA_FILE = os.path.join(BASE_DIR, 'firebase-service-account.json')

UPSTREAM_URL = os.environ.get('UPSTREAM_URL', 'http://127.0.0.1:8082')
GATEWAY_PHONE_NUMBER = os.environ.get('SMS_GATEWAY_PHONE', '+201550888841')
SUPERVISOR_WHATSAPP_NUMBER = os.environ.get('SUPERVISOR_WHATSAPP', '+201550888841')
JWT_SECRET = os.environ.get('JWT_SECRET', 'elmansheya-dev-hmac-secret-key-2026-change-in-prod')
WHATSAPP_SERVICE_URL = os.environ.get('WHATSAPP_SERVICE_URL', 'http://127.0.0.1:3005')

FILE_LOCK = threading.Lock()

def load_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}

def save_json(path, data):
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f'[Config] Failed to save JSON ({path}): {e}')
