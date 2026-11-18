/**
 * أدوات تحويل ومعالجة روابط جوجل درايف (Google Drive)
 * لتحميل وتشغيل الصور والفيديوهات مباشرة من سحابة درايف بدون استهلاك مساحة أو باندويث السيرفر.
 */

export function extractGoogleDriveFileId(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // فحص روابط مشاركة درايف بمختلف الصيغ
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
  return url.includes('drive.google.com') || url.includes('docs.google.com');
}

/**
 * تحويل رابط درايف للصور إلى رابط CDN مباشر عالي السرعة (Google Edge Cache)
 * لا يحتاج تحميل على السيرفر ويدعم الكاش والـ WebP تلقائياً
 */
export function getDirectImageUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return '';
  const fileId = extractGoogleDriveFileId(rawUrl);
  if (fileId) {
    // رابط Google User Content المباشر والسريع للصور بدقة مناسبة للهواتف
    return `https://lh3.googleusercontent.com/d/${fileId}=w1200`;
  }
  return rawUrl;
}

/**
 * تحويل رابط درايف للفيديوهات إلى رابط بث مباشر (Direct Stream)
 * يعمل مع مشغلات الفيديو دون الحاجة لحفظ المقطع على خادم التطبيق
 */
export function getDirectVideoUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return '';
  const fileId = extractGoogleDriveFileId(rawUrl);
  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  return rawUrl;
}
