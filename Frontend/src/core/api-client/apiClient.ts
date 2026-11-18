import { API_BASE_URL } from '../config/api.config';
import {
  getOfflineData,
  persistOfflineData,
  OFFLINE_SEED_SERVICES,
} from '../offline/offlineStorage';

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
  isOffline?: boolean;
}

interface LocalCacheEntry<T> {
  etag: string;
  data: T;
  lastCheckedAt: number;
}

// كاش محلي على الهاتف يحفظ آخر نسخة (ETag) والبيانات لكل مسار لمنع إعادة تحميل نفس الخبر لمليون مستخدم
const localETagStore = new Map<string, LocalCacheEntry<unknown>>();

// فترة التهدئة الافتراضية لمنع إرسال أي ريكويست أثناء التنقل بين الصفحات (5 دقائق كاملة)
const DEFAULT_REFRESH_COOLDOWN_MS = 300_000;

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
  let cached = localETagStore.get(cacheKey) as LocalCacheEntry<T> | undefined;

  // إذا لم تكن البيانات موجودة بالذاكرة العشوائية (مثلاً عند تشغيل التطبيق دون نت)، نسترجعها فوراً من القرص الدائم
  if (!cached) {
    try {
      const diskEntry = await getOfflineData<T>(cacheKey);
      if (diskEntry && diskEntry.data) {
        cached = {
          etag: diskEntry.etag || '',
          data: diskEntry.data,
          lastCheckedAt: diskEntry.cachedAt,
        };
        localETagStore.set(cacheKey, cached);
      }
    } catch {
      // ignore
    }
  }

  const now = Date.now();
  const cooldown = options?.cooldownMs ?? DEFAULT_REFRESH_COOLDOWN_MS;

  // 1. نظام Zero-Waste: إذا كانت البيانات موجودة في ذاكرة الهاتف ولم يقم المستخدم بالسحب اليدوي للتحديث (أو لم تنتهِ فترة الـ 5 دقائق)
  // يتم إرجاع البيانات فوراً من ذاكرة الهاتف مع إرسال 0 ريكويست للسيرفر نهائياً
  if (!options?.isManualRefresh && cached && (now - cached.lastCheckedAt < cooldown || !options?.cooldownMs)) {
    return {
      ok: true,
      module: moduleName,
      data: cached.data,
      error: null,
      fromCache: true,
      etag: cached.etag,
      isOffline: false,
    };
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  // 2. إرسال بصمة النسخة (If-None-Match) للسيرفر للتحقق مما إذا كان هناك محتوى جديد
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
        isOffline: false,
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

    const entry: LocalCacheEntry<T> = {
      etag: newETag,
      data: json.data as T,
      lastCheckedAt: now,
    };
    localETagStore.set(cacheKey, entry);

    // حفظ فوري في التخزين الدائم للقرص (الأوفلاين)
    persistOfflineData(cacheKey, json.data, newETag).catch(() => {});

    return {
      ok: true,
      module: moduleName,
      data: json.data as T,
      error: null,
      fromCache: false,
      etag: newETag,
      isOffline: false,
    };
  } catch {
    // وضع العمل دون إنترنت (Offline Mode):
    // في حال عدم توفر اتصال بالإنترنت أو عدم استجابة السيرفر، نعيد المحتوى المحفوظ على قرص الهاتف فوراً
    if (cached) {
      return {
        ok: true,
        module: moduleName,
        data: cached.data,
        error: null,
        fromCache: true,
        etag: cached.etag,
        isOffline: true,
      };
    }

    // فحص إضافي أخير في القرص الدائم
    try {
      const diskEntry = await getOfflineData<T>(cacheKey);
      if (diskEntry && diskEntry.data) {
        return {
          ok: true,
          module: moduleName,
          data: diskEntry.data,
          error: null,
          fromCache: true,
          etag: diskEntry.etag,
          isOffline: true,
        };
      }
    } catch {
      // ignore
    }

    // إذا كان قسم الخدمات بالذات، نعيد البيانات المدمجة الموثقة حتى لو فُتح التطبيق لأول مرة دون نت
    if (endpoint.includes('/services') && (OFFLINE_SEED_SERVICES as unknown as T)) {
      return {
        ok: true,
        module: moduleName,
        data: OFFLINE_SEED_SERVICES as unknown as T,
        error: null,
        fromCache: true,
        etag: '"seed-v1"',
        isOffline: true,
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
