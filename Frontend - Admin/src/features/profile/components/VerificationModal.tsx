import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { API_BASE_URL } from '@/core/config/api.config';
import { rtlFlexDirection } from '@/core/theme/rtl';
import { useAuth } from '@/features/auth/context/AuthContext';

interface VerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function VerificationModal({
  visible,
  onClose,
  onSuccess,
}: VerificationModalProps) {
  const { user, updateVerificationStatus } = useAuth();
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [frontBase64, setFrontBase64] = useState<string>('');
  const [backBase64, setBackBase64] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const pickImage = async (side: 'front' | 'back') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (side === 'front') {
          setFrontImage(asset.uri);
          setFrontBase64(asset.base64 ?? '');
        } else {
          setBackImage(asset.uri);
          setBackBase64(asset.base64 ?? '');
        }
      }
    } catch {
      Alert.alert('خطأ', 'تعذر اختيار الصورة من المعرض');
    }
  };

  const handleSubmit = async () => {
    if (!frontImage || !frontBase64) {
      Alert.alert('تنبيه', 'برجاء رفع صورة وجه البطاقة الشخصية أولاً.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/verification/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id ?? 'usr-current',
          citizen_name: user?.full_name ?? 'مواطن من القرية',
          id_card_front_base64: frontBase64,
          id_card_back_base64: backBase64,
        }),
      });

      if (!res.ok) {
        throw new Error('فشل إرسال طلب التوثيق');
      }

      await updateVerificationStatus('pending_review');
      Alert.alert(
        'تم إرسال الطلب',
        'تم استلام صور البطاقة وتشفيرها بنجاح. سيقوم مشرفو القرية بمراجعة الحساب وتأكيده خلال ٢٤ ساعة.'
      );
      setFrontImage(null);
      setBackImage(null);
      setFrontBase64('');
      setBackBase64('');
      onSuccess();
      onClose();
    } catch {
      Alert.alert('خطأ', 'تعذر إرسال صور التوثيق للخادم، يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable
          style={styles.bottomSheetBox}
          onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetDragBar} />

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* تنبيه الأمان والتشفير */}
            <View style={styles.securityNotice}>
              <Ionicons name="shield-checkmark" size={20} color="#15803D" />
              <Text style={styles.securityText}>
                الصور مشفرة بخوارزمية AES-256 ولا يتم عرضها لأي مستخدم آخر أو في أي
                شاشة عامة.
              </Text>
            </View>

            {/* بطاقة الوجه الأمامي */}
            <Text style={styles.sectionLabel}>١. صورة وجه البطاقة (مطلوب)</Text>
            <Pressable
              style={styles.uploadBox}
              onPress={() => pickImage('front')}>
              {frontImage ? (
                <Image source={{ uri: frontImage }} style={styles.previewImage} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="camera-outline" size={28} color="#973c00" />
                  <Text style={styles.uploadText}>اضغط لاختيار صورة وجه البطاقة</Text>
                </View>
              )}
            </Pressable>

            {/* بطاقة الوجه الخلفي */}
            <Text style={styles.sectionLabel}>٢. صورة ظهر البطاقة</Text>
            <Pressable
              style={styles.uploadBox}
              onPress={() => pickImage('back')}>
              {backImage ? (
                <Image source={{ uri: backImage }} style={styles.previewImage} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="image-outline" size={28} color="#64748B" />
                  <Text style={styles.uploadText}>اضغط لاختيار صورة ظهر البطاقة</Text>
                </View>
              )}
            </Pressable>

            {/* زر الإرسال الوحيد بدون زر إغلاق */}
            <Pressable
              style={[styles.submitBtn, loading && styles.disabledBtn]}
              onPress={handleSubmit}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>إرسال للتوثيق المشفر</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  bottomSheetBox: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 28 : 38,
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
    marginBottom: 14,
  },
  securityNotice: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: 14,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: '#166534',
    lineHeight: 18,
    textAlign: 'right',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'right',
    marginBottom: 6,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 14,
    height: 125,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  submitBtn: {
    flexDirection: rtlFlexDirection,
    backgroundColor: '#973c00',
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
});
