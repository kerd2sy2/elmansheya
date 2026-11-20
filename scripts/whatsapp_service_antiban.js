import express from 'express';
import cors from 'cors';
import qrcode from 'qrcode';
import pino from 'pino';
import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers
} from '@whiskeysockets/baileys';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const AUTH_DIR = '/root/whatsapp-service/auth_info_baileys';
const WA_ADMIN_PASSWORD = process.env.WA_ADMIN_PASSWORD || 'Elmansheya@2026';

let sock = null;
let qrCodeDataUrl = null;
let latestPairingCode = null;
let connectionStatus = 'initializing';
let connectedPhone = null;
let lastDisconnectReason = '';
let isConnecting = false;

const VALID_ADMIN_TOKENS = new Set();
const LOGIN_RATE_LIMITS = new Map();

function normalizeWhatsAppDigits(rawPhone) {
    let clean = String(rawPhone || '').replace(/[^0-9]/g, '');
    if (clean.startsWith('01') && clean.length === 11) {
        clean = '2' + clean;
    } else if (clean.startsWith('05') && clean.length === 10) {
        clean = '966' + clean.substring(1);
    } else if (clean.startsWith('5') && clean.length === 9) {
        clean = '966' + clean;
    }
    return clean;
}

function getCookieToken(req) {
    const rawCookie = req.headers.cookie || '';
    for (const part of rawCookie.split(';')) {
        const idx = part.indexOf('=');
        if (idx === -1) continue;
        const k = part.slice(0, idx).trim();
        const v = part.slice(idx + 1).trim();
        if (k === 'wa_token') return decodeURIComponent(v);
    }
    return '';
}

function requireAdmin(req, res, next) {
    const token = getCookieToken(req);
    if (!token || !VALID_ADMIN_TOKENS.has(token)) {
        return res.status(401).json({ success: false, error: 'غير مصرح بالدخول' });
    }
    req.adminToken = token;
    next();
}

function clearAuthSessionFiles() {
    try {
        if (fs.existsSync(AUTH_DIR)) {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        }
    } catch (err) {
        console.error('[WhatsApp] Failed to clear auth dir:', err.message);
    }
}

function checkApiGatewayHealth() {
    return new Promise((resolve) => {
        const req = http.get('http://127.0.0.1:8080/api/v1/news', (resp) => {
            resp.resume();
            resolve(resp.statusCode >= 200 && resp.statusCode < 500);
        });
        req.setTimeout(2000, () => {
            req.destroy();
            resolve(false);
        });
        req.on('error', () => resolve(false));
    });
}

async function resolveWhatsAppUser(rawPhone) {
    if (!sock || connectionStatus !== 'connected') {
        return {
            ok: false,
            status: 503,
            body: { success: false, error: 'سيرفر الواتساب غير متصل حالياً' }
        };
    }

    const clean = normalizeWhatsAppDigits(rawPhone);
    if (!clean || clean.length < 7) {
        return {
            ok: false,
            status: 400,
            body: { success: false, error: 'يرجى إدخال رقم هاتف صحيح مع كود الدولة.' }
        };
    }

    const jid = `${clean}@s.whatsapp.net`;
    let waUser = null;
    try {
        const checkResults = await Promise.race([
            sock.onWhatsApp(jid),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3500))
        ]);
        waUser = Array.isArray(checkResults) ? checkResults[0] : null;
    } catch (checkErr) {
        console.warn(`[WhatsApp:onWhatsApp] Check timed out or failed for ${clean}, assuming valid JID:`, checkErr?.message);
        waUser = { jid, exists: true };
    }

    if (!waUser || !waUser.exists) {
        return {
            ok: false,
            status: 400,
            clean,
            exists: false,
            body: {
                success: false,
                exists: false,
                not_on_whatsapp: true,
                error: 'هذا الرقم غير مسجل على واتساب، يرجى التأكد من الرقم.'
            }
        };
    }

    return {
        ok: true,
        clean,
        exists: true,
        targetJid: waUser.jid || jid
    };
}

/**
 * صياغة رسالة رمز التحقق مع هاش فريد لمنع الحظر
 */
function buildAntiBanOtpMessage(code) {
    const hashId = crypto.randomInt(1000000000, 10000000000);
    return `رمز التحقق الخاص بك هو : *${code}*\n\nID: #${hashId}`;
}

async function sendAntiBanOtpToJid(targetJid, code) {
    try {
        await sock.sendPresenceUpdate('composing', targetJid);
        const typingDelay = Math.floor(Math.random() * 800) + 1000;
        await new Promise((r) => setTimeout(r, typingDelay));
        await sock.sendPresenceUpdate('paused', targetJid);
    } catch {
        // تجاهل خطأ محاكاة الكتابة إن حدث
    }

    const msgText = buildAntiBanOtpMessage(code);
    return sock.sendMessage(targetJid, { text: msgText });
}

async function connectToWhatsApp() {
    if (isConnecting) return;
    isConnecting = true;
    try {
        connectionStatus = 'connecting';
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: true,
            logger: pino({ level: 'silent' }),
            browser: Browsers.ubuntu('Chrome')
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                qrCodeDataUrl = await qrcode.toDataURL(qr, { scale: 8, margin: 2 });
                connectionStatus = 'scan_needed';
                console.log('[WhatsApp] New QR code generated.');
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const reasonMsg = lastDisconnect?.error?.message || 'unknown';
                lastDisconnectReason = `code=${statusCode || 'none'} (${reasonMsg})`;
                console.log(`[WhatsApp] Connection closed. statusCode: ${statusCode}, reason: ${reasonMsg}`);

                connectionStatus = 'disconnected';
                qrCodeDataUrl = null;
                connectedPhone = null;
                latestPairingCode = null;

                if (statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403) {
                    console.log('[WhatsApp] Session logged out/rejected. Clearing auth directory for fresh pairing...');
                    clearAuthSessionFiles();
                    setTimeout(connectToWhatsApp, 2000);
                } else {
                    setTimeout(connectToWhatsApp, 3000);
                }
            } else if (connection === 'open') {
                connectionStatus = 'connected';
                qrCodeDataUrl = null;
                latestPairingCode = null;
                lastDisconnectReason = '';
                connectedPhone = sock.user?.id ? sock.user.id.split(':')[0] : 'Connected';
                console.log('[WhatsApp] Connected successfully as:', connectedPhone);
            }
        });
    } catch (err) {
        console.error('[WhatsApp] connectToWhatsApp error:', err);
        setTimeout(connectToWhatsApp, 5000);
    } finally {
        isConnecting = false;
    }
}

function renderLoginHtml(errorMsg = '', isWhatsAppConnected = false) {
    const statusLabel = isWhatsAppConnected ? 'السيرفر متصل ويعمل' : 'السيرفر بانتظار الربط';
    const statusClass = isWhatsAppConnected ? 'pill ok' : 'pill warn';

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>بوابة إدارة المنشية - تسجيل الدخول</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif; background: #FAF5EE; color: #0F172A; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 18px; }
        .card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 24px; padding: 32px 24px; width: 100%; max-width: 420px; box-shadow: 0 14px 34px rgba(15, 23, 42, 0.08); text-align: center; }
        .brand-badge { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 18px; background: #FFF7ED; border: 1px solid #FED7AA; color: #973c00; font-size: 24px; font-weight: 900; margin-bottom: 14px; }
        h1 { margin: 0 0 8px; font-size: 22px; font-weight: 800; color: #0F172A; }
        p { margin: 0 0 18px; color: #64748B; font-size: 13.5px; line-height: 1.65; }
        .pill { display: inline-flex; align-items: center; gap: 7px; padding: 6px 14px; border-radius: 999px; font-size: 12.5px; font-weight: 700; margin-bottom: 20px; }
        .pill.ok { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
        .pill.warn { background: #FFF7ED; color: #973c00; border: 1px solid #FED7AA; }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
        .err { background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; padding: 11px 14px; border-radius: 12px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
        .input-wrap { position: relative; margin-bottom: 14px; }
        input { width: 100%; height: 50px; padding: 0 14px 0 68px; border: 1.5px solid #CBD5E1; border-radius: 14px; background: #F8FAFC; font-size: 15px; outline: none; color: #0F172A; }
        input:focus { border-color: #973c00; background: #FFFFFF; }
        .toggle-btn { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); background: #E2E8F0; color: #334155; border: none; border-radius: 8px; padding: 6px 10px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .submit-btn { width: 100%; height: 50px; background: #973c00; color: #FFFFFF; border: none; border-radius: 14px; font-size: 15.5px; font-weight: 800; cursor: pointer; }
        .submit-btn:hover { background: #7c3200; }
        .foot-note { margin-top: 18px; font-size: 12px; color: #64748B; }
    </style>
</head>
<body>
    <div class="card">
        <div class="brand-badge">م</div>
        <h1>بوابة إدارة سيرفر المنشية</h1>
        <p>قم بتسجيل الدخول لإدارة اتصال الواتساب وفحص الأرقام ومتابعة حالة السيرفر.</p>
        <div class="${statusClass}"><span class="dot"></span>${statusLabel}</div>
        ${errorMsg ? `<div class="err">${errorMsg}</div>` : ''}
        <form method="POST" action="/admin/login">
            <div class="input-wrap">
                <input id="pw" type="password" name="password" placeholder="أدخل كلمة مرور الإدارة" required autofocus />
                <button type="button" class="toggle-btn" onclick="togglePw(this)">إظهار</button>
            </div>
            <button type="submit" class="submit-btn">تسجيل الدخول</button>
        </form>
        <div class="foot-note">الحماية مفعّلة: إيقاف مؤقت 5 دقائق بعد 3 محاولات خاطئة</div>
    </div>
    <script>
        function togglePw(btn) {
            var inp = document.getElementById('pw');
            if (inp.type === 'password') {
                inp.type = 'text';
                btn.textContent = 'إخفاء';
            } else {
                inp.type = 'password';
                btn.textContent = 'إظهار';
            }
        }
    </script>
</body>
</html>`;
}

function renderDashboardHtml() {
    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>لوحة التحكم والحالات - المنشية</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif; background: #FAF5EE; color: #0F172A; margin: 0; padding: 20px 14px 40px; }
        .container { max-width: 780px; margin: 0 auto; }
        .topbar { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 20px; padding: 16px 20px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04); }
        .topbar-title { margin: 0; font-size: 19px; font-weight: 800; color: #0F172A; }
        .topbar-sub { font-size: 12.5px; color: #64748B; margin-top: 2px; }
        .topbar-actions { display: flex; gap: 8px; align-items: center; }
        .btn-soft { background: #FFF7ED; color: #973c00; border: 1px solid #FED7AA; padding: 8px 14px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; }
        .btn-logout { background: #F1F5F9; color: #475569; border: 1px solid #E2E8F0; padding: 8px 14px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; }

        .status-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
        @media (max-width: 640px) { .status-grid { grid-template-columns: 1fr; } }
        .status-btn { text-align: right; background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 16px; padding: 14px 16px; cursor: pointer; transition: border-color 0.15s, transform 0.1s; display: flex; flex-direction: column; gap: 6px; }
        .status-btn:hover { border-color: #973c00; }
        .status-btn.active { border-color: #973c00; background: #FFFBF7; }
        .status-label { font-size: 12.5px; font-weight: 700; color: #64748B; }
        .status-val { font-size: 15px; font-weight: 800; color: #0F172A; display: flex; align-items: center; gap: 7px; }
        .dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
        .dot.ok { background: #10B981; }
        .dot.warn { background: #D97706; }
        .dot.err { background: #DC2626; }

        .nav-tabs { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
        .nav-tab { flex: 1; min-width: 140px; height: 44px; background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 12px; font-size: 13.5px; font-weight: 700; color: #475569; cursor: pointer; }
        .nav-tab.active { background: #973c00; border-color: #973c00; color: #FFFFFF; }

        .page { display: none; }
        .page.active { display: block; }
        .card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 22px; padding: 24px 20px; margin-bottom: 16px; box-shadow: 0 10px 26px rgba(15, 23, 42, 0.05); text-align: center; }
        .card-left { text-align: right; }
        .section-title { font-size: 16px; font-weight: 800; color: #0F172A; margin: 0 0 8px; }
        .hint { font-size: 13px; color: #64748B; margin: 0 0 14px; line-height: 1.65; }

        .badge { display: inline-block; padding: 7px 16px; border-radius: 999px; font-size: 13.5px; font-weight: 800; margin-bottom: 12px; }
        .badge.ok { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
        .badge.warn { background: #FFF7ED; color: #973c00; border: 1px solid #FED7AA; }
        .badge.err { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
        .phone-box { direction: ltr; font-size: 19px; font-weight: 800; color: #0F172A; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px 20px; border-radius: 12px; display: inline-block; margin-bottom: 14px; }

        .quick-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 10px; }
        .btn-primary { height: 46px; padding: 0 18px; background: #973c00; color: #FFFFFF; border: none; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; }
        .btn-primary:hover { background: #7c3200; }
        .btn-outline { height: 42px; padding: 0 16px; background: #FFFFFF; color: #334155; border: 1.5px solid #CBD5E1; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; }
        .btn-danger-soft { height: 42px; padding: 0 16px; background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; }

        .mode-switch { display: inline-flex; background: #F1F5F9; padding: 4px; border-radius: 12px; gap: 4px; margin-bottom: 16px; }
        .mode-btn { padding: 8px 14px; border: none; border-radius: 9px; font-size: 13px; font-weight: 700; color: #475569; background: transparent; cursor: pointer; }
        .mode-btn.active { background: #FFFFFF; color: #973c00; box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); }

        .qr-wrap { background: #FFFFFF; border: 1px solid #E2E8F0; padding: 14px; border-radius: 16px; display: inline-block; margin: 6px 0 12px; }
        .qr-wrap img { width: 220px; height: 220px; display: block; }

        .preset-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
        .preset-chip { background: #FFF7ED; color: #973c00; border: 1px solid #FED7AA; border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .pair-row { direction: ltr; display: flex; gap: 8px; margin-bottom: 10px; }
        .pair-row input { flex: 1; height: 46px; padding: 0 14px; border: 1.5px solid #CBD5E1; border-radius: 12px; background: #F8FAFC; font-size: 15px; font-weight: 700; text-align: left; }
        .pairing-code { direction: ltr; font-size: 25px; font-weight: 900; letter-spacing: 4px; color: #973c00; background: #FFF7ED; border: 1.5px solid #FED7AA; padding: 12px 16px; border-radius: 14px; margin-top: 12px; display: inline-block; }
        .result-box { margin-top: 12px; padding: 12px 14px; border-radius: 12px; font-size: 13.5px; font-weight: 700; }
        .result-ok { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
        .result-err { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
        .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 12px; }
        @media (max-width: 520px) { .metrics-grid { grid-template-columns: 1fr; } }
        .metric-item { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 14px; text-align: right; }
        .metric-k { font-size: 12px; color: #64748B; font-weight: 700; margin-bottom: 4px; }
        .metric-v { font-size: 15px; color: #0F172A; font-weight: 800; }
    </style>
</head>
<body>
<div class="container">
    <div class="topbar">
        <div>
            <h1 class="topbar-title">بوابة إدارة سيرفر المنشية</h1>
            <div class="topbar-sub">إدارة الواتساب، فحص الأرقام، ومراقبة الخدمات</div>
        </div>
        <div class="topbar-actions">
            <button type="button" class="btn-soft" onclick="loadState(true)">تحديث الحالة الآن</button>
            <form method="POST" action="/admin/logout" style="margin:0;">
                <button type="submit" class="btn-logout">تسجيل الخروج</button>
            </form>
        </div>
    </div>

    <div class="status-grid">
        <button type="button" id="card-st-wa" class="status-btn active" onclick="openPage('wa')">
            <span class="status-label">حالة الواتساب</span>
            <span class="status-val" id="st-wa-val"><span class="dot warn"></span>جاري الفحص...</span>
        </button>
        <button type="button" id="card-st-api" class="status-btn" onclick="openPage('system')">
            <span class="status-label">بوابة التطبيق API</span>
            <span class="status-val" id="st-api-val"><span class="dot warn"></span>جاري الفحص...</span>
        </button>
        <button type="button" id="card-st-tools" class="status-btn" onclick="openPage('tools')">
            <span class="status-label">جاهزية النظام والتشغيل</span>
            <span class="status-val" id="st-sys-val"><span class="dot ok"></span>جاهز للفحص والاختبار</span>
        </button>
    </div>

    <div class="nav-tabs">
        <button type="button" id="tab-wa" class="nav-tab active" onclick="openPage('wa')">الربط وحالة الواتساب</button>
        <button type="button" id="tab-tools" class="nav-tab" onclick="openPage('tools')">فحص الأرقام واختبار OTP</button>
        <button type="button" id="tab-system" class="nav-tab" onclick="openPage('system')">حالة السيرفر والخدمات</button>
    </div>

    <div id="page-wa" class="page active">
        <div class="card">
            <div id="wa-status-area">جاري تحميل حالة الواتساب...</div>
            <div class="quick-actions">
                <button type="button" class="btn-outline" onclick="loadState(true)">تحديث</button>
                <button type="button" class="btn-outline" onclick="reconnectSocket()">إعادة اتصال سريع</button>
                <button type="button" class="btn-danger-soft" onclick="resetSession()">تغيير الرقم / جلسة جديدة</button>
            </div>
        </div>

        <div id="pairing-card" class="card">
            <div class="mode-switch">
                <button type="button" id="mode-qr-btn" class="mode-btn active" onclick="switchPairMode('qr')">المسح بالباركود (QR)</button>
                <button type="button" id="mode-phone-btn" class="mode-btn" onclick="switchPairMode('phone')">الربط برقم الهاتف</button>
            </div>

            <div id="pair-mode-qr">
                <div id="qr-container"></div>
            </div>

            <div id="pair-mode-phone" style="display:none; text-align:right;">
                <div class="section-title">الربط برقم الهاتف (بديل الباركود)</div>
                <p class="hint">اختر كود الدولة ثم أكمل رقم الواتساب واضغط إصدار كود الربط.</p>
                <div class="preset-row">
                    <button type="button" class="preset-chip" onclick="presetPhone('pair-phone','20')">مصر +20</button>
                    <button type="button" class="preset-chip" onclick="presetPhone('pair-phone','966')">السعودية +966</button>
                    <button type="button" class="preset-chip" onclick="presetPhone('pair-phone','971')">الإمارات +971</button>
                    <button type="button" class="preset-chip" onclick="presetPhone('pair-phone','965')">الكويت +965</button>
                </div>
                <div class="pair-row">
                    <input id="pair-phone" type="tel" placeholder="201012345678" />
                    <button type="button" class="btn-primary" onclick="requestPairCode()">إصدار الكود</button>
                </div>
                <div id="pair-result" style="text-align:center;"></div>
            </div>
        </div>
    </div>

    <div id="page-tools" class="page">
        <div class="card card-left">
            <div class="section-title">بث وإرسال إشعار فوري للمواطنين</div>
            <p class="hint">يرسل إشعاراً عاماً واحداً لجميع المواطنين عبر التطبيق وخدمة Firebase FCM مع ظهور القسم داخل الإشعار.</p>
            <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:10px;">
                <select id="notif-section" style="height:46px; padding:0 12px; border:1.5px solid #CBD5E1; border-radius:12px; background:#F8FAFC; font-size:14px; font-weight:700; color:#0F172A;">
                    <option value="news|قسم الأخبار">قسم الأخبار</option>
                    <option value="reports|قسم البلاغات">قسم البلاغات</option>
                    <option value="craftsmen|قسم الصنايعية">قسم الصنايعية</option>
                    <option value="services|قسم الخدمات">قسم الخدمات</option>
                </select>
                <input id="notif-title" type="text" placeholder="عنوان الإشعار..." style="height:46px; padding:0 14px; border:1.5px solid #CBD5E1; border-radius:12px; background:#F8FAFC; font-size:14px; font-weight:700;" />
                <input id="notif-body" type="text" placeholder="نص الإشعار المختصر..." style="height:46px; padding:0 14px; border:1.5px solid #CBD5E1; border-radius:12px; background:#F8FAFC; font-size:14px;" />
            </div>
            <div class="quick-actions" style="justify-content:flex-start;">
                <button type="button" class="btn-primary" onclick="sendAdminNotification(false)">إرسال الإشعار</button>
                <button type="button" class="btn-outline" onclick="sendAdminNotification(true)">إرسال إشعار تجريبي سريع</button>
            </div>
            <div id="notif-send-result"></div>
        </div>

        <div class="card card-left">
            <div class="section-title">فحص وجود الرقم على واتساب</div>
            <p class="hint">يتحقق مباشرة عبر خوادم واتساب قبل إرسال أي رسالة لحماية الرقم من الحظر.</p>
            <div class="preset-row">
                <button type="button" class="preset-chip" onclick="presetPhone('check-phone','20')">مصر +20</button>
                <button type="button" class="preset-chip" onclick="presetPhone('check-phone','966')">السعودية +966</button>
                <button type="button" class="preset-chip" onclick="presetPhone('check-phone','971')">الإمارات +971</button>
            </div>
            <div class="pair-row">
                <input id="check-phone" type="tel" placeholder="201012345678" />
                <button type="button" class="btn-primary" onclick="checkNumber()">فحص الرقم</button>
            </div>
            <div id="check-result"></div>
        </div>

        <div class="card card-left">
            <div class="section-title">إرسال رسالة تحقق تجريبية (OTP)</div>
            <p class="hint">يرسل رمز تحقق تجريبي مكوناً من 4 أرقام فقط إذا كان الرقم مسجلاً فعلياً على واتساب.</p>
            <div class="pair-row">
                <input id="test-phone" type="tel" placeholder="201012345678" />
                <button type="button" class="btn-primary" onclick="sendTestOtp()">إرسال اختبار</button>
            </div>
            <div id="test-result"></div>
        </div>
    </div>

    <div id="page-system" class="page">
        <div class="card card-left">
            <div class="section-title">مراقبة حالة السيرفر والخدمات</div>
            <p class="hint">قراءات فورية لحالة خدمة الواتساب وبوابة الـ API وأداء النظام.</p>
            <div class="metrics-grid" id="metrics-grid"></div>
            <div class="quick-actions" style="justify-content:flex-start; margin-top:16px;">
                <button type="button" class="btn-primary" onclick="loadState(true)">تحديث القراءات</button>
                <button type="button" class="btn-outline" onclick="reconnectSocket()">إعادة اتصال الواتساب</button>
                <button type="button" class="btn-outline" onclick="openPage('tools')">فحص رقم الآن</button>
            </div>
        </div>
    </div>
</div>

<script>
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function fmtUptime(sec) {
        var s = Number(sec || 0);
        var h = Math.floor(s / 3600);
        var m = Math.floor((s % 3600) / 60);
        var r = s % 60;
        if (h > 0) return h + ' ساعة و ' + m + ' دقيقة';
        if (m > 0) return m + ' دقيقة و ' + r + ' ثانية';
        return r + ' ثانية';
    }

    function openPage(name) {
        ['wa', 'tools', 'system'].forEach(function(k) {
            document.getElementById('page-' + k).classList.toggle('active', k === name);
            document.getElementById('tab-' + k).classList.toggle('active', k === name);
        });
        document.getElementById('card-st-wa').classList.toggle('active', name === 'wa');
        document.getElementById('card-st-tools').classList.toggle('active', name === 'tools');
        document.getElementById('card-st-api').classList.toggle('active', name === 'system');
    }

    function switchPairMode(mode) {
        document.getElementById('pair-mode-qr').style.display = mode === 'qr' ? 'block' : 'none';
        document.getElementById('pair-mode-phone').style.display = mode === 'phone' ? 'block' : 'none';
        document.getElementById('mode-qr-btn').classList.toggle('active', mode === 'qr');
        document.getElementById('mode-phone-btn').classList.toggle('active', mode === 'phone');
    }

    function presetPhone(inputId, prefix) {
        var el = document.getElementById(inputId);
        el.value = prefix;
        el.focus();
    }

    var lastPairCode = '';

    function copyPairCode() {
        if (lastPairCode && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(lastPairCode);
        }
    }

    async function loadState() {
        try {
            var res = await fetch('/admin/state');
            if (res.status === 401) { location.reload(); return; }
            var s = await res.json();

            var stWa = document.getElementById('st-wa-val');
            if (s.connected) {
                stWa.innerHTML = '<span class="dot ok"></span>متصل (+' + esc(s.phone || '') + ')';
            } else if (s.qrCodeDataUrl) {
                stWa.innerHTML = '<span class="dot warn"></span>بانتظار مسح QR';
            } else {
                stWa.innerHTML = '<span class="dot err"></span>' + esc(s.status || 'غير متصل');
            }

            var stApi = document.getElementById('st-api-val');
            stApi.innerHTML = s.apiGatewayOnline
                ? '<span class="dot ok"></span>متصلة وتعمل بنجاح'
                : '<span class="dot err"></span>غير مستجيبة';

            var stSys = document.getElementById('st-sys-val');
            stSys.innerHTML = '<span class="dot ok"></span>التشغيل: ' + esc(fmtUptime(s.uptimeSec));

            var area = document.getElementById('wa-status-area');
            var qrContainer = document.getElementById('qr-container');
            var pairingCard = document.getElementById('pairing-card');

            if (s.connected) {
                area.innerHTML =
                    '<div class="badge ok">متصل بالواتساب بنجاح</div><br/>' +
                    '<div class="phone-box">+' + esc(s.phone || '') + '</div>' +
                    '<p class="hint">السيرفر جاهز الآن لاستقبال طلبات التحقق وإرسال الرسائل بعد فحص الرقم.</p>';
                pairingCard.style.display = 'none';
            } else {
                pairingCard.style.display = 'block';
                if (s.qrCodeDataUrl) {
                    area.innerHTML = '<div class="badge warn">الواتساب غير مرتبط - اختر طريقة الربط بالأسفل</div>';
                    qrContainer.innerHTML =
                        '<p class="hint">افتح واتساب &larr; الأجهزة المرتبطة &larr; ربط جهاز ثم امسح الكود:</p>' +
                        '<div class="qr-wrap"><img src="' + esc(s.qrCodeDataUrl) + '" alt="QR" /></div>';
                } else {
                    area.innerHTML =
                        '<div class="badge warn">جاري تهيئة الاتصال (' + esc(s.status || '...') + ')</div>' +
                        (s.lastDisconnectReason ? '<p class="hint" style="direction:ltr;">' + esc(s.lastDisconnectReason) + '</p>' : '');
                    qrContainer.innerHTML = '<p class="hint">جاري توليد رمز QR أو يمكنك التبديل إلى الربط برقم الهاتف.</p>';
                }
            }

            if (s.pairingCode && !document.getElementById('pair-result').innerHTML) {
                document.getElementById('pair-result').innerHTML =
                    '<div class="pairing-code">' + esc(s.pairingCode) + '</div>';
            }

            document.getElementById('metrics-grid').innerHTML =
                '<div class="metric-item"><div class="metric-k">حالة خدمة الواتساب (3005)</div><div class="metric-v">' + esc(s.status) + '</div></div>' +
                '<div class="metric-item"><div class="metric-k">حالة بوابة التطبيق (8080)</div><div class="metric-v">' + (s.apiGatewayOnline ? 'تعمل بنجاح (Online)' : 'متوقفة') + '</div></div>' +
                '<div class="metric-item"><div class="metric-k">مدة التشغيل المتواصل</div><div class="metric-v">' + esc(fmtUptime(s.uptimeSec)) + '</div></div>' +
                '<div class="metric-item"><div class="metric-k">استهلاك الذاكرة</div><div class="metric-v">' + esc(s.memoryMb) + ' MB</div></div>' +
                (s.lastDisconnectReason ? '<div class="metric-item" style="grid-column:1/-1;"><div class="metric-k">آخر سبب فصل</div><div class="metric-v" style="direction:ltr;text-align:left;">' + esc(s.lastDisconnectReason) + '</div></div>' : '');
        } catch (e) {}
    }

    async function requestPairCode() {
        var phone = document.getElementById('pair-phone').value.trim();
        var out = document.getElementById('pair-result');
        out.innerHTML = '<p class="hint">جاري إصدار كود الربط...</p>';
        var res = await fetch('/admin/pair', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone })
        });
        var data = await res.json();
        if (data.success && data.pairingCode) {
            lastPairCode = data.pairingCode;
            out.innerHTML =
                '<div class="pairing-code">' + esc(data.pairingCode) + '</div><br/>' +
                '<button type="button" class="btn-outline" style="margin-top:8px;" onclick="copyPairCode()">نسخ الكود</button>' +
                '<p class="hint" style="margin-top:8px;">أدخل هذا الكود في واتساب &larr; الأجهزة المرتبطة &larr; الربط برقم الهاتف</p>';
        } else {
            out.innerHTML = '<div class="result-box result-err">' + esc(data.error || 'تعذر إصدار الكود') + '</div>';
        }
    }

    async function reconnectSocket() {
        await fetch('/admin/reconnect', { method: 'POST' });
        setTimeout(loadState, 1500);
    }

    async function resetSession() {
        if (!confirm('هل تريد مسح الجلسة الحالية والبدء بباركود أو رقم جديد؟')) return;
        await fetch('/admin/reset', { method: 'POST' });
        document.getElementById('pair-result').innerHTML = '';
        setTimeout(loadState, 1500);
    }

    async function checkNumber() {
        var phone = document.getElementById('check-phone').value.trim();
        var out = document.getElementById('check-result');
        out.innerHTML = '<p class="hint">جاري فحص الرقم...</p>';
        var res = await fetch('/admin/check-number', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone })
        });
        var data = await res.json();
        if (data.success && data.exists) {
            out.innerHTML = '<div class="result-box result-ok">الرقم مسجل على واتساب وجاهز للاستلام (' + esc(data.jid) + ')</div>';
        } else {
            out.innerHTML = '<div class="result-box result-err">' + esc(data.error || 'الرقم غير مسجل على واتساب') + '</div>';
        }
    }

    async function sendTestOtp() {
        var phone = document.getElementById('test-phone').value.trim();
        var out = document.getElementById('test-result');
        out.innerHTML = '<p class="hint">جاري التحقق من الرقم ثم الإرسال...</p>';
        var res = await fetch('/admin/test-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone })
        });
        var data = await res.json();
        if (data.success) {
            out.innerHTML = '<div class="result-box result-ok">تم إرسال كود الاختبار (' + esc(data.code) + ') بنجاح إلى ' + esc(data.jid) + '</div>';
        } else {
            out.innerHTML = '<div class="result-box result-err">' + esc(data.error || 'تعذر الإرسال') + '</div>';
        }
    }

    async function sendAdminNotification(isQuickTest) {
        var sel = document.getElementById('notif-section').value.split('|');
        var section = sel[0] || 'news';
        var sectionAr = sel[1] || 'قسم الأخبار';
        var title = isQuickTest
            ? 'إشعار تجريبي: منظومة إشعارات المنشية تعمل بنجاح'
            : document.getElementById('notif-title').value.trim();
        var body = isQuickTest
            ? 'تم التحقق من الإرسال الفوري بنجاح عبر السيرفر وFirebase.'
            : document.getElementById('notif-body').value.trim();
        var out = document.getElementById('notif-send-result');

        if (!title || !body) {
            out.innerHTML = '<div class="result-box result-err">يرجى كتابة عنوان ونص الإشعار أو الضغط على إرسال إشعار تجريبي سريع.</div>';
            return;
        }
        out.innerHTML = '<p class="hint">جاري بث الإشعار...</p>';
        var res = await fetch('/admin/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ section: section, section_ar: sectionAr, title: title, body: body })
        });
        var data = await res.json();
        if (data.success) {
            out.innerHTML = '<div class="result-box result-ok">تم بث الإشعار بنجاح تحت (' + esc(sectionAr) + ') — سيصل الآن لجميع المواطنين.</div>';
            if (!isQuickTest) {
                document.getElementById('notif-title').value = '';
                document.getElementById('notif-body').value = '';
            }
        } else {
            out.innerHTML = '<div class="result-box result-err">' + esc(data.error || 'تعذر إرسال الإشعار') + '</div>';
        }
    }

    loadState();
    setInterval(loadState, 6000);
</script>
</body>
</html>`;
}

// البوابة الرئيسية المحمية بكلمة مرور على الرابط الجذري
app.get('/', (req, res) => {
    const token = getCookieToken(req);
    if (!token || !VALID_ADMIN_TOKENS.has(token)) {
        return res.status(200).send(renderLoginHtml('', connectionStatus === 'connected'));
    }
    res.status(200).send(renderDashboardHtml());
});

app.post('/admin/login', (req, res) => {
    const clientIp = req.headers['x-real-ip'] || req.ip || 'unknown';
    const rl = LOGIN_RATE_LIMITS.get(clientIp) || { count: 0, blockedUntil: 0 };
    const now = Date.now();
    const isConnected = connectionStatus === 'connected';

    if (now < rl.blockedUntil) {
        const rem = Math.ceil((rl.blockedUntil - now) / 1000);
        return res.status(429).send(renderLoginHtml(`تم إيقاف المحاولات مؤقتاً. يرجى الانتظار ${rem} ثانية.`, isConnected));
    }
    if (rl.blockedUntil > 0 && now >= rl.blockedUntil) {
        rl.count = 0;
        rl.blockedUntil = 0;
    }

    const password = String(req.body?.password || '');
    if (password !== WA_ADMIN_PASSWORD) {
        rl.count += 1;
        if (rl.count >= 3) {
            rl.blockedUntil = now + 300 * 1000;
            LOGIN_RATE_LIMITS.set(clientIp, rl);
            return res.status(429).send(renderLoginHtml('تم إدخال كلمة مرور خاطئة 3 مرات. تم الإيقاف لمدة 5 دقائق.', isConnected));
        }
        LOGIN_RATE_LIMITS.set(clientIp, rl);
        return res.status(401).send(renderLoginHtml('كلمة المرور غير صحيحة.', isConnected));
    }

    LOGIN_RATE_LIMITS.delete(clientIp);
    const token = crypto.randomBytes(32).toString('hex');
    VALID_ADMIN_TOKENS.add(token);
    res.setHeader('Set-Cookie', `wa_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`);
    res.redirect('/');
});

app.get('/admin/state', requireAdmin, async (req, res) => {
    const apiGatewayOnline = await checkApiGatewayHealth();
    res.json({
        status: connectionStatus,
        connected: connectionStatus === 'connected',
        phone: connectedPhone,
        qrCodeDataUrl,
        pairingCode: latestPairingCode,
        lastDisconnectReason,
        uptimeSec: Math.floor(process.uptime()),
        memoryMb: Math.round(process.memoryUsage().rss / 1048576),
        apiGatewayOnline
    });
});

app.post('/admin/pair', requireAdmin, async (req, res) => {
    try {
        if (connectionStatus === 'connected') {
            return res.status(400).json({ success: false, error: 'السيرفر متصل بالفعل. اضغط تغيير الرقم للربط برقم جديد.' });
        }
        const clean = normalizeWhatsAppDigits(req.body?.phone);
        if (!clean || clean.length < 10) {
            return res.status(400).json({ success: false, error: 'يرجى إدخال رقم هاتف صحيح مع كود الدولة.' });
        }
        if (!sock) {
            await connectToWhatsApp();
        }
        const pairingCode = await sock.requestPairingCode(clean);
        latestPairingCode = pairingCode;
        res.json({ success: true, pairingCode });
    } catch (err) {
        console.error('[WhatsApp:pair error]', err);
        res.status(500).json({ success: false, error: err?.message || 'تعذر إصدار كود الربط' });
    }
});

app.post('/admin/reconnect', requireAdmin, async (req, res) => {
    try {
        try { sock?.end(new Error('Admin reconnect')); } catch {}
        sock = null;
        connectionStatus = 'reconnecting';
        setTimeout(connectToWhatsApp, 800);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/admin/reset', requireAdmin, async (req, res) => {
    try {
        try { sock?.end(new Error('Admin reset')); } catch {}
        sock = null;
        qrCodeDataUrl = null;
        latestPairingCode = null;
        connectedPhone = null;
        connectionStatus = 'resetting';
        clearAuthSessionFiles();
        setTimeout(connectToWhatsApp, 1000);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/admin/check-number', requireAdmin, async (req, res) => {
    try {
        const result = await resolveWhatsAppUser(req.body?.phone);
        if (!result.ok) {
            return res.status(result.status).json(result.body);
        }
        res.json({ success: true, exists: true, jid: result.targetJid });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/admin/test-otp', requireAdmin, async (req, res) => {
    try {
        const result = await resolveWhatsAppUser(req.body?.phone);
        if (!result.ok) {
            return res.status(result.status).json(result.body);
        }
        const testCode = String(crypto.randomInt(1000, 10000));
        const sent = await sendAntiBanOtpToJid(result.targetJid, testCode);
        console.log(`[WhatsApp:admin-test] Sent test code ${testCode} to ${result.clean}`);
        res.json({ success: true, code: testCode, jid: result.targetJid, messageId: sent.key.id });
    } catch (err) {
        console.error('[WhatsApp:test-otp error]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/admin/send-notification', requireAdmin, (req, res) => {
    try {
        const payload = JSON.stringify({
            section: String(req.body?.section || 'news').trim(),
            section_ar: String(req.body?.section_ar || 'قسم الأخبار').trim(),
            title: String(req.body?.title || '').trim(),
            body: String(req.body?.body || '').trim(),
            target_id: String(req.body?.target_id || '').trim()
        });
        const gwReq = http.request(
            {
                hostname: '127.0.0.1',
                port: 8080,
                path: '/api/v1/notifications/create',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Content-Length': Buffer.byteLength(payload)
                }
            },
            (gwRes) => {
                let raw = '';
                gwRes.on('data', (chunk) => { raw += chunk; });
                gwRes.on('end', () => {
                    try {
                        res.status(gwRes.statusCode || 200).json(JSON.parse(raw));
                    } catch {
                        res.status(gwRes.statusCode || 500).json({ success: false, error: raw });
                    }
                });
            }
        );
        gwReq.setTimeout(5000, () => {
            gwReq.destroy();
            res.status(504).json({ success: false, error: 'انتهت مهلة الاتصال ببوابة الإشعارات' });
        });
        gwReq.on('error', (err) => {
            res.status(502).json({ success: false, error: err.message });
        });
        gwReq.write(payload);
        gwReq.end();
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/admin/logout', requireAdmin, (req, res) => {
    VALID_ADMIN_TOKENS.delete(req.adminToken);
    res.setHeader('Set-Cookie', 'wa_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
    res.redirect('/');
});

// فحص حالة الاتصال الداخلي فقط
app.get('/status', (req, res) => {
    res.json({
        status: connectionStatus,
        connected: connectionStatus === 'connected',
        phone: connectedPhone,
        lastDisconnectReason
    });
});

// إرسال كود التحقق للخدمة الداخلية مع الفحص المسبق onWhatsApp ومحاكاة الكتابة البشرية
app.post('/send-otp', async (req, res) => {
    try {
        const { phone, code } = req.body;
        if (!phone || !code) {
            return res.status(400).json({ success: false, error: 'رقم الهاتف وكود التحقق مطلوبان' });
        }

        const result = await resolveWhatsAppUser(phone);
        if (!result.ok) {
            if (result.body?.not_on_whatsapp) {
                console.log(`[WhatsApp:send-otp] Number ${result.clean} is NOT registered on WhatsApp. Skipping send.`);
            }
            return res.status(result.status).json(result.body);
        }

        // إرجاع رد فوري للمستخدم دون أي تأخير حتى تنتقل الشاشة لصفحة الكود بأجزاء من الثانية
        res.json({ success: true, jid: result.targetJid });

        // إرسال الكود في الخلفية بشكل غير متزامن مع محاكاة الكتابة البشرية لمنع الحظر
        setImmediate(async () => {
            try {
                const sent = await sendAntiBanOtpToJid(result.targetJid, code);
                console.log(`[WhatsApp:send-otp] Sent unique code ${code} to ${result.clean} (msgId: ${sent?.key?.id})`);
            } catch (err) {
                console.error(`[WhatsApp:send-otp] Async send failed for ${result.clean}:`, err?.message || err);
            }
        });
    } catch (err) {
        console.error('[WhatsApp:send-otp error]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = 3005;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`WhatsApp Service listening on port ${PORT}`);
    connectToWhatsApp();
});
