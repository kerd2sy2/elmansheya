export function getApiBaseUrl(): string {
  // الدومين السحابي الرسمي الحقيقي المحمي بـ Cloudflare SSL
  return 'https://elmansheya.kerd2sy.com/api/v1';
}

export const API_BASE_URL = getApiBaseUrl();
