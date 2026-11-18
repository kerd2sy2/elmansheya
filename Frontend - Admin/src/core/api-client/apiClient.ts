import { API_BASE_URL } from '../config/api.config';

export interface ApiErrorInfo {
  code: string;
  message: string;
  module: string;
  isolated: boolean;
}

export interface ApiResult<T> {
  ok: boolean;
  module: string;
  data: T | null;
  error: ApiErrorInfo | null;
  fromCache: boolean;
  etag?: string;
}

interface LocalCacheEntry<T> {
  etag: string;
  data: T;
  lastCheckedAt: number;
}

// كاش محلي على الهاتف يحفظ آخر نسخة (ETag) لكل مسار لمنع إعادة تحميل نفس الخبر لمليون مستخدم
const localETagStore = new Map<string, LocalCacheEntry<unknown>>();

const DEFAULT_REFRESH_COOLDOWN_MS = 15_000; // 15 ثانية تهدئة بين عمليات السحب للتحديث المتتالية

export async function fetchModuleData<T>(
  moduleName: string,
  endpoint: string,
  options?: {
    isManualRefresh?: boolean;
    cooldownMs?: number;
    fallbackData?: T;
  }
): Promise<ApiResult<T>> {
  const cacheKey = `${moduleName}:${endpoint}`;
  const cached = localETagStore.get(cacheKey) as LocalCacheEntry<T> | undefined;
  const now = Date.now();
  const cooldown = options?.cooldownMs ?? DEFAULT_REFRESH_COOLDOWN_MS;

  // 1. تهدئة الـ Refresh (Cooldown): إذا سحب المستخدم للتحديث عدة مرات خلال 15 ثانية، نرد فوراً من الكاش المحلي دون إرسال طلب للسيرفر
  if (cached && now - cached.lastCheckedAt < cooldown) {
    return {
      ok: true,
      module: moduleName,
      data: cached.data,
      error: null,
      fromCache: true,
      etag: cached.etag,
    };
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  // 2. إرسال بصمة النسخة (If-None-Match) للسيرفر
  if (cached?.etag) {
    headers['If-None-Match'] = cached.etag;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    // 3. إذا لم ينشر المشرف أي خبر جديد (304 Not Modified - حجم الرد 0 بايت)
    if (res.status === 304 && cached) {
      cached.lastCheckedAt = now;
      return {
        ok: true,
        module: moduleName,
        data: cached.data,
        error: null,
        fromCache: true,
        etag: cached.etag,
      };
    }

    const json = await res.json();

    if (!res.ok || !json?.success) {
      return {
        ok: false,
        module: moduleName,
        data: cached?.data ?? options?.fallbackData ?? null,
        fromCache: Boolean(cached),
        error: {
          code: json?.error?.code ?? 'MODULE_ERROR',
          message:
            json?.error?.message ??
            `تعذر تحديث قسم (${moduleName}) حالياً، يرجى المحاولة لاحقاً.`,
          module: moduleName,
          isolated: true,
        },
      };
    }

    const newETag =
      res.headers.get('ETag') ?? (json.version ? `"${json.version}"` : '"v1"');

    localETagStore.set(cacheKey, {
      etag: newETag,
      data: json.data as T,
      lastCheckedAt: now,
    });

    return {
      ok: true,
      module: moduleName,
      data: json.data as T,
      error: null,
      fromCache: false,
      etag: newETag,
    };
  } catch {
    // في حال عدم تشغيل السيرفر المحلي أو انقطاع الشبكة، نرجع الكاش المحلي أو البيانات الاحتياطية دون إسقاط التطبيق
    if (cached) {
      return {
        ok: true,
        module: moduleName,
        data: cached.data,
        error: null,
        fromCache: true,
        etag: cached.etag,
      };
    }

    if (options?.fallbackData !== undefined) {
      localETagStore.set(cacheKey, {
        etag: '"offline-v1"',
        data: options.fallbackData,
        lastCheckedAt: now,
      });
      return {
        ok: true,
        module: moduleName,
        data: options.fallbackData,
        error: null,
        fromCache: true,
        etag: '"offline-v1"',
      };
    }

    return {
      ok: false,
      module: moduleName,
      data: null,
      fromCache: false,
      error: {
        code: 'NETWORK_ISOLATED_ERROR',
        message: 'تعذر الاتصال بالخادم لهذا القسم، يرجى التحقق من الاتصال وإعادة المحاولة.',
        module: moduleName,
        isolated: true,
      },
    };
  }
}
