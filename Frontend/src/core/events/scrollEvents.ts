type ScrollListener = () => void;

const homeScrollListeners = new Set<ScrollListener>();

export function registerHomeScrollToTop(listener: ScrollListener): () => void {
  homeScrollListeners.add(listener);
  return () => {
    homeScrollListeners.delete(listener);
  };
}

export function triggerHomeScrollToTop(): void {
  homeScrollListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // تجاهل أي خطأ عابر
    }
  });
}
