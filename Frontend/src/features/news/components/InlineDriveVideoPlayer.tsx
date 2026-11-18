import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  I18nManager,
  Image as RNImage,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { requireOptionalNativeModule } from 'expo-modules-core';
import {
  extractGoogleDriveFileId,
  getDirectVideoUrl,
  getGoogleDrivePreviewUrl,
  getGoogleDriveThumbnailUrl,
} from '@/core/utils/googleDrive';
import {
  shouldAutoPlayVideoNow,
  subscribeToAutoPlaySetting,
} from '@/core/storage/videoSettingsStorage';
import {
  getCachedAspectRatio,
  setCachedAspectRatio,
} from '../utils/mediaAspectRatioCache';

// فحص وجود وحدة الفيديو الأصلية في نسخة التطبيق المترجمة (ExoPlayer Native)
const hasNativeExpoVideo = Boolean(requireOptionalNativeModule('ExpoVideo'));

// فحص وجود وحدة WebView الأصلية
const hasNativeWebView =
  Platform.OS === 'web' || Boolean(requireOptionalNativeModule('RNCWebView'));

let ExpoVideoModule: any = null;
if (hasNativeExpoVideo) {
  try {
    ExpoVideoModule = require('expo-video');
  } catch {
    ExpoVideoModule = null;
  }
}

let WebViewModule: any = null;
if (!hasNativeExpoVideo && hasNativeWebView) {
  try {
    WebViewModule = require('react-native-webview').WebView;
  } catch {
    WebViewModule = null;
  }
}

interface InlineDriveVideoPlayerProps {
  videoUrl: string;
  coverImageUrl?: string | null;
  height?: number;
  isActive?: boolean;
  initialAspectRatio?: number;
  cacheKey?: string;
}

/**
 * المشغل الأصيل فائق السرعة عبر مكتبة expo-video (ExoPlayer للأندرويد)
 * بنمط Instagram & Twitter: تشغيل ذكي عند التمرير، كتم صوت افتراضي مع زر كتم/تشغيل،
 * وبدون شريط تقديم أو تأخير، مع التكيف التلقائي مع أبعاد الفيديو الطبيعية بدون أي اقتصاص.
 */
function NativeExoPlayerView({
  streamUrl,
  effectiveCoverUrl,
  height,
  isActive,
  autoPlayAllowed,
  aspectRatio,
  onAspectRatioChange,
  cacheKey,
}: {
  streamUrl: string;
  effectiveCoverUrl?: string | null;
  height?: number;
  isActive: boolean;
  autoPlayAllowed: boolean;
  aspectRatio: number;
  onAspectRatioChange?: (ratio: number) => void;
  cacheKey?: string;
}) {
  const videoViewRef = useRef<any>(null);
  const { useVideoPlayer, VideoView } = ExpoVideoModule;

  // صامت افتراضياً عند التصفح السريع لتجنب إزعاج المستخدم
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [manuallyPaused, setManuallyPaused] = useState<boolean>(false);

  const mutePressTimeRef = useRef<number>(0);

  // حماية صارمة لذاكرة أندرويد: حصر كاش الفيديو بـ 4MB كحد أقصى لمنع الـ OOM
  const videoSource = useMemo(() => ({
    uri: streamUrl,
    bufferOptions: {
      maxBufferBytes: 4 * 1024 * 1024,
      minBufferForPlayback: 1,
    },
  }), [streamUrl]);

  const player = useVideoPlayer(videoSource, (p: any) => {
    p.loop = true;
    p.muted = true;
  });

  const handleTrackDimension = useCallback(
    (width: number, height: number) => {
      if (width > 0 && height > 0) {
        const ratio = width / height;
        const clamped = Math.max(0.68, Math.min(ratio, 2.2));
        if (cacheKey) setCachedAspectRatio(cacheKey, clamped);
        setCachedAspectRatio(streamUrl, clamped);
        if (effectiveCoverUrl) setCachedAspectRatio(effectiveCoverUrl, clamped);

        // أهم نقطة لمنع اللاج والقفزات:
        // إذا كانت الأبعاد الحالية قريبة من النسبة الطبيعية (الفرق أقل من 0.05)، لا نغير أي شيء في الـ layout نهائياً!
        if (Math.abs(aspectRatio - clamped) > 0.05) {
          onAspectRatioChange?.(clamped);
        }
      }
    },
    [aspectRatio, cacheKey, streamUrl, effectiveCoverUrl, onAspectRatioChange]
  );

  useEffect(() => {
    if (!player) return;
    const subPlaying = player.addListener?.('playingChange', (ev: any) => {
      setIsPlaying(Boolean(ev.isPlaying));
    });
    const subMuted = player.addListener?.('mutedChange', (ev: any) => {
      setIsMuted(Boolean(ev.isMuted));
    });
    const subTrack = player.addListener?.('videoTrackChange', (ev: any) => {
      const size = ev.videoTrack?.size;
      if (size?.width && size?.height) {
        handleTrackDimension(size.width, size.height);
      }
    });
    const subSource = player.addListener?.('sourceLoad', (ev: any) => {
      const track = ev.availableVideoTracks?.[0];
      const size = track?.size;
      if (size?.width && size?.height) {
        handleTrackDimension(size.width, size.height);
      }
    });

    return () => {
      subPlaying?.remove();
      subMuted?.remove();
      subTrack?.remove();
      subSource?.remove();
    };
  }, [player, handleTrackDimension]);

  // إدارة التشغيل التلقائي عند التمرير:
  // - يشتغل فقط عندما يصبح الفيديو في منتصف الشاشة (isActive=true)
  // - يتوقف فوراً وسلساً عند عمل سكرول ومغادرة الشاشة (isActive=false) دون تدمير المشغل أو تقليص الكارت
  // - إذا أوقفه المستخدم بيده، يظل متوقفاً حتى يضغط عليه بيده مجدداً
  useEffect(() => {
    if (!player) return;

    if (isActive) {
      if (autoPlayAllowed && !manuallyPaused) {
        try {
          player.play();
        } catch {}
      }
    } else {
      // إيقاف فوري وسلس جداً في أجزاء من الملي ثانية دون أي هدم لواجهة المستخدم أو تقليص لأبعاد الكارت
      try {
        player.pause();
      } catch {}
    }
  }, [isActive, manuallyPaused, autoPlayAllowed, player]);

  // الضغط المباشر على الفيديو للإيقاف المؤقت أو التشغيل
  const handleTogglePlayPause = () => {
    // درع حماية حاسم: إذا كان المستخدم ضغط على زر الصوت في آخر 700ms، يمنع إيقاف الفيديو نهائياً
    if (Date.now() - mutePressTimeRef.current < 700) {
      return;
    }
    if (!player) return;
    if (player.playing) {
      setManuallyPaused(true);
      try {
        player.pause();
      } catch {}
    } else {
      setManuallyPaused(false);
      try {
        player.play();
      } catch {}
    }
  };

  // تبديل الصوت بشكل فوري ومباشر وسلس بدون أي لاج أو لخبطة أو تداخل
  const handleToggleMute = (e?: any) => {
    e?.stopPropagation?.();
    mutePressTimeRef.current = Date.now();
    if (!player) return;

    try {
      const nextMuted = !Boolean(player.muted);
      player.muted = nextMuted;
      setIsMuted(nextMuted);
    } catch {}
  };

  return (
    <View
      style={[
        styles.container,
        height ? { height } : { width: '100%', aspectRatio },
      ]}>
      {/* خلفية صورة المعاينة الفورية: تمنع أي شاشة سوداء أثناء تحميل الفيديو عبر الإنترنت */}
      {effectiveCoverUrl ? (
        <Image
          source={{ uri: effectiveCoverUrl }}
          style={[StyleSheet.absoluteFill, styles.coverImage]}
          contentFit="contain"
        />
      ) : null}

      {/* منطقة الفيديو القابلة للضغط للتشغيل والإيقاف المؤقت فقط */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={handleTogglePlayPause}
        accessibilityLabel="تشغيل أو إيقاف الفيديو">
        <VideoView
          ref={videoViewRef}
          style={styles.nativeVideo}
          player={player}
          nativeControls={false}
          allowsFullscreen={false}
          contentFit="contain"
        />

        {/* زر التشغيل الشفاف في المنتصف عند التوقف المؤقت */}
        {!isPlaying ? (
          <View style={styles.centerPlayOverlay} pointerEvents="none">
            <View style={styles.centerPlayCircle}>
              <Ionicons
                name="play"
                size={32}
                color="#FFFFFF"
                style={{ marginLeft: I18nManager.isRTL ? -2 : 3 }}
              />
            </View>
          </View>
        ) : null}
      </Pressable>

      {/* زر كتم وفتح الصوت: محمي تماماً من إيقاف الفيديو وبدون أي نصوص تظهر على الشاشة */}
      <View style={styles.controlsBottomRow} pointerEvents="box-none">
        <Pressable
          style={styles.circleControlBtn}
          onPressIn={() => {
            mutePressTimeRef.current = Date.now();
          }}
          onPress={handleToggleMute}
          hitSlop={12}
          accessibilityLabel="كتم أو تشغيل الصوت">
          <Ionicons
            name={isMuted ? 'volume-mute' : 'volume-high'}
            size={18}
            color="#FFFFFF"
          />
        </Pressable>
      </View>
    </View>
  );
}

/**
 * المشغل السحابي عبر WebView مدمج (كبديل في حال عدم توفر مشغل أندرويد الأصيل)
 */
function EmbeddedWebViewPlayer({
  previewUrl,
  height,
  isActive,
}: {
  previewUrl: string;
  height?: number;
  isActive: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const WebViewComponent = WebViewModule;
  const targetUrl = previewUrl.includes('?')
    ? `${previewUrl}&autoplay=1`
    : `${previewUrl}?autoplay=1`;

  const containerDimension = height ? { height } : { width: '100%' as const, aspectRatio: 16 / 9 };

  if (!isActive) {
    return (
      <View style={[styles.container, styles.darkPoster, containerDimension]}>
        <Ionicons name="film-outline" size={42} color="#334155" />
        <View style={styles.centerPlayOverlay} pointerEvents="none">
          <View style={styles.centerPlayCircle}>
            <Ionicons name="play" size={32} color="#FFFFFF" />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerDimension]}>
      {loading ? (
        <View style={[styles.loadingBox, containerDimension]}>
          <ActivityIndicator size="small" color="#973c00" />
          <Text style={styles.loadingText}>جاري تجهيز مشغل الفيديو...</Text>
        </View>
      ) : null}
      <WebViewComponent
        source={{ uri: targetUrl }}
        style={[styles.webView, loading && { opacity: 0 }]}
        allowsFullscreenVideo={false}
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        scrollEnabled={false}
        onLoadEnd={() => setLoading(false)}
        onError={() => setLoading(false)}
      />
    </View>
  );
}

export function InlineDriveVideoPlayer({
  videoUrl,
  coverImageUrl,
  height,
  isActive = false,
  initialAspectRatio,
  cacheKey,
}: InlineDriveVideoPlayerProps) {
  const [autoPlayAllowed, setAutoPlayAllowed] = useState<boolean>(true);
  const [userExplicitPlay, setUserExplicitPlay] = useState<boolean>(false);

  const fileId = extractGoogleDriveFileId(videoUrl);
  const directStreamUrl = getDirectVideoUrl(videoUrl);
  const previewUrl = getGoogleDrivePreviewUrl(videoUrl);
  const effectiveCoverUrl =
    coverImageUrl || getGoogleDriveThumbnailUrl(videoUrl);

  const resolvedInitialRatio =
    initialAspectRatio ||
    getCachedAspectRatio([cacheKey, videoUrl, effectiveCoverUrl]) ||
    16 / 9;

  const [aspectRatio, setAspectRatio] = useState<number>(resolvedInitialRatio);
  const [hasBeenMounted, setHasBeenMounted] = useState<boolean>(false);

  // تحديث النسبة فور وصول أبعاد أدق من الكارت الأب أو الكاش
  useEffect(() => {
    if (initialAspectRatio && Math.abs(initialAspectRatio - aspectRatio) > 0.05) {
      setAspectRatio(initialAspectRatio);
    }
  }, [initialAspectRatio, aspectRatio]);

  // فحص وقياس أبعاد صورة الغلاف/الثامبنيل فورياً في الخلفية لضبط حجم الكارت مسبقاً قبل بدء الفيديو
  useEffect(() => {
    if (!effectiveCoverUrl) return;
    const existing = getCachedAspectRatio([cacheKey, videoUrl, effectiveCoverUrl]);
    if (existing) {
      if (Math.abs(existing - aspectRatio) > 0.05) {
        setAspectRatio(existing);
      }
      return;
    }

    RNImage.getSize(
      effectiveCoverUrl,
      (w, h) => {
        if (w > 0 && h > 0) {
          const ratio = w / h;
          const clamped = Math.max(0.68, Math.min(ratio, 2.2));
          if (cacheKey) setCachedAspectRatio(cacheKey, clamped);
          setCachedAspectRatio(effectiveCoverUrl, clamped);
          setCachedAspectRatio(videoUrl, clamped);
          if (Math.abs(aspectRatio - clamped) > 0.05) {
            setAspectRatio(clamped);
          }
        }
      },
      () => {}
    );
  }, [effectiveCoverUrl, cacheKey, videoUrl, aspectRatio]);

  const containerDimension = height
    ? { height }
    : { width: '100%' as const, aspectRatio };

  useEffect(() => {
    let isMounted = true;
    shouldAutoPlayVideoNow().then((canAutoPlay) => {
      if (isMounted) {
        setAutoPlayAllowed(canAutoPlay);
      }
    });

    const unsubscribe = subscribeToAutoPlaySetting((enabled) => {
      if (isMounted) {
        setAutoPlayAllowed(enabled);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // تفعيل تركيب المشغل عند وصول الكارت إلى مركز الشاشة لأول مرة
  // وبمجرد تركيبه يظل المشغل موجوداً وثابتاً بالأبعاد الطبيعية دون أي تقليص أو هدم مفاجئ
  useEffect(() => {
    if ((isActive && autoPlayAllowed) || userExplicitPlay) {
      setHasBeenMounted(true);
    }
  }, [isActive, autoPlayAllowed, userExplicitPlay]);

  const handleFallbackPlay = async () => {
    try {
      await WebBrowser.openBrowserAsync(previewUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        toolbarColor: '#973c00',
        controlsColor: '#FFFFFF',
        showTitle: true,
      });
    } catch {
      await Linking.openURL(previewUrl).catch(() => {});
    }
  };

  // العرض المبدئي قبل وصول المستخدم للكارت (صورة الغلاف بنفس نسبة الأبعاد الدقيقة)
  // لمنع استهلاك الذاكرة قبل التمرير على الكارت
  if (!hasBeenMounted) {
    return (
      <Pressable
        style={[styles.container, containerDimension]}
        onPress={() => {
          setUserExplicitPlay(true);
          setHasBeenMounted(true);
        }}
        accessibilityLabel="تشغيل الفيديو المدمج">
        {effectiveCoverUrl ? (
          <Image
            source={{ uri: effectiveCoverUrl }}
            style={styles.coverImage}
            contentFit="contain"
            onLoad={(e) => {
              const { width, height: imgHeight } = e.source || {};
              if (width && imgHeight && imgHeight > 0) {
                const ratio = width / imgHeight;
                const clamped = Math.max(0.68, Math.min(ratio, 2.2));
                if (cacheKey) setCachedAspectRatio(cacheKey, clamped);
                setCachedAspectRatio(effectiveCoverUrl, clamped);
                setCachedAspectRatio(videoUrl, clamped);
                if (Math.abs(aspectRatio - clamped) > 0.05) {
                  setAspectRatio(clamped);
                }
              }
            }}
          />
        ) : (
          <View style={[styles.coverImage, styles.darkPoster]}>
            <Ionicons name="film-outline" size={42} color="#334155" />
          </View>
        )}
        <View style={styles.centerPlayOverlay} pointerEvents="none">
          <View style={styles.centerPlayCircle}>
            <Ionicons
              name="play"
              size={32}
              color="#FFFFFF"
              style={{ marginLeft: I18nManager.isRTL ? -2 : 3 }}
            />
          </View>
        </View>
      </Pressable>
    );
  }

  // ١. المشغل الأصيل فائق السرعة عبر مكتبة expo-video (ExoPlayer للأندرويد)
  // يظل محتفظاً بأبعاده الطبيعية عند تخطي الكارت ويقوم بالإيقاف المؤقت pause() فقط بدون تقليص أو لاج
  if (ExpoVideoModule && directStreamUrl) {
    return (
      <NativeExoPlayerView
        streamUrl={directStreamUrl}
        effectiveCoverUrl={effectiveCoverUrl}
        height={height}
        isActive={isActive}
        autoPlayAllowed={autoPlayAllowed}
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        cacheKey={cacheKey}
      />
    );
  }

  // ٢. المشغل السحابي عبر WebView مدمج
  if (WebViewModule && previewUrl) {
    return (
      <EmbeddedWebViewPlayer
        previewUrl={previewUrl}
        height={height}
        isActive={isActive}
      />
    );
  }

  return (
    <Pressable
      style={[styles.container, styles.fallbackContainer, containerDimension]}
      onPress={handleFallbackPlay}>
      {effectiveCoverUrl ? (
        <Image
          source={{ uri: effectiveCoverUrl }}
          style={[StyleSheet.absoluteFill, { opacity: 0.35 }]}
          contentFit="contain"
        />
      ) : null}
      <View style={styles.playCircle}>
        <Ionicons
          name="play"
          size={32}
          color="#FFFFFF"
          style={{ marginLeft: I18nManager.isRTL ? -2 : 3 }}
        />
      </View>
      <Text style={styles.fallbackTitle}>تشغيل الفيديو</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#000000',
    position: 'relative',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  darkPoster: {
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  playCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#973c00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  badgeWrap: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  nativeVideo: {
    width: '100%',
    height: '100%',
  },
  webView: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  loadingBox: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    gap: 8,
    zIndex: 10,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 12.5,
    fontWeight: '600',
  },
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    gap: 10,
    padding: 16,
  },
  fallbackTitle: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  fallbackSub: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  centerPlayOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    zIndex: 15,
  },
  centerPlayCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#973c00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  controlsBottomRow: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 20,
  },
  circleControlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
});
