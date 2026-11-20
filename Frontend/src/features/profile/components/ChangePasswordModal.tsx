import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  View,
  Text,
  TextInput,
  Keyboard,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSmoothKeyboardOffset } from '@/core/theme/useSmoothKeyboardOffset';
import { changeUserPassword } from '@/features/auth/api/auth.api';
import { styles } from '../styles/profile.styles';

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
  phone: string;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  visible,
  onClose,
  phone,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const keyboardOffset = useSmoothKeyboardOffset(Platform.OS === 'android' ? 14 : 0);

  const resetForm = () => {
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordSuccess(false);
    setPasswordSubmitting(false);
  };

  const handleClose = () => {
    Keyboard.dismiss();
    resetForm();
    onClose();
  };

  const handleSavePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    const cleanNew = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanNew) {
      setPasswordError('يرجى إدخال كلمة السر الجديدة.');
      return;
    }
    if (cleanNew.length < 6) {
      setPasswordError('يجب ألا تقل كلمة السر عن ٦ خانات.');
      return;
    }
    if (cleanNew !== cleanConfirm) {
      setPasswordError('كلمتا السر غير متطابقتين، يرجى كتابتهما بدقة.');
      return;
    }

    setPasswordSubmitting(true);
    const res = await changeUserPassword(phone, cleanNew);
    setPasswordSubmitting(false);

    if (!res.ok) {
      setPasswordError(res.error || 'تعذر تغيير كلمة السر حالياً.');
      return;
    }

    setPasswordSuccess(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      // ignore
    }
    setTimeout(() => {
      handleClose();
    }, 1200);
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={handleClose}>
      <Pressable
        style={styles.sheetOverlay}
        onPress={handleClose}>
        <Animated.View
          style={[
            styles.changePasswordSheetBox,
            { paddingBottom: Animated.add(keyboardOffset, Platform.OS === 'android' ? 24 : 36) },
          ]}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetDragBar} />

            <View style={styles.changePasswordSheetHeader}>
              <View style={styles.changePasswordSheetIconCircle}>
                <Ionicons name="key" size={24} color="#973c00" />
              </View>
              <Text style={styles.changePasswordSheetTitle}>تغيير كلمة السر</Text>
              <Text style={styles.changePasswordSheetSub}>
                أدخل كلمة السر الجديدة وأعد كتابتها لتأكيد الحفظ
              </Text>
            </View>

            {passwordError ? (
              <View style={styles.passwordErrorBanner}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" />
                <Text style={styles.passwordErrorText}>{passwordError}</Text>
              </View>
            ) : null}

            {passwordSuccess ? (
              <View style={styles.passwordSuccessBanner}>
                <Ionicons name="checkmark-circle" size={18} color="#059669" />
                <Text style={styles.passwordSuccessText}>
                  تم تغيير كلمة السر بنجاح!
                </Text>
              </View>
            ) : null}

            {/* حقل كلمة السر الجديدة */}
            <View style={styles.passwordFieldGroup}>
              <Text style={styles.passwordFieldLabel}>كلمة السر الجديدة</Text>
              <View style={styles.passwordInputWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="أدخل كلمة سر جديدة (٦ خانات فأكثر)"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={(t) => {
                    setNewPassword(t);
                    setPasswordError(null);
                  }}
                  selectionColor="#973c00"
                />
                <Pressable
                  onPress={() => setShowNewPassword((prev) => !prev)}
                  style={styles.passwordEyeBtn}
                  hitSlop={12}>
                  <Ionicons
                    name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#64748B"
                  />
                </Pressable>
              </View>
            </View>

            {/* حقل إعادة كلمة السر */}
            <View style={styles.passwordFieldGroup}>
              <Text style={styles.passwordFieldLabel}>إعادة كلمة السر</Text>
              <View style={styles.passwordInputWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="أعد كتابة كلمة السر للتأكيد"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    setPasswordError(null);
                  }}
                  selectionColor="#973c00"
                />
                <Pressable
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  style={styles.passwordEyeBtn}
                  hitSlop={12}>
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#64748B"
                  />
                </Pressable>
              </View>
            </View>

            {/* زر حفظ كلمة السر */}
            <Pressable
              style={({ pressed }) => [
                styles.savePasswordBtn,
                pressed && styles.savePasswordBtnPressed,
                passwordSubmitting && styles.savePasswordBtnDisabled,
              ]}
              onPress={handleSavePassword}
              disabled={passwordSubmitting}>
              {passwordSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.savePasswordBtnText}>حفظ كلمة السر الجديدة</Text>
              )}
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};
