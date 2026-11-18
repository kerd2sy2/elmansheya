import { useEffect, useRef, useState } from 'react';
import { Dimensions, LayoutChangeEvent } from 'react-native';
import { NewsCardItem } from '../types/news.types';

export function useFeedAutoPlay(visibleNews: NewsCardItem[]) {
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const activeVideoIdRef = useRef<string | null>(null);
  const cardLayoutsRef = useRef<Map<string, { y: number; height: number }>>(new Map());
  const listOffsetYRef = useRef<number>(0);

  const updateActiveVideo = (scrollY: number, viewportHeight: number) => {
    const viewportCenter = scrollY + viewportHeight / 2;
    const listY = listOffsetYRef.current;
    let closestId: string | null = null;
    let minDistance = Infinity;

    for (const item of visibleNews) {
      const hasVid = Boolean(item.video_stream_url);
      if (!hasVid) continue;

      const layout = cardLayoutsRef.current.get(item.id);
      if (!layout) continue;

      const absCardY = listY + layout.y;
      const absCardBottom = absCardY + layout.height;

      // هل كارت الفيديو مرئي حالياً في نافذة الرؤية؟
      const isVisibleInViewport =
        absCardBottom > scrollY + 40 && absCardY < scrollY + viewportHeight - 40;

      if (isVisibleInViewport) {
        const cardCenter = absCardY + layout.height / 2;
        const dist = Math.abs(cardCenter - viewportCenter);
        if (dist < minDistance) {
          minDistance = dist;
          closestId = item.id;
        }
      }
    }

    if (closestId !== activeVideoIdRef.current) {
      activeVideoIdRef.current = closestId;
      setActiveVideoId(closestId);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      updateActiveVideo(0, Dimensions.get('window').height);
    }, 400);
    return () => clearTimeout(timer);
  }, [visibleNews]);

  const onListLayout = (e: LayoutChangeEvent) => {
    listOffsetYRef.current = e.nativeEvent.layout.y;
  };

  const onCardLayout = (id: string, e: LayoutChangeEvent) => {
    cardLayoutsRef.current.set(id, e.nativeEvent.layout);
  };

  return {
    activeVideoId,
    updateActiveVideo,
    onListLayout,
    onCardLayout,
  };
}
