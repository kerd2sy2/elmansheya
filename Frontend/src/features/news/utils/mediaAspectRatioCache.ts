import { Image as RNImage } from 'react-native';
import { getDirectImageUrl, getGoogleDriveThumbnailUrl } from '@/core/utils/googleDrive';
import { getSecureItem, setSecureItem } from '@/core/auth-storage/sessionStorage';
import { NewsCardItem } from '../types/news.types';

const STORAGE_KEY = 'news_media_aspect_ratio_cache_v1';

// كاش فوري في الذاكرة لتخزين نسب الأبعاد الدقيقة لكل فيديو وصورة
export const mediaAspectRatioCache = new Map<string, number>();

let isCacheRestored = false;
let pendingSaveTimeout: any = null;

// استرجاع الكاش الدائم من قرص الهاتف فور بدء التشغيل
export async function initMediaAspectRatioCache(): Promise<void> {
  if (isCacheRestored) return;
  try {
    const saved = await getSecureItem<Record<string, number>>(STORAGE_KEY);
    if (saved && typeof saved === 'object') {
      Object.entries(saved).forEach(([k, v]) => {
        if (typeof v === 'number' && v > 0) {
          mediaAspectRatioCache.set(k, v);
        }
      });
    }
    isCacheRestored = true;
  } catch {
    isCacheRestored = true;
  }
}

// حفظ الكاش على قرص الهاتف بشكل مجدول (Debounced) لتجنب كثرة الكتابة على القرص
function schedulePersistCache() {
  if (pendingSaveTimeout) clearTimeout(pendingSaveTimeout);
  pendingSaveTimeout = setTimeout(() => {
    try {
      const obj: Record<string, number> = {};
      mediaAspectRatioCache.forEach((v, k) => {
        obj[k] = v;
      });
      setSecureItem(STORAGE_KEY, obj).catch(() => {});
    } catch {}
  }, 1000);
}

export function getCachedAspectRatio(keys: (string | null | undefined)[]): number | null {
  for (const k of keys) {
    if (k && mediaAspectRatioCache.has(k)) {
      return mediaAspectRatioCache.get(k)!;
    }
  }
  return null;
}

export function setCachedAspectRatio(key: string, ratio: number) {
  if (!key || !ratio || ratio <= 0) return;
  const clamped = Math.max(0.68, Math.min(ratio, 2.2));
  mediaAspectRatioCache.set(key, clamped);
  schedulePersistCache();
}

/**
 * تسخين الكاش مسبقاً فور وصول قائمة الأخبار
 * يستخرج أبعاد صور المعاينة والفيديوهات في الخلفية (Background)
 * لضمان ظهور الكروت بالأبعاد الدقيقة للفيديو فوراً وبدون أي قفزة أو لاج
 */
export function warmMediaAspectRatioCache(items: NewsCardItem[]) {
  if (!Array.isArray(items)) return;

  // تهيئة الكاش من القرص أولاً إن لم يكن مهيئاً
  if (!isCacheRestored) {
    initMediaAspectRatioCache();
  }

  // ١. تسجيل العناصر التي تملك أبعاداً مسبقة (0ms وبدون أي استهلاك للشبكة)
  items.forEach((item) => {
    if (!item) return;
    if (item.aspect_ratio && item.aspect_ratio > 0) {
      const clamped = Math.max(0.68, Math.min(item.aspect_ratio, 2.2));
      mediaAspectRatioCache.set(item.id, clamped);
      if (item.video_stream_url) mediaAspectRatioCache.set(item.video_stream_url, clamped);
      if (item.cover_image_url) mediaAspectRatioCache.set(item.cover_image_url, clamped);
    }
  });

  // ٢. فحص أول 4 عناصر فقط في البداية مع تدرج زمني (Staggered) لمنع اختناق الشبكة أو تهنيج الشاشة
  const itemsToMeasure = items
    .filter((it) => {
      if (!it || it.aspect_ratio) return false;
      const url =
        getDirectImageUrl(it.cover_image_url) ||
        getGoogleDriveThumbnailUrl(it.video_stream_url);
      return url && !mediaAspectRatioCache.has(url) && !mediaAspectRatioCache.has(it.id);
    })
    .slice(0, 4);

  itemsToMeasure.forEach((item, index) => {
    const effectiveCoverUrl =
      getDirectImageUrl(item.cover_image_url) ||
      getGoogleDriveThumbnailUrl(item.video_stream_url);

    if (!effectiveCoverUrl) return;

    setTimeout(() => {
      RNImage.getSize(
        effectiveCoverUrl,
        (w, h) => {
          if (w > 0 && h > 0) {
            const ratio = w / h;
            const clamped = Math.max(0.68, Math.min(ratio, 2.2));
            mediaAspectRatioCache.set(item.id, clamped);
            mediaAspectRatioCache.set(effectiveCoverUrl, clamped);
            if (item.video_stream_url) {
              mediaAspectRatioCache.set(item.video_stream_url, clamped);
            }
            schedulePersistCache();
          }
        },
        () => {}
      );
    }, index * 80);
  });
}
