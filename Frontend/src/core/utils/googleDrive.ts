/**
 * أدوات تحويل ومعالجة روابط جوجل درايف (Google Drive)
 * لتحميل وتشغيل الصور والفيديوهات مباشرة من سحابة درايف بدون استهلاك مساحة أو باندويث السيرفر.
 */

export function extractGoogleDriveFileId(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // فحص روابط Google CDN وروابط مشاركة درايف بمختلف الصيغ
  const cdnMatch = trimmed.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (cdnMatch) return cdnMatch[1];

  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];

  const idQueryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idQueryMatch) return idQueryMatch[1];

  const shortMatch = trimmed.match(/drive\.google\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) return shortMatch[1];

  return null;
}

export function isGoogleDriveUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return (
    url.includes('drive.google.com') ||
    url.includes('docs.google.com') ||
    url.includes('googleusercontent.com/d/')
  );
}

function isLegacyOrStaleLocalUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  return trimmed.includes('/uploads/') || trimmed.startsWith('file:///data/user/');
}

/**
 * تحويل رابط درايف للصور إلى رابط CDN مباشر عالي السرعة (Google Edge Cache)
 * لا يحتاج تحميل على السيرفر ويدعم الكاش والـ WebP تلقائياً
 */
export function getDirectImageUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl || isLegacyOrStaleLocalUrl(rawUrl)) return '';
  const fileId = extractGoogleDriveFileId(rawUrl);
  if (fileId) {
    // رابط Google User Content المباشر والسريع للصور بدقة متوازنة تحافظ على جودة العرض وتمنع استنزاف ذاكرة الهاتف (OOM)
    return `https://lh3.googleusercontent.com/d/${fileId}=w720`;
  }
  return rawUrl;
}

/**
 * تحويل رابط درايف للفيديوهات إلى رابط البث المباشر (Direct Stream)
 * يعمل مباشرة مع المشغل الأصيل (expo-video / ExoPlayer) بدقة كاملة وبدون تحميل
 */
export function getDirectVideoUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl || isLegacyOrStaleLocalUrl(rawUrl)) return '';
  const fileId = extractGoogleDriveFileId(rawUrl);
  if (fileId) {
    return `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
  }
  return rawUrl;
}

/**
 * تحويل رابط درايف إلى رابط معاينة المشغل المدمج (Google Drive Preview Player)
 */
export function getGoogleDrivePreviewUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl || isLegacyOrStaleLocalUrl(rawUrl)) return '';
  const fileId = extractGoogleDriveFileId(rawUrl);
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return rawUrl;
}

/**
 * استخراج صورة المعاينة (Thumbnail) لفيديوهات وصور جوجل درايف تلقائياً بدقة عالية
 * تخدمها شبكة Google Edge CDN العالمية بسرعة فائقة وبدون أي استهلاك لموارد السيرفر
 */
export function getGoogleDriveThumbnailUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return '';
  const fileId = extractGoogleDriveFileId(rawUrl);
  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}=w600`;
  }
  return '';
}
