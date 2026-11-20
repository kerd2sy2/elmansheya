import { Platform } from 'react-native';
import { API_BASE_URL } from '@/core/config/api.config';

export type DriveSection =
  | 'news'
  | 'reports'
  | 'craftsmen'
  | 'services'
  | 'events'
  | 'humanitarian'
  | 'healthcare'
  | 'profile';

export interface UploadMediaOptions {
  uri: string;
  section: DriveSection;
  mediaType: 'image' | 'video';
  fileName?: string;
  base64?: string | null;
  token?: string | null;
}

/** Uploads an image or video directly to the Google Drive section folder without saving on server disk. */
export async function uploadMediaToDrive({
  uri,
  section,
  mediaType,
  fileName,
  base64,
  token,
}: UploadMediaOptions): Promise<string> {
  const defaultExt = mediaType === 'video' ? 'mp4' : 'jpg';
  const cleanName = fileName || `media_${Date.now()}.${defaultExt}`;
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  let res: Response;
  if (base64) {
    res = await fetch(`${API_BASE_URL}/storage/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        base64,
        filename: cleanName,
        section,
        media_type: mediaType,
      }),
    });
  } else {
    const formData = new FormData();
    const mimeType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';

    let appended = false;

    // في Expo SDK 52، يدعم fetch(uri).blob() تحويل مسار الملف المحلي إلى Blob متوافق مع FormDataPart
    try {
      const blobResp = await fetch(uri);
      if (blobResp && typeof (blobResp as any).blob === 'function') {
        const blob = await blobResp.blob();
        formData.append('file', blob, cleanName);
        appended = true;
      }
    } catch {
      appended = false;
    }

    // إذا لم ينجح الـ blob، نستخدم كائن الملف القياسي لـ React Native
    if (!appended) {
      try {
        formData.append('file', {
          uri,
          name: cleanName,
          type: mimeType,
        } as any);
      } catch (appendErr: any) {
        throw new Error(appendErr?.message || 'تعذر معالجة المرفق للرفع');
      }
    }

    formData.append('section', section);
    formData.append('media_type', mediaType);

    res = await fetch(
      `${API_BASE_URL}/storage/upload?section=${encodeURIComponent(section)}&media_type=${encodeURIComponent(mediaType)}`,
      {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      }
    );
  }

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success || !json?.data?.url) {
    throw new Error(json?.error?.message || 'تعذر رفع الملف إلى Google Drive');
  }
  return json.data.url as string;
}
