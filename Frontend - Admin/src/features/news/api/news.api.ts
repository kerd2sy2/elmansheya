import { API_BASE_URL } from '@/core/config/api.config';
import { ApiResult, fetchModuleData } from '@/core/api-client/apiClient';
import { NewsCardItem, NewsFeedPayload } from '../types/news.types';

const EMPTY_FEED: NewsFeedPayload = {
  breaking_news: [],
  pinned_featured: [],
  small_news: [],
  has_more: false,
};

export async function getHomeNewsFeed(
  isManualRefresh = false
): Promise<ApiResult<NewsFeedPayload>> {
  return fetchModuleData<NewsFeedPayload>('news', '/news/feed', {
    isManualRefresh,
    cooldownMs: isManualRefresh ? 0 : 10_000,
    fallbackData: EMPTY_FEED,
  });
}

export async function publishRealNewsArticle(payload: {
  title: string;
  summary: string;
  cover_image_url: string;
  author_display_name: string;
  is_breaking: boolean;
  is_pinned_featured: boolean;
}): Promise<{ ok: boolean; data?: NewsCardItem; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/news/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json?.success) {
      return {
        ok: false,
        error: json?.error?.message ?? 'تعذر نشر الخبر على الخادم.',
      };
    }
    return { ok: true, data: json.data as NewsCardItem };
  } catch {
    return {
      ok: false,
      error: 'تعذر الاتصال بخادم الأخبار.',
    };
  }
}
