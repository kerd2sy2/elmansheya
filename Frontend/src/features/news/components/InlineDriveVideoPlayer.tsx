import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  I18nManager,
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
} from '@/core/utils/googleDrive';
import {
  shouldAutoPlayVideoNow,
  subscribeToAutoPlaySetting,
} from '@/core/storage/videoSettingsStorage';

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
}

/**
 * المشغل الأصيل فائق السرعة عبر مكتبة expo-video (ExoPlayer للأندرويد)
 * يعرض الفيديو مباشرة وبأعلى دقة أصلية داخل الشاشة ومدمجاً في المنشور
 */
function NativeExoPlayerView({
  streamUrl,
  height,
}: {
  streamUrl: string;
  height: number;
}) {
  const { useVideoPlayer, VideoView } = ExpoVideoModule;
  const player = useVideoPlayer(streamUrl, (p: any) => {
    p.loop = false;
    p.muted = false;
  });

  return (
    <View style={[styles.container, { height }]}>
      <VideoView
        style={styles.nativeVideo}
        player={player}
        nativeControls={true}
        allowsFullscreen={true}
        contentFit="contain"
      />
    </View>
  );
}

/**
 * المشغل السحابي عبر WebView مدمج
 */
function EmbeddedWebViewPlayer({
  previewUrl,
  height,
}: {
  previewUrl: string;
  height: number;
}) {
  const [loading, setLoading] = useState(true);
  const WebViewComponent = WebViewModule;

  return (
    <View style={[styles.container, { height }]}>
      {loading ? (
        <View style={[styles.loadingBox, { height }]}>
          <ActivityIndicator size="small" color="#973c00" />
          <Text style={styles.loadingText}>جاري تجهيز مشغل الفيديو السحابي...</Text>
        </View>
      ) : null}
      <WebViewComponent
        source={{ uri: previewUrl }}
        style={[styles.webView, loading && { opacity: 0 }]}
        allowsFullscreenVideo={true}
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
  height = 240,
}: InlineDriveVideoPlayerProps) {
  // الحالة المبدئية: لا يتم تشغيل الفيديو إلا إذا كان المستخدم على Wi-Fi ومفعل التشغيل التلقائي
  const [userWantsToPlay, setUserWantsToPlay] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    shouldAutoPlayVideoNow().then((canAutoPlay) => {
      if (isMounted && canAutoPlay) {
        setUserWantsToPlay(true);
      }
    });

    const unsubscribe = subscribeToAutoPlaySetting((enabled) => {
      if (!enabled) {
        if (isMounted) setUserWantsToPlay(false);
      } else {
        shouldAutoPlayVideoNow().then((canAutoPlay) => {
          if (isMounted) setUserWantsToPlay(canAutoPlay);
        });
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const fileId = extractGoogleDriveFileId(videoUrl);
  const directStreamUrl = getDirectVideoUrl(videoUrl);
  const previewUrl = getGoogleDrivePreviewUrl(videoUrl);

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

  // ١. شاشة الغلاف مع زر تشغيل عصري خفيف جداً على الذاكرة بدون تشغيل أي محرك فيديو قبل الضغط
  if (!userWantsToPlay) {
    return (
      <Pressable
        style={[styles.container, { height }]}
        onPress={() => setUserWantsToPlay(true)}
        accessibilityLabel="تشغيل الفيديو المدمج">
        {coverImageUrl ? (
          <Image
            source={{ uri: coverImageUrl }}
            style={styles.coverImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.coverImage, styles.darkPoster]}>
            <Ionicons name="film-outline" size={42} color="#334155" />
          </View>
        )}
        <View style={styles.playOverlay}>
          <View style={styles.playCircle}>
            <Ionicons
              name="play"
              size={32}
              color="#FFFFFF"
              style={{ marginLeft: I18nManager.isRTL ? -2 : 3 }}
            />
          </View>
          <View style={styles.badgeWrap}>
            <Ionicons name="videocam" size={14} color="#FFFFFF" />
            <Text style={styles.badgeText}>فيديو عالي الجودة (HD) - اضغط للتشغيل</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  // ٢. إذا كانت مكتبة expo-video متاحة في نسخة التطبيق المترجمة (الوضع الأصيل المثالي)
  if (ExpoVideoModule && directStreamUrl) {
    return <NativeExoPlayerView streamUrl={directStreamUrl} height={height} />;
  }

  // ٣. إذا كانت وحدة WebView متوفرة في نسخة التطبيق المترجمة
  if (WebViewModule && previewUrl) {
    return <EmbeddedWebViewPlayer previewUrl={previewUrl} height={height} />;
  }

  // ٤. بديل احتياطي أنيق إذا كانت نسخة الهاتف القديمة لا تحتوي على الوحدات الأصلية بعد
  return (
    <Pressable
      style={[styles.container, styles.fallbackContainer, { height }]}
      onPress={handleFallbackPlay}>
      {coverImageUrl ? (
        <Image
          source={{ uri: coverImageUrl }}
          style={[StyleSheet.absoluteFill, { opacity: 0.35 }]}
          contentFit="cover"
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
      <Text style={styles.fallbackTitle}>تشغيل الفيديو السحابي المرفق</Text>
      <Text style={styles.fallbackSub}>بث مباشر عالي الجودة بدون تنزيل</Text>
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
});
