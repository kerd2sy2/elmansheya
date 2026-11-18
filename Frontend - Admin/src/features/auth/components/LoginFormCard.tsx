import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { rtlFlexDirection } from '@/core/theme/rtl';

interface LoginFormCardProps {
  onLoginSubmit: (
    phone: string,
    password: string,
    enableBiometric: boolean
  ) => Promise<{ ok: boolean; error?: string }>;
  onRegisterSubmit: (
    fullName: string,
    phone: string,
    password: string,
    area: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onTriggerBiometric?: () => void;
}

export function LoginFormCard({
  onLoginSubmit,
  onRegisterSubmit,
  onTriggerBiometric,
}: LoginFormCardProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const phoneInputRef = useRef<any>(null);
  const passwordInputRef = useRef<any>(null);

  // إدخال رقم الهاتف طبيعياً شاملاً الصفر في البداية بواسطة المستخدم
  const handlePhoneChange = (text: string) => {
    setPhone(text.replace(/[^0-9]/g, ''));
  };

  const handleSubmit = async () => {
    setErrorText(null);

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      setErrorText('يرجى إدخال رقم الموبايل.');
      return;
    }
    if (!password) {
      setErrorText('يرجى إدخال كلمة السر.');
      return;
    }
    if (mode === 'register' && !fullName.trim()) {
      setErrorText('يرجى إدخال الاسم الكامل.');
      return;
    }

    setSubmitting(true);
    const result =
      mode === 'login'
        ? await onLoginSubmit(cleanPhone, password, true)
        : await onRegisterSubmit(fullName.trim(), cleanPhone, password, 'المنشية');

    setSubmitting(false);
    if (!result.ok && result.error) {
      setErrorText(result.error);
    }
  };

  return (
    <View style={styles.card}>
      {/* تبويبات التبديل بتصميم بسيط ونظيف مثل تيليجرام */}
      <View style={styles.tabsRow}>
        <Pressable
          style={[styles.tabBtn, mode === 'login' && styles.tabBtnActive]}
          onPress={() => {
            setMode('login');
            setErrorText(null);
          }}>
          <Text
            style={[
              styles.tabBtnText,
              mode === 'login' && styles.tabBtnTextActive,
            ]}>
            تسجيل الدخول
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabBtn, mode === 'register' && styles.tabBtnActive]}
          onPress={() => {
            setMode('register');
            setErrorText(null);
          }}>
          <Text
            style={[
              styles.tabBtnText,
              mode === 'register' && styles.tabBtnTextActive,
            ]}>
            حساب جديد
          </Text>
        </Pressable>
      </View>

      {/* رسالة الخطأ إن وجدت */}
      {errorText ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color="#DC2626" />
          <Text style={styles.errorBannerText}>{errorText}</Text>
        </View>
      ) : null}

      {/* حقل الاسم بالكامل (في حالة إنشاء حساب فقط) */}
      {mode === 'register' ? (
        <View style={styles.fieldGroup}>
          <Text style={styles.labelText}>الاسم بالكامل</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="الاسم الثلاثي أو الرباعي"
              placeholderTextColor="#94A3B8"
              value={fullName}
              onChangeText={setFullName}
              selectionColor="#973c00"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => phoneInputRef.current?.focus()}
            />
          </View>
        </View>
      ) : null}

      {/* حقل رقم الموبايل: العلم ثم + ثم 2 ثم الرقم ويكتب اليوزر الصفر بنفسه */}
      <View style={styles.fieldGroup}>
        <Text style={styles.labelText}>رقم الموبايل</Text>
        <View style={styles.phoneInputContainer}>
          {/* العلم ثم + ثم 2 في الشمال */}
          <View style={styles.countryBadgeGroup}>
            <Text style={styles.countryFlag}>🇪🇬</Text>
            <Text style={styles.countryPlus}>+</Text>
            <Text style={styles.countryNumber}>2</Text>
          </View>

          <View style={styles.inputDivider} />

          {/* حقل الإدخال: يكتب فيه المستخدم الرقم بالكامل بدءاً من الصفر بدون أي تعليق */}
          <TextInput
            ref={phoneInputRef}
            style={styles.phoneInput}
            placeholder="01012345678"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            maxLength={11}
            value={phone}
            onChangeText={handlePhoneChange}
            selectionColor="#973c00"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => passwordInputRef.current?.focus()}
          />
        </View>
      </View>

      {/* حقل كلمة السر */}
      <View style={styles.fieldGroup}>
        <Text style={styles.labelText}>كلمة السر</Text>
        <View style={styles.inputContainer}>
          <TextInput
            ref={passwordInputRef}
            style={styles.textInput}
            placeholder="كلمة السر"
            placeholderTextColor="#94A3B8"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            selectionColor="#973c00"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          <Pressable
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.eyeBtn}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#64748B"
            />
          </Pressable>
        </View>
      </View>

      {/* زر تسجيل الدخول أو إنشاء الحساب بتصميم فلات نظيف وأصلي مثل تيليجرام */}
      <Pressable
        style={({ pressed }) => [
          styles.submitBtn,
          pressed && styles.submitBtnPressed,
          submitting && styles.submitBtnDisabled,
        ]}
        onPress={handleSubmit}
        disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.submitBtnText}>
            {mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
          </Text>
        )}
      </Pressable>

      {/* زر البصمة يظهر فقط في حالة تفعيل البصمة من الإعدادات */}
      {mode === 'login' && onTriggerBiometric ? (
        <Pressable
          style={({ pressed }) => [
            styles.biometricBtn,
            pressed && styles.biometricBtnPressed,
          ]}
          onPress={onTriggerBiometric}>
          <Ionicons name="finger-print-outline" size={20} color="#0F172A" />
          <Text style={styles.biometricBtnText}>الدخول بالبصمة</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabsRow: {
    flexDirection: rtlFlexDirection,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 18,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  tabBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorBannerText: {
    flex: 1,
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  labelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'right',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
  },
  // حاوية رقم الهاتف: تضمن أن يكون كود الدولة في الشمال دائماً
  phoneInputContainer: {
    direction: 'ltr',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
  },
  countryBadgeGroup: {
    direction: 'ltr',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  countryFlag: {
    fontSize: 16,
    marginRight: 3,
  },
  countryPlus: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  countryNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  inputDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 10,
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    fontSize: 15.5,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'left',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 14.5,
    color: '#0F172A',
    textAlign: 'right',
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    backgroundColor: '#973c00',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitBtnPressed: {
    opacity: 0.85,
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  biometricBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    height: 46,
    borderRadius: 12,
    marginTop: 10,
  },
  biometricBtnPressed: {
    backgroundColor: '#E2E8F0',
  },
  biometricBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
});
