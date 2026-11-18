import { API_BASE_URL } from '@/core/config/api.config';
import { getCompositeDeviceFingerprint } from '@/core/security/deviceFingerprint';
import {
  AuthSessionResponse,
  LoginPayload,
  RegisterPayload,
} from '../types/auth.types';

export async function checkDeviceBinding(
  fingerprint: string,
  phone?: string
): Promise<{ bound: boolean; phone?: string; full_name?: string }> {
  try {
    let url = `${API_BASE_URL}/auth/check-device?device_fingerprint=${encodeURIComponent(fingerprint)}`;
    if (phone) {
      url += `&phone=${encodeURIComponent(phone.trim())}`;
    }
    const res = await fetch(url);
    if (!res.ok) return { bound: false };
    const json = await res.json();
    if (json?.data?.bound) {
      return {
        bound: true,
        phone: json.data.phone || '',
        full_name: json.data.full_name || '',
      };
    }
  } catch {}
  return { bound: false };
}

export interface SimVerificationRequestResponse {
  ok: boolean;
  session_token?: string;
  gateway_phone?: string;
  sms_body?: string;
  error?: string;
}

export async function requestSimVerification(
  deviceFingerprint: string,
  simSlot: number = 1
): Promise<SimVerificationRequestResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/request-sim-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_fingerprint: deviceFingerprint,
        sim_slot: simSlot,
      }),
    });
    const json = await res.json();
    if (json?.success && json?.data) {
      return {
        ok: true,
        session_token: json.data.session_token,
        gateway_phone: json.data.gateway_phone,
        sms_body: json.data.sms_body,
      };
    }
    return { ok: false, error: json?.error || 'فشل بدء توثيق الشريحة.' };
  } catch (err: any) {
    return { ok: false, error: 'تعذر الاتصال بسيرفر التوثيق.' };
  }
}

export interface WhatsAppVerificationRequestResponse {
  ok: boolean;
  session_token?: string;
  whatsapp_url?: string;
  supervisor_phone?: string;
  activate_url?: string;
  error?: string;
}

export async function requestWhatsAppVerification(
  deviceFingerprint: string,
  simSlot: number = 1,
  phoneHint?: string
): Promise<WhatsAppVerificationRequestResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/request-whatsapp-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_fingerprint: deviceFingerprint,
        sim_slot: simSlot,
        phone: phoneHint,
      }),
    });
    const json = await res.json();
    if (json?.success && json?.data) {
      return {
        ok: true,
        session_token: json.data.session_token,
        whatsapp_url: json.data.whatsapp_url,
        supervisor_phone: json.data.supervisor_phone,
        activate_url: json.data.activate_url,
      };
    }
    return { ok: false, error: json?.error || 'فشل إنشاء رابط واتساب.' };
  } catch (err: any) {
    return { ok: false, error: 'تعذر الاتصال بسيرفر التوثيق.' };
  }
}

export async function checkSimVerificationStatus(
  sessionToken: string
): Promise<{ verified: boolean; phone?: string; bound?: boolean; full_name?: string }> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/auth/check-sim-verification?session_token=${encodeURIComponent(sessionToken)}`
    );
    const json = await res.json();
    if (json?.success && json?.data?.verified) {
      return {
        verified: true,
        phone: json.data.phone || '',
        bound: json.data.bound || false,
        full_name: json.data.full_name || '',
      };
    }
  } catch {}
  return { verified: false };
}

export async function simulateSimSmsReceived(
  sessionToken: string,
  senderPhone: string
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/simulate-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_token: sessionToken,
        sender_phone: senderPhone,
      }),
    });
    const json = await res.json();
    return !!json?.success;
  } catch {
    return false;
  }
}

export async function loginWithPhoneAndPassword(
  payload: LoginPayload
): Promise<{ ok: boolean; data?: AuthSessionResponse; error?: string }> {
  const cleanPhone = payload.phone.trim();
  if (!cleanPhone || !payload.password) {
    return { ok: false, error: 'يرجى إدخال رقم الهاتف وكلمة المرور.' };
  }

  try {
    const deviceFingerprint = await getCompositeDeviceFingerprint();
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: cleanPhone,
        password: payload.password,
        device_name: 'تطبيق المنشية',
        device_fingerprint: deviceFingerprint,
        enable_biometric: payload.enable_biometric,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json?.success) {
      return {
        ok: false,
        error: json?.error?.message ?? 'رقم الهاتف أو كلمة المرور غير صحيحة.',
      };
    }

    const apiUser = json.data.user;
    return {
      ok: true,
      data: {
        access_token: json.data.access_token,
        refresh_token: json.data.refresh_token,
        session_id: json.data.session_id,
        user: {
          ...apiUser,
          reports_count: 0,
          ratings_count: 0,
          registered_at_ar: new Date().toLocaleDateString('ar-EG'),
        },
      },
    };
  } catch {
    return {
      ok: false,
      error: 'تعذر الاتصال بخادم التطبيق. تأكد من تشغيل الخادم الخلفي.',
    };
  }
}

export async function registerCitizenAccount(
  payload: RegisterPayload
): Promise<{ ok: boolean; data?: AuthSessionResponse; error?: string; code?: string }> {
  const cleanPhone = payload.phone.trim();
  const cleanName = payload.full_name.trim();
  const cleanArea = payload.area.trim();

  if (!cleanName || !cleanPhone || !cleanArea || payload.password.length < 6) {
    return {
      ok: false,
      error:
        'يرجى إدخال الاسم الكامل ورقم الهاتف والمنطقة وكلمة مرور لا تقل عن ٦ أحرف.',
    };
  }

  try {
    const deviceFingerprint = await getCompositeDeviceFingerprint();
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: cleanName,
        phone: cleanPhone,
        email: (payload.email || '').trim(),
        password: payload.password,
        area: cleanArea,
        device_fingerprint: deviceFingerprint,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json?.success) {
      return {
        ok: false,
        code: json?.error?.code,
        error:
          json?.error?.message ?? 'تعذر إنشاء الحساب، ربما الرقم مسجل مسبقاً.',
      };
    }

    const apiUser = json.data.user;
    return {
      ok: true,
      data: {
        access_token: json.data.access_token,
        refresh_token: json.data.refresh_token,
        session_id: json.data.session_id,
        user: {
          ...apiUser,
          reports_count: 0,
          ratings_count: 0,
          registered_at_ar: new Date().toLocaleDateString('ar-EG'),
        },
      },
    };
  } catch {
    return {
      ok: false,
      error: 'تعذر الاتصال بخادم التطبيق. تأكد من تشغيل الخادم الخلفي.',
    };
  }
}

export async function changeUserPassword(
  phone: string,
  newPassword: string
): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: phone.trim(),
        new_password: newPassword,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json?.success) {
      return {
        ok: false,
        error: json?.error?.message ?? 'تعذر تغيير كلمة السر، يرجى المحاولة لاحقاً.',
      };
    }
    return { ok: true, message: json?.data?.message ?? 'تم تحديث كلمة السر بنجاح.' };
  } catch {
    return {
      ok: false,
      error: 'تعذر الاتصال بالخادم، يرجى التأكد من تشغيل الشبكة.',
    };
  }
}

export async function unlockBiometricSessionOnServer(
  phone: string,
  refreshToken: string
): Promise<{ ok: boolean; data?: AuthSessionResponse; error?: string }> {
  try {
    const deviceFingerprint = await getCompositeDeviceFingerprint();
    const res = await fetch(`${API_BASE_URL}/auth/biometric-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        refresh_token: refreshToken,
        device_fingerprint: deviceFingerprint,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json?.success) {
      return {
        ok: false,
        error:
          json?.error?.message ??
          'انتهت صلاحية جلسة البصمة، يرجى الدخول بكلمة المرور.',
      };
    }

    const apiUser = json.data.user;
    return {
      ok: true,
      data: {
        access_token: json.data.access_token,
        refresh_token: json.data.refresh_token,
        session_id: json.data.session_id,
        user: {
          ...apiUser,
          reports_count: 0,
          ratings_count: 0,
          registered_at_ar: new Date().toLocaleDateString('ar-EG'),
        },
      },
    };
  } catch {
    return {
      ok: false,
      error: 'تعذر الاتصال بالخادم للتحقق من جلسة البصمة.',
    };
  }
}

/**
 * إرسال كود التحقق السري (4 أرقام) مباشرة إلى واتساب المواطن من سيرفر التطبيق
 */
export async function sendWhatsAppOtp(
  phone: string,
  deviceFingerprint?: string
): Promise<{ ok: boolean; message?: string; error?: string; dev_code?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/send-whatsapp-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: phone.trim(),
        device_fingerprint: deviceFingerprint,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json?.success) {
      return {
        ok: false,
        error: json?.error || 'تعذر إرسال كود الواتساب، يرجى المحاولة بعد قليل.',
      };
    }
    return {
      ok: true,
      message: json?.message || 'تم إرسال كود التحقق بنجاح إلى واتساب.',
      dev_code: json?.dev_code,
    };
  } catch {
    return {
      ok: false,
      error: 'تعذر الاتصال بالخادم. يرجى التأكد من اتصال الإنترنت.',
    };
  }
}

/**
 * التحقق من كود الـ 4 أرقام المرسل للمواطن عبر واتساب
 */
export async function verifyWhatsAppOtp(
  phone: string,
  code: string,
  deviceFingerprint?: string
): Promise<{
  ok: boolean;
  is_registered?: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/verify-whatsapp-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: phone.trim(),
        code: code.trim(),
        device_fingerprint: deviceFingerprint,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json?.success) {
      return {
        ok: false,
        error: json?.error || 'كود التحقق غير صحيح أو انتهت صلاحيته.',
      };
    }
    return {
      ok: true,
      is_registered: json?.is_registered,
      data: json?.data,
    };
  } catch {
    return {
      ok: false,
      error: 'تعذر الاتصال بالخادم للتحقق من الكود.',
    };
  }
}

/**
 * إكمال تسجيل حساب مواطن جديد (الاسم بالكامل + تاريخ الميلاد) بعد توثيق الواتساب
 */
export async function completeWhatsAppRegistration(payload: {
  phone: string;
  full_name: string;
  birth_date: string;
  area?: string;
  device_fingerprint?: string;
}): Promise<{
  ok: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/complete-whatsapp-registration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json?.success) {
      return {
        ok: false,
        error: json?.error || 'تعذر إتمام التسجيل، يرجى مراجعة البيانات.',
      };
    }
    return {
      ok: true,
      data: json?.data,
    };
  } catch {
    return {
      ok: false,
      error: 'تعذر الاتصال بالخادم لإنشاء الحساب.',
    };
  }
}
