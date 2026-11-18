import { useCallback, useEffect, useState } from 'react';
import { getOfflineData } from '@/core/offline/offlineStorage';
import { getHomeNewsFeed } from '../api/news.api';
import { NewsFeedPayload } from '../types/news.types';
import { warmMediaAspectRatioCache } from '../utils/mediaAspectRatioCache';

const NEWS_FEED_CACHE_KEY = 'mod:news:/news/feed';

export function useNewsFeed() {
  const [feed, setFeed] = useState<NewsFeedPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [servedFromCache, setServedFromCache] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [etag, setEtag] = useState<string>('');

  const loadFeed = useCallback(async (isRefresh = false, showSpinner = true) => {
    if (isRefresh && showSpinner) {
      setRefreshing(true);
    } else if (!isRefresh && !feed) {
      setLoading(true);
    }

    const res = await getHomeNewsFeed(isRefresh);
    if (res.data) {
      setFeed(res.data);
      warmMediaAspectRatioCache([
        ...(res.data.pinned_featured || []),
        ...(res.data.small_news || []),
      ]);
    }
    setServedFromCache(res.fromCache);
    setIsOffline(Boolean(res.isOffline));
    if (res.etag) {
      setEtag(res.etag);
    }
    setErrorMsg(res.error ? res.error.message : null);

    setLoading(false);
    setRefreshing(false);
    return res;
  }, [feed]);

  useEffect(() => {
    let isMounted = true;

    // ١. استرجاع فوري من كاش قرص الهاتف في أجزاء من الثانية (0ms)
    // لعرض الـ 30 خبر المحفوظة مسبقاً فور فتح التطبيق بدون أي انتظار
    getOfflineData<NewsFeedPayload>(NEWS_FEED_CACHE_KEY)
      .then((envelope) => {
        if (isMounted && envelope?.data) {
          setFeed(envelope.data);
          warmMediaAspectRatioCache([
            ...(envelope.data.pinned_featured || []),
            ...(envelope.data.small_news || []),
          ]);
          setLoading(false);
          setServedFromCache(true);
          if (envelope.etag) setEtag(envelope.etag);
        }
      })
      .catch(() => {});

    // ٢. فحص ذكي مشروط مع السيرفر عبر ETag (304 Not Modified)
    // لن يتم تحميل أي داتا إلا في حال قام المشرف بنشر خبر جديد أو تعديل بوست
    loadFeed(false, false);

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    feed,
    loading,
    refreshing,
    errorMsg,
    servedFromCache,
    isOffline,
    etag,
    refresh: (showSpinner = true) => loadFeed(true, showSpinner),
  };
}
