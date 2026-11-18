import express from 'express';
import cors from 'cors';
import qrcode from 'qrcode';
import pino from 'pino';
import crypto from 'crypto';
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';

const app = express();
app.use(cors());
app.use(express.json());

let sock = null;
let qrCodeDataUrl = null;
let connectionStatus = 'initializing';
let connectedPhone = null;

async function connectToWhatsApp() {
    connectionStatus = 'connecting';
    const { state, saveCreds } = await useMultiFileAuthState('/root/whatsapp-service/auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        browser: ['Elmansheya Portal', 'Chrome', '124.0.0']
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
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('[WhatsApp] Connection closed. Reconnecting:', shouldReconnect);
            connectionStatus = 'disconnected';
            qrCodeDataUrl = null;
            connectedPhone = null;
            if (shouldReconnect) {
                setTimeout(connectToWhatsApp, 3000);
            }
        } else if (connection === 'open') {
            connectionStatus = 'connected';
            qrCodeDataUrl = null;
            connectedPhone = sock.user?.id ? sock.user.id.split(':')[0] : 'Connected';
            console.log('[WhatsApp] Connected successfully as:', connectedPhone);
        }
    });
}

// فحص حالة الاتصال
app.get('/status', (req, res) => {
    res.json({
        status: connectionStatus,
        connected: connectionStatus === 'connected',
        phone: connectedPhone
    });
});

/**
 * صياغة رسالة التحقق بتوقيت مصر مع هاش الأمان لمنع الحظر
 */
function buildAntiBanOtpMessage(code) {
    // كود مونو-سبيس عريض يسهل نسخه
    const formattedCode = "*`" + code + "`*";

    // توقيت جمهورية مصر العربية (Africa/Cairo)
    const now = new Date();
    const cairoTime = now.toLocaleTimeString('ar-EG-u-nu-latn', {
        timeZone: 'Africa/Cairo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    // بصمة هاش عشوائية فريدة لكل رسالة لمنع تطابق الرسائل وخوارزميات الحظر
    const hashId = crypto.randomBytes(2).toString('hex').toUpperCase();

    return `*تطبيق المنشية*\n` +
           `رمز التحقق: ${formattedCode}\n\n` +
           `تطبيق خدمي مجاني بالكامل لأهالي القرية لوجه الله وبدون أي منفعة للمطور.\n` +
           `#المنشية_خدمي_مجاني_${hashId} [توقيت مصر ${cairoTime}]`;
}

// إرسال كود التحقق مع محاكاة الكتابة البشرية (Typing Simulation)
app.post('/send-otp', async (req, res) => {
    try {
        if (!sock || connectionStatus !== 'connected') {
            return res.status(503).json({ success: false, error: 'سيرفر الواتساب غير متصل حالياً' });
        }

        const { phone, code } = req.body;
        if (!phone || !code) {
            return res.status(400).json({ success: false, error: 'رقم الهاتف وكود التحقق مطلوبان' });
        }

        let clean = phone.replace(/[^0-9]/g, '');
        if (clean.startsWith('01') && clean.length === 11) {
            clean = '2' + clean;
        } else if (clean.startsWith('05') && clean.length === 10) {
            clean = '966' + clean.substring(1);
        } else if (clean.startsWith('5') && clean.length === 9) {
            clean = '966' + clean;
        }

        const jid = `${clean}@s.whatsapp.net`;

        // ١. محاكاة وجود بشري يكتب (composing) لتضليل فلاتر الروبوتات في واتساب
        try {
            await sock.sendPresenceUpdate('composing', jid);
            const typingDelay = Math.floor(Math.random() * 800) + 1000; // 1.0 to 1.8 seconds
            await new Promise(r => setTimeout(r, typingDelay));
            await sock.sendPresenceUpdate('paused', jid);
        } catch (presErr) {
            // تجاهل خطأ التواجد إن حدث
        }

        // ٢. صياغة رسالة فريدة 100% مع كود سهل النسخ
        const msgText = buildAntiBanOtpMessage(code);

        // ٣. إرسال الرسالة
        const sent = await sock.sendMessage(jid, { text: msgText });
        console.log(`[WhatsApp:send-otp] Sent unique code ${code} to ${clean}`);
        res.json({ success: true, jid, messageId: sent.key.id });
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
