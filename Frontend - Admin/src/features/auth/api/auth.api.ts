import { API_BASE_URL } from '@/core/config/api.config';
import {
  AuthSessionResponse,
  LoginPayload,
  RegisterPayload,
} from '../types/auth.types';

export async function loginWithPhoneAndPassword(
  payload: LoginPayload
): Promise<{ ok: boolean; data?: AuthSessionResponse; error?: string }> {
  const cleanPhone = payload.phone.trim();
  if (!cleanPhone || !payload.password) {
    return { ok: false, error: 'يرجى إدخال رقم الهاتف وكلمة المرور.' };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: cleanPhone,
        password: payload.password,
        device_name: 'تطبيق المنشية',
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
): Promise<{ ok: boolean; data?: AuthSessionResponse; error?: string }> {
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
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: cleanName,
        phone: cleanPhone,
        password: payload.password,
        area: cleanArea,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json?.success) {
      return {
        ok: false,
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

export async function unlockBiometricSessionOnServer(
  phone: string,
  refreshToken: string
): Promise<{ ok: boolean; data?: AuthSessionResponse; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/biometric-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        refresh_token: refreshToken,
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
