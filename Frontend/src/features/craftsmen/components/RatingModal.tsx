import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { API_BASE_URL } from '@/core/config/api.config';
import { rtlFlexDirection } from '@/core/theme/rtl';
import { useSmoothKeyboardOffset } from '@/core/theme/useSmoothKeyboardOffset';
import { useAuth } from '@/features/auth/context/AuthContext';
import { CraftsmanItem } from '../types/craftsmen.types';

interface RatingModalProps {
  visible: boolean;
  craftsman: CraftsmanItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function RatingModal({
  visible,
  craftsman,
  onClose,
  onSuccess,
}: RatingModalProps) {
  const { user } = useAuth();
  const keyboardOffset = useSmoothKeyboardOffset(Platform.OS === 'android' ? 14 : 0);
  const [stars, setStars] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  if (!craftsman) return null;

  const handleSubmit = async () => {
    if (stars < 1 || stars > 5) {
      setFeedback({
        type: 'warning',
        message: 'برجاء اختيار عدد النجوم من 1 إلى 5.',
      });
      return;
    }

    try {
      setLoading(true);
      setFeedback(null);
      const res = await fetch(`${API_BASE_URL}/ratings/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          craftsman_id: craftsman.id,
          stars,
          comment: comment.trim(),
          user_name: user?.full_name || 'أحد أهالي المنشية',
          user_phone: user?.phone || '',
        }),
      });

      if (!res.ok) {
        throw new Error('فشل إرسال التقييم');
      }

      setFeedback({
        type: 'success',
        message: 'تم تسجيل تقييمك ورأيك بنجاح لمساعدة أهل القرية.',
      });
      setComment('');
      setStars(5);
      setTimeout(() => {
        setFeedback(null);
        onSuccess();
        onClose();
      }, 1200);
    } catch {
      setFeedback({
        type: 'error',
        message: 'تعذر إرسال التقييم إلى الخادم، يرجى التأكد من الاتصال والمحاولة ثانية.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={() => {
        Keyboard.dismiss();
        onClose();
      }}>
      <Pressable
        style={styles.sheetOverlay}
        onPress={() => {
          Keyboard.dismiss();
          onClose();
        }}>
        <Animated.View
          style={[
            styles.bottomSheetBox,
            { paddingBottom: Animated.add(keyboardOffset, Platform.OS === 'android' ? 24 : 36) },
          ]}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetDragBar} />

            <Text style={styles.craftsmanName}>
              {craftsman.full_name} ({craftsman.specialty})
            </Text>

            {/* محدد النجوم */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((num) => (
                <Pressable
                  key={num}
                  onPress={() => setStars(num)}
                  style={styles.starTouch}>
                  <Ionicons
                    name={num <= stars ? 'star' : 'star-outline'}
                    size={36}
                    color={num <= stars ? '#F59E0B' : '#CBD5E1'}
                  />
                </Pressable>
              ))}
            </View>

            {/* إدخال الرأي أو الملاحظات */}
            <TextInput
              style={styles.textArea}
              placeholder="اكتب كلمة حق عن التجربة لمساعدة أهل القرية (اختياري)..."
              placeholderTextColor="#94A3B8"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
              textAlign="right"
            />

            {/* رسالة الحالة التفاعلية من الأسفل */}
            {feedback ? (
              <View
                style={[
                  styles.feedbackBox,
                  feedback.type === 'success'
                    ? styles.feedbackSuccess
                    : feedback.type === 'error'
                    ? styles.feedbackError
                    : styles.feedbackWarning,
                ]}>
                <Ionicons
                  name={
                    feedback.type === 'success'
                      ? 'checkmark-circle'
                      : feedback.type === 'error'
                      ? 'alert-circle'
                      : 'information-circle'
                  }
                  size={18}
                  color={
                    feedback.type === 'success'
                      ? '#15803D'
                      : feedback.type === 'error'
                      ? '#B91C1C'
                      : '#B45309'
                  }
                />
                <Text
                  style={[
                    styles.feedbackText,
                    feedback.type === 'success'
                      ? styles.feedbackTextSuccess
                      : feedback.type === 'error'
                      ? styles.feedbackTextError
                      : styles.feedbackTextWarning,
                  ]}>
                  {feedback.message}
                </Text>
              </View>
            ) : null}

            {/* زر الإرسال الوحيد بدون زر إغلاق */}
            <Pressable
              style={[styles.submitBtn, loading && styles.disabledBtn]}
              onPress={handleSubmit}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>إرسال التقييم</Text>
                </>
              )}
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  bottomSheetBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'android' ? 36 : 48,
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
  craftsmanName: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'center',
    gap: 12,
    marginVertical: 14,
  },
  starTouch: {
    padding: 4,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    fontSize: 13.5,
    color: '#0F172A',
    minHeight: 76,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  feedbackBox: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  feedbackSuccess: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  feedbackError: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  feedbackWarning: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  feedbackTextSuccess: {
    color: '#15803D',
  },
  feedbackTextError: {
    color: '#B91C1C',
  },
  feedbackTextWarning: {
    color: '#B45309',
  },
  submitBtn: {
    flexDirection: rtlFlexDirection,
    backgroundColor: '#973c00',
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
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
