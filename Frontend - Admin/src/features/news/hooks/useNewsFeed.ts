import { useCallback, useEffect, useState } from 'react';
import { getHomeNewsFeed } from '../api/news.api';
import { NewsFeedPayload } from '../types/news.types';

export function useNewsFeed() {
  const [feed, setFeed] = useState<NewsFeedPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [servedFromCache, setServedFromCache] = useState<boolean>(false);
  const [etag, setEtag] = useState<string>('');

  const loadFeed = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const res = await getHomeNewsFeed(isRefresh);
    if (res.data) {
      setFeed(res.data);
    }
    setServedFromCache(res.fromCache);
    if (res.etag) {
      setEtag(res.etag);
    }
    setErrorMsg(res.error ? res.error.message : null);

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadFeed(false);
  }, [loadFeed]);

  return {
    feed,
    loading,
    refreshing,
    errorMsg,
    servedFromCache,
    etag,
    refresh: () => loadFeed(true),
  };
}
