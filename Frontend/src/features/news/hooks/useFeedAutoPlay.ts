import { useEffect, useRef, useState } from 'react';
import { Dimensions, LayoutChangeEvent } from 'react-native';
import { NewsCardItem } from '../types/news.types';

export function useFeedAutoPlay(visibleNews: NewsCardItem[]) {
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const activeVideoIdRef = useRef<string | null>(null);
  const cardLayoutsRef = useRef<Map<string, { y: number; height: number }>>(new Map());
  const listOffsetYRef = useRef<number>(170);

  const updateActiveVideo = (scrollY: number, viewportHeight: number) => {
    const listY = listOffsetYRef.current || 170;
    const viewportCenterInList = scrollY + viewportHeight / 2 - listY;

    let closestId: string | null = null;
    let minDistance = Infinity;

    for (const item of visibleNews) {
      const hasVid = Boolean(item.video_stream_url);
      if (!hasVid) continue;

      const layout = cardLayoutsRef.current.get(item.id);
      if (!layout) continue;

      const cardCenter = layout.y + layout.height / 2;
      const dist = Math.abs(cardCenter - viewportCenterInList);

      const cardTop = layout.y;
      const cardBottom = layout.y + layout.height;
      const isVisibleOnScreen =
        cardBottom > scrollY - listY && cardTop < scrollY + viewportHeight - listY;

      if (isVisibleOnScreen && dist < minDistance) {
        minDistance = dist;
        closestId = item.id;
      }
    }

    // إذا لم يجد كارت بالشرط الدقيق، نأخذ الأقرب لمركز الشاشة بمرونة
    if (!closestId) {
      for (const item of visibleNews) {
        if (!item.video_stream_url) continue;
        const layout = cardLayoutsRef.current.get(item.id);
        if (!layout) continue;
        const cardCenter = layout.y + layout.height / 2;
        const dist = Math.abs(cardCenter - viewportCenterInList);
        if (dist < minDistance && dist < viewportHeight * 0.9) {
          minDistance = dist;
          closestId = item.id;
        }
      }
    }

    if (closestId && closestId !== activeVideoIdRef.current) {
      activeVideoIdRef.current = closestId;
      setActiveVideoId(closestId);
    }
  };

  useEffect(() => {
    // تفعيل ذكي عند بداية تحميل الشاشة بعد اكتمال قياس العناصر
    const t1 = setTimeout(() => {
      updateActiveVideo(0, Dimensions.get('window').height);
    }, 250);
    const t2 = setTimeout(() => {
      updateActiveVideo(0, Dimensions.get('window').height);
    }, 700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [visibleNews]);

  const onListLayout = (e: LayoutChangeEvent) => {
    if (e.nativeEvent.layout.y > 0) {
      listOffsetYRef.current = e.nativeEvent.layout.y;
    }
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
