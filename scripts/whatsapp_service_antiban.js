import express from 'express';
import cors from 'cors';
import qrcode from 'qrcode';
import pino from 'pino';
import crypto from 'crypto';
import fs from 'fs';
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

function renderLoginHtml(errorMsg = '') {
    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>إدارة واتساب المنشية - تسجيل الدخول</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #FAF5EE; color: #0F172A; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; }
        .card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 22px; padding: 32px 24px; width: 100%; max-width: 400px; box-shadow: 0 10px 28px rgba(15, 23, 42, 0.07); text-align: center; }
        h1 { margin: 0 0 8px; font-size: 21px; color: #0F172A; }
        p { margin: 0 0 22px; color: #64748B; font-size: 13.5px; line-height: 1.6; }
        .err { background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; padding: 10px 12px; border-radius: 10px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
        input { width: 100%; box-sizing: border-box; height: 48px; padding: 0 14px; border: 1.5px solid #CBD5E1; border-radius: 12px; background: #F8FAFC; font-size: 15px; margin-bottom: 14px; outline: none; }
        input:focus { border-color: #973c00; background: #FFFFFF; }
        button { width: 100%; height: 48px; background: #973c00; color: #FFFFFF; border: none; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; }
        button:hover { background: #7c3200; }
    </style>
</head>
<body>
    <div class="card">
        <h1>بوابة إدارة واتساب المنشية</h1>
        <p>هذه اللوحة محمية بكلمة مرور للتحكم في ربط رقم الواتساب الخاص بالسيرفر.</p>
        ${errorMsg ? `<div class="err">${errorMsg}</div>` : ''}
        <form method="POST" action="/wa/login">
            <input type="password" name="password" placeholder="أدخل كلمة مرور الإدارة" required autofocus />
            <button type="submit">دخول</button>
        </form>
    </div>
</body>
</html>`;
}

function renderDashboardHtml() {
    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>لوحة ربط واتساب المنشية</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #FAF5EE; color: #0F172A; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; }
        .card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 24px; padding: 28px 24px; width: 100%; max-width: 460px; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08); text-align: center; }
        .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
        .title { font-size: 20px; font-weight: 800; margin: 0; color: #0F172A; }
        .logout-btn { background: #F1F5F9; color: #475569; border: 1px solid #E2E8F0; padding: 7px 14px; border-radius: 10px; font-size: 12.5px; font-weight: 700; cursor: pointer; }
        .badge { display: inline-block; padding: 6px 16px; border-radius: 999px; font-size: 13.5px; font-weight: 700; margin-bottom: 14px; }
        .badge.ok { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
        .badge.warn { background: #FFF7ED; color: #973c00; border: 1px solid #FED7AA; }
        .phone-box { direction: ltr; font-size: 18px; font-weight: 800; color: #0F172A; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px 18px; border-radius: 12px; display: inline-block; margin-bottom: 16px; }
        .qr-wrap { background: #FFFFFF; border: 1px solid #E2E8F0; padding: 14px; border-radius: 16px; display: inline-block; margin: 10px 0 14px; }
        .qr-wrap img { width: 230px; height: 230px; display: block; }
        .divider { height: 1px; background: #E2E8F0; margin: 20px 0; }
        .section-title { font-size: 15px; font-weight: 800; color: #334155; margin: 0 0 8px; }
        .hint { font-size: 12.5px; color: #64748B; margin: 0 0 12px; line-height: 1.6; }
        .pair-row { direction: ltr; display: flex; gap: 8px; margin-bottom: 10px; }
        .pair-row input { flex: 1; height: 46px; padding: 0 12px; border: 1.5px solid #CBD5E1; border-radius: 12px; background: #F8FAFC; font-size: 15px; font-weight: 700; text-align: left; }
        .btn-primary { height: 46px; padding: 0 18px; background: #973c00; color: #FFFFFF; border: none; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; }
        .btn-secondary { width: 100%; height: 44px; background: #FFF7ED; color: #973c00; border: 1px solid #FED7AA; border-radius: 12px; font-size: 13.5px; font-weight: 700; cursor: pointer; margin-top: 8px; }
        .pairing-code { direction: ltr; font-size: 26px; font-weight: 900; letter-spacing: 4px; color: #973c00; background: #FFF7ED; border: 1.5px solid #FED7AA; padding: 12px; border-radius: 14px; margin-top: 12px; }
        .msg-err { color: #DC2626; font-size: 13px; font-weight: 600; margin-top: 8px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="topbar">
            <h1 class="title">ربط واتساب السيرفر</h1>
            <form method="POST" action="/wa/logout" style="margin:0;">
                <button type="submit" class="logout-btn">تسجيل الخروج</button>
            </form>
        </div>

        <div id="status-area">جاري التحميل...</div>

        <div class="divider"></div>

        <div id="pairing-area">
            <div class="section-title">الربط عبر رقم الهاتف (بديل الباركود)</div>
            <p class="hint">أدخل رقم الواتساب بكود الدولة مثل 201550888841 لإصدار كود ربط مكون من 8 حروف وأرقام.</p>
            <div class="pair-row">
                <input id="pair-phone" type="tel" placeholder="201550888841" />
                <button class="btn-primary" onclick="requestPairCode()">إصدار كود الربط</button>
            </div>
            <div id="pair-result"></div>
        </div>

        <div class="divider"></div>
        <button class="btn-secondary" onclick="resetSession()">إعادة تهيئة الجلسة / تغيير الرقم</button>
    </div>

    <script>
        async function loadState() {
            try {
                const res = await fetch('/wa/state');
                if (res.status === 401) { location.reload(); return; }
                const s = await res.json();
                const area = document.getElementById('status-area');
                if (s.connected) {
                    area.innerHTML =
                        '<div class="badge ok">متصل بالواتساب بنجاح</div><br/>' +
                        '<div class="phone-box">+' + (s.phone || '') + '</div>' +
                        '<p class="hint">السيرفر جاهز الآن لإرسال رموز التحقق للمواطنين تلقائياً.</p>';
                } else if (s.qrCodeDataUrl) {
                    area.innerHTML =
                        '<div class="badge warn">امسح الباركود لربط الواتساب</div>' +
                        '<p class="hint">افتح واتساب &larr; الأجهزة المرتبطة &larr; ربط جهاز ثم امسح الكود:</p>' +
                        '<div class="qr-wrap"><img src="' + s.qrCodeDataUrl + '" alt="QR" /></div>';
                } else {
                    area.innerHTML =
                        '<div class="badge warn">جاري تهيئة الاتصال (' + (s.status || '...') + ')</div>' +
                        (s.lastDisconnectReason ? '<p class="hint" style="direction:ltr;">' + s.lastDisconnectReason + '</p>' : '');
                }
                if (s.pairingCode && !document.getElementById('pair-result').innerHTML) {
                    document.getElementById('pair-result').innerHTML = '<div class="pairing-code">' + s.pairingCode + '</div>';
                }
            } catch (e) {}
        }

        async function requestPairCode() {
            const phone = document.getElementById('pair-phone').value.trim();
            const out = document.getElementById('pair-result');
            out.innerHTML = '<p class="hint">جاري إصدار كود الربط...</p>';
            const res = await fetch('/wa/pair', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            });
            const data = await res.json();
            if (data.success && data.pairingCode) {
                out.innerHTML = '<div class="pairing-code">' + data.pairingCode + '</div><p class="hint">أدخل هذا الكود في واتساب &larr; الأجهزة المرتبطة &larr; الربط برقم الهاتف</p>';
            } else {
                out.innerHTML = '<div class="msg-err">' + (data.error || 'تعذر إصدار الكود') + '</div>';
            }
        }

        async function resetSession() {
            if (!confirm('هل تريد مسح الجلسة الحالية والبدء بباركود أو رقم جديد؟')) return;
            await fetch('/wa/reset', { method: 'POST' });
            document.getElementById('pair-result').innerHTML = '';
            setTimeout(loadState, 1500);
        }

        loadState();
        setInterval(loadState, 5000);
    </script>
</body>
</html>`;
}

// لوحة إدارة الواتساب المحمية بكلمة مرور
app.get('/wa', (req, res) => {
    const token = getCookieToken(req);
    if (!token || !VALID_ADMIN_TOKENS.has(token)) {
        return res.status(200).send(renderLoginHtml());
    }
    res.status(200).send(renderDashboardHtml());
});

app.post('/wa/login', (req, res) => {
    const clientIp = req.headers['x-real-ip'] || req.ip || 'unknown';
    const rl = LOGIN_RATE_LIMITS.get(clientIp) || { count: 0, blockedUntil: 0 };
    const now = Date.now();

    if (now < rl.blockedUntil) {
        const rem = Math.ceil((rl.blockedUntil - now) / 1000);
        return res.status(429).send(renderLoginHtml(`تم إيقاف المحاولات مؤقتاً. يرجى الانتظار ${rem} ثانية.`));
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
            return res.status(429).send(renderLoginHtml('تم إدخال كلمة مرور خاطئة 3 مرات. تم الإيقاف لمدة 5 دقائق.'));
        }
        LOGIN_RATE_LIMITS.set(clientIp, rl);
        return res.status(401).send(renderLoginHtml('كلمة المرور غير صحيحة.'));
    }

    LOGIN_RATE_LIMITS.delete(clientIp);
    const token = crypto.randomBytes(32).toString('hex');
    VALID_ADMIN_TOKENS.add(token);
    res.setHeader('Set-Cookie', `wa_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/wa; Max-Age=86400`);
    res.redirect('/wa');
});

app.get('/wa/state', requireAdmin, (req, res) => {
    res.json({
        status: connectionStatus,
        connected: connectionStatus === 'connected',
        phone: connectedPhone,
        qrCodeDataUrl,
        pairingCode: latestPairingCode,
        lastDisconnectReason
    });
});

app.post('/wa/pair', requireAdmin, async (req, res) => {
    try {
        if (connectionStatus === 'connected') {
            return res.status(400).json({ success: false, error: 'السيرفر متصل بالفعل. اضغط إعادة تهيئة الجلسة لتغيير الرقم.' });
        }
        const rawPhone = req.body?.phone;
        const clean = normalizeWhatsAppDigits(rawPhone);
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

app.post('/wa/reset', requireAdmin, async (req, res) => {
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

app.post('/wa/logout', requireAdmin, (req, res) => {
    VALID_ADMIN_TOKENS.delete(req.adminToken);
    res.setHeader('Set-Cookie', 'wa_token=; HttpOnly; Secure; SameSite=Lax; Path=/wa; Max-Age=0');
    res.redirect('/wa');
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

/**
 * صياغة رسالة رمز التحقق مع هاش فريد لمنع الحظر
 */
function buildAntiBanOtpMessage(code) {
    const formattedCode = "*`" + code + "`*";
    const hashId = `#${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    return `رمز التحقق الخاص بك هو ${formattedCode}\n` +
           `لا تشارك هذا الكود\n\n` +
           `التطبيق مجاني بالكامل نكتب هذا الهاش (${hashId})\n` +
           `كي لا يتم حظر الرقم`;
}

// إرسال كود التحقق مع الفحص المسبق onWhatsApp ومحاكاة الكتابة البشرية
app.post('/send-otp', async (req, res) => {
    try {
        if (!sock || connectionStatus !== 'connected') {
            return res.status(503).json({ success: false, error: 'سيرفر الواتساب غير متصل حالياً' });
        }

        const { phone, code } = req.body;
        if (!phone || !code) {
            return res.status(400).json({ success: false, error: 'رقم الهاتف وكود التحقق مطلوبان' });
        }

        const clean = normalizeWhatsAppDigits(phone);
        const jid = `${clean}@s.whatsapp.net`;

        // ٠. فحص مسبق عبر خوادم واتساب للتأكد أن الرقم مسجل فعلياً على واتساب لمنع حظر الحساب
        const checkResults = await sock.onWhatsApp(jid);
        const waUser = Array.isArray(checkResults) ? checkResults[0] : null;
        if (!waUser || !waUser.exists) {
            console.log(`[WhatsApp:send-otp] Number ${clean} is NOT registered on WhatsApp. Skipping send.`);
            return res.status(400).json({
                success: false,
                not_on_whatsapp: true,
                error: 'هذا الرقم غير مسجل على واتساب، يرجى التأكد من الرقم.'
            });
        }
        const targetJid = waUser.jid || jid;

        // ١. محاكاة وجود بشري يكتب (composing)
        try {
            await sock.sendPresenceUpdate('composing', targetJid);
            const typingDelay = Math.floor(Math.random() * 800) + 1000;
            await new Promise(r => setTimeout(r, typingDelay));
            await sock.sendPresenceUpdate('paused', targetJid);
        } catch (presErr) {
            // تجاهل خطأ التواجد إن حدث
        }

        // ٢. صياغة رسالة فريدة بتوقيت مصر والهاش
        const msgText = buildAntiBanOtpMessage(code);

        // ٣. إرسال الرسالة
        const sent = await sock.sendMessage(targetJid, { text: msgText });
        console.log(`[WhatsApp:send-otp] Sent unique code ${code} to ${clean}`);
        res.json({ success: true, jid: targetJid, messageId: sent.key.id });
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
