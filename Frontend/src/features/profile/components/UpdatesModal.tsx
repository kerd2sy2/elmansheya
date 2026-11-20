import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Updates from 'expo-updates';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { rtlFlexDirection } from '@/core/theme/rtl';

interface UpdatesModalProps {
  visible: boolean;
  onClose: () => void;
}

type UpdateStatus = 'checking' | 'up_to_date' | 'update_available' | 'downloading' | 'error';

export function UpdatesModal({ visible, onClose }: UpdatesModalProps) {
  const [status, setStatus] = useState<UpdateStatus>('checking');

  useEffect(() => {
    if (visible) {
      checkUpdates();
    }
  }, [visible]);

  const checkUpdates = async () => {
    setStatus('checking');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (__DEV__ || !Updates.isEnabled) {
      setTimeout(() => {
        setStatus('up_to_date');
      }, 1200);
      return;
    }

    try {
      const res = await Updates.checkForUpdateAsync();
      if (res.isAvailable) {
        setStatus('update_available');
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      } else {
        setStatus('up_to_date');
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
    } catch (err) {
      console.log('[UpdatesModal] check error:', err);
      setStatus('error');
    }
  };

  const handleApplyUpdate = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setStatus('downloading');
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (err) {
      console.log('[UpdatesModal] apply error:', err);
      setStatus('error');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable
          style={styles.bottomSheetBox}
          onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetDragBar} />

          {status === 'checking' && (
            <View style={styles.contentWrap}>
              <View style={styles.iconCircleChecking}>
                <ActivityIndicator size="large" color="#973c00" />
              </View>
              <Text style={styles.title}>جاري البحث عن تحديثات...</Text>
              <Text style={styles.description}>
                يتم الآن الاتصال بالسحابة وفحص وجود أي إصدار أحدث لتطبيق قرية المنشية.
              </Text>
            </View>
          )}

          {status === 'up_to_date' && (
            <View style={styles.contentWrap}>
              <View style={styles.iconCircleSuccess}>
                <Ionicons name="checkmark-circle" size={52} color="#16A34A" />
              </View>
              <Text style={styles.title}>أنت على آخر إصدار ✅</Text>
              <Text style={styles.description}>
                تطبيق قرية المنشية محدث بالكامل ومزود بأحدث التحسينات وميزات الأمان.
              </Text>
              <View style={styles.versionPill}>
                <Text style={styles.versionPillText}>
                  الإصدار 1.0.0 • قناة almuwatin
                </Text>
              </View>
              <Pressable style={styles.primaryBtn} onPress={onClose}>
                <Text style={styles.primaryBtnText}>حسناً</Text>
              </Pressable>
            </View>
          )}

          {status === 'update_available' && (
            <View style={styles.contentWrap}>
              <View style={styles.iconCircleAlert}>
                <Ionicons name="sparkles" size={46} color="#973c00" />
              </View>
              <Text style={styles.title}>تحديث جديد متوفر! 🎉</Text>
              <Text style={styles.description}>
                تم العثور على تحديث هوائي جديد يتضمن ميزات وتحسينات جديدة. اضغط لتطبيقه فوراً.
              </Text>
              <Pressable style={styles.primaryBtn} onPress={handleApplyUpdate}>
                <Ionicons
                  name="download-outline"
                  size={19}
                  color="#FFFFFF"
                  style={{ marginLeft: 6 }}
                />
                <Text style={styles.primaryBtnText}>تحديث وتثبيت الآن 🚀</Text>
              </Pressable>
            </View>
          )}

          {status === 'downloading' && (
            <View style={styles.contentWrap}>
              <View style={styles.iconCircleChecking}>
                <ActivityIndicator size="large" color="#973c00" />
              </View>
              <Text style={styles.title}>جاري تنزيل التحديث...</Text>
              <Text style={styles.description}>
                يتم الآن تحميل حزمة التحديث وتطبيقها. سيعاد تشغيل التطبيق تلقائياً خلال لحظات.
              </Text>
            </View>
          )}

          {status === 'error' && (
            <View style={styles.contentWrap}>
              <View style={styles.iconCircleError}>
                <Ionicons name="alert-circle-outline" size={52} color="#DC2626" />
              </View>
              <Text style={styles.title}>تعذر فحص التحديثات</Text>
              <Text style={styles.description}>
                تعذر الاتصال بخادم التحديثات حالياً. يرجى التحقق من اتصال الإنترنت ثم إعادة المحاولة.
              </Text>
              <Pressable style={styles.primaryBtn} onPress={checkUpdates}>
                <Ionicons
                  name="refresh-outline"
                  size={19}
                  color="#FFFFFF"
                  style={{ marginLeft: 6 }}
                />
                <Text style={styles.primaryBtnText}>إعادة المحاولة</Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  bottomSheetBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 36 : 48,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  sheetDragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 20,
  },
  contentWrap: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconCircleChecking: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconCircleSuccess: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconCircleAlert: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconCircleError: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  versionPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 22,
  },
  versionPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#973c00',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
