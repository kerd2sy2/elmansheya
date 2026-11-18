import { useCallback, useEffect, useState } from 'react';
import { getHomeNewsFeed } from '../api/news.api';
import { NewsFeedPayload } from '../types/news.types';

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
    } else if (!isRefresh) {
      setLoading(true);
    }

    const res = await getHomeNewsFeed(isRefresh);
    if (res.data) {
      setFeed(res.data);
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
  }, []);

  useEffect(() => {
    loadFeed(false, false);
  }, [loadFeed]);

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
