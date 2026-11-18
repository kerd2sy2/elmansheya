import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSecureItem, setSecureItem } from '@/core/auth-storage/sessionStorage';
import { getCompositeDeviceFingerprint } from '@/core/security/deviceFingerprint';
import { APP_THEME } from '@/core/theme/colors';
import { rtlFlexDirection, rtlTextAlign } from '@/core/theme/rtl';
import { useSmoothKeyboardOffset } from '@/core/theme/useSmoothKeyboardOffset';
import {
  completeWhatsAppRegistration,
  sendWhatsAppOtp,
  verifyWhatsAppOtp,
} from '../api/auth.api';
import { WelcomeOnboarding } from '../components/WelcomeOnboarding';
import { useAuth } from '../context/AuthContext';

const ONBOARDING_SEEN_KEY = 'elmansheya_has_seen_onboarding_v1';
const OTP_BACKOFF_STORAGE_KEY = 'elmansheya_otp_backoff_v1';

interface CountryDialOption {
  code: string;
  nameAr: string;
  dialCode: string;
  placeholder: string;
}

const COUNTRY_OPTIONS: CountryDialOption[] = [
  { code: 'EG', nameAr: 'مصر', dialCode: '+20', placeholder: '01012345678' },
  { code: 'SA', nameAr: 'السعودية', dialCode: '+966', placeholder: '501234567' },
  { code: 'AE', nameAr: 'الإمارات', dialCode: '+971', placeholder: '501234567' },
  { code: 'KW', nameAr: 'الكويت', dialCode: '+965', placeholder: '51234567' },
  { code: 'QA', nameAr: 'قطر', dialCode: '+974', placeholder: '33123456' },
  { code: 'BH', nameAr: 'البحرين', dialCode: '+973', placeholder: '39123456' },
  { code: 'OM', nameAr: 'عُمان', dialCode: '+968', placeholder: '91234567' },
  { code: 'JO', nameAr: 'الأردن', dialCode: '+962', placeholder: '791234567' },
  { code: 'LY', nameAr: 'ليبيا', dialCode: '+218', placeholder: '911234567' },
  { code: 'SD', nameAr: 'السودان', dialCode: '+249', placeholder: '912345678' },
];

type AuthStep = 'phone' | 'otp' | 'register_details';

export function LoginScreen() {
  const { loginWithDirectUser } = useAuth();
  const keyboardOffset = useSmoothKeyboardOffset(
    Platform.OS === 'android' ? 10 : 0
  );

  // حالة عرض جولة الترحيب لأول مرة فقط
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  // مراحل الصفحة المخصصة
  const [step, setStep] = useState<AuthStep>('phone');

  // كود الدولة والرقم (الافتراضي مصر +20)
  const [dialCode, setDialCode] = useState<string>('+20');
  const [phone, setPhone] = useState<string>('');
  const [showCountryPicker, setShowCountryPicker] = useState<boolean>(false);

  // رمز التحقق ومؤقت إعادة الإرسال المتصاعد (1، 2، 4، 8، 16 دقيقة...)
  const [otpCode, setOtpCode] = useState<string>('');
  const [wrongOtpAttempts, setWrongOtpAttempts] = useState<number>(0);
  const [otpAttemptCount, setOtpAttemptCount] = useState<number>(0);
  const [cooldownEndTime, setCooldownEndTime] = useState<number>(0);
  const [resendTimer, setResendTimer] = useState<number>(0);
  const isOtpLocked = wrongOtpAttempts >= 3;

  // بيانات المواطن الجديد
  const [newFullName, setNewFullName] = useState<string>('');
  const [newBirthDay, setNewBirthDay] = useState<string>('');
  const [newBirthMonth, setNewBirthMonth] = useState<string>('');
  const [newBirthYear, setNewBirthYear] = useState<string>('');
  const [newArea, setNewArea] = useState<string>('المنشية');

  // حالة الإرسال والأخطاء
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const phoneInputRef = useRef<any>(null);
  const otpInputRef = useRef<any>(null);
  const nameInputRef = useRef<any>(null);
  const monthInputRef = useRef<any>(null);
  const yearInputRef = useRef<any>(null);

  useEffect(() => {
    let active = true;
    getSecureItem<{ seen: boolean }>(ONBOARDING_SEEN_KEY).then((data) => {
      if (active) {
        setHasSeenOnboarding(Boolean(data?.seen));
      }
    });
    getSecureItem<{ attemptCount?: number; cooldownEndTime?: number }>(
      OTP_BACKOFF_STORAGE_KEY
    ).then((data) => {
      if (!active || !data) return;
      setOtpAttemptCount(data.attemptCount || 0);
      if (data.cooldownEndTime && data.cooldownEndTime > Date.now()) {
        setCooldownEndTime(data.cooldownEndTime);
        setResendTimer(Math.ceil((data.cooldownEndTime - Date.now()) / 1000));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // مؤقت إعادة إرسال الرمز محسوباً من وقت الانتهاء الفعلي
  useEffect(() => {
    if (cooldownEndTime <= Date.now()) {
      if (resendTimer !== 0) setResendTimer(0);
      return;
    }
    const updateRemaining = () => {
      const rem = Math.max(0, Math.ceil((cooldownEndTime - Date.now()) / 1000));
      setResendTimer(rem);
    };
    updateRemaining();
    const timer = setInterval(updateRemaining, 1000);
    return () => clearInterval(timer);
  }, [cooldownEndTime]);

  const formatResendWait = (sec: number): string => {
    if (sec < 60) {
      return `${sec} ثانية`;
    }
    const mins = Math.floor(sec / 60);
    const remSec = sec % 60;
    if (remSec === 0) {
      if (mins === 1) return 'دقيقة واحدة';
      if (mins === 2) return 'دقيقتين';
      if (mins <= 10) return `${mins} دقائق`;
      return `${mins} دقيقة`;
    }
    return `${mins}:${String(remSec).padStart(2, '0')} دقيقة`;
  };

  // لصق آمن من الحافظة دون التسبب في أخطاء إذا لم يكن ExpoClipboard مضمناً في العميل
  const handlePasteFromClipboard = async () => {
    try {
      let text = '';
      if (
        Platform.OS === 'web' &&
        typeof navigator !== 'undefined' &&
        navigator.clipboard?.readText
      ) {
        text = await navigator.clipboard.readText();
      } else {
        try {
          const { requireOptionalNativeModule } = require('expo-modules-core');
          const nativeClipboard =
            typeof requireOptionalNativeModule === 'function'
              ? requireOptionalNativeModule('ExpoClipboard')
              : null;
          if (nativeClipboard) {
            const mod = require('expo-clipboard');
            if (mod && typeof mod.getStringAsync === 'function') {
              text = await mod.getStringAsync();
            }
          }
        } catch {
          // الوحدة غير متوفرة في بيئة التشغيل الحالية
        }
      }

      if (!text) return;
      const digits = text.replace(/[^0-9]/g, '');
      if (digits.length >= 4) {
        const code = digits.substring(0, 4);
        setOtpCode(code);
        setErrorText(null);
        handleVerifyOtp(code);
      }
    } catch {
      // تجاهل أخطاء الحافظة بصمت
    }
  };

  useEffect(() => {
    if (step === 'otp') {
      handlePasteFromClipboard();
    }
  }, [step]);

  const getFullInternationalPhone = (): string => {
    let cleanCode = dialCode.replace(/[^0-9]/g, '');
    if (!cleanCode) cleanCode = '20';

    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanCode === '20' && cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    } else if (cleanCode === '966' && cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('0') && cleanPhone.length > 8) {
      cleanPhone = cleanPhone.substring(1);
    }

    return `+${cleanCode}${cleanPhone}`;
  };

  const handleDialCodeChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    setDialCode(digitsOnly ? `+${digitsOnly}` : '+');
    setErrorText(null);
  };

  const requiredPhoneLength = phone.startsWith('0') ? 11 : 10;
  const isPhoneComplete = phone.length === requiredPhoneLength;

  const handlePhoneChange = (text: string) => {
    let clean = text.replace(/[^0-9]/g, '');
    const maxLen = clean.startsWith('0') ? 11 : 10;
    clean = clean.slice(0, maxLen);
    if (clean.startsWith('05') && clean.length >= 3 && dialCode === '+20') {
      setDialCode('+966');
    } else if (clean.startsWith('01') && clean.length >= 3 && dialCode === '+966') {
      setDialCode('+20');
    }
    setPhone(clean);
    setErrorText(null);
  };

  const handleSendWhatsAppOtp = async () => {
    if (resendTimer > 0 && step === 'otp') {
      return;
    }

    Keyboard.dismiss();
    setErrorText(null);

    const cleanCode = dialCode.replace(/[^0-9]/g, '');
    if (!cleanCode) {
      setErrorText('يرجى إدخال مفتاح الدولة بشكل صحيح.');
      return;
    }

    if (!isPhoneComplete) {
      setErrorText(
        phone.startsWith('0')
          ? 'يرجى إكمال رقم الهاتف (11 رقماً عند البدء بـ 0).'
          : 'يرجى إكمال رقم الهاتف (10 أرقام بدون 0 في البداية).'
      );
      return;
    }

    const fullPhone = getFullInternationalPhone();
    setSubmitting(true);
    try {
      const fp = await getCompositeDeviceFingerprint();
      const res = await sendWhatsAppOtp(fullPhone, fp);

      if (!res.ok) {
        setErrorText(res.error || 'تعذر إرسال رمز التحقق، يرجى مراجعة الرقم.');
        setSubmitting(false);
        return;
      }

      // مضاعفة مدة الانتظار في كل مرة بدون تفعيل: 1، 2، 4، 8، 16 دقيقة...
      const cooldownSeconds = 60 * Math.pow(2, otpAttemptCount);
      const nextAttemptCount = otpAttemptCount + 1;
      const nextEndTime = Date.now() + cooldownSeconds * 1000;

      setOtpCode('');
      setWrongOtpAttempts(0);
      setOtpAttemptCount(nextAttemptCount);
      setCooldownEndTime(nextEndTime);
      setResendTimer(cooldownSeconds);
      await setSecureItem(OTP_BACKOFF_STORAGE_KEY, {
        attemptCount: nextAttemptCount,
        cooldownEndTime: nextEndTime,
      });

      setStep('otp');
      setTimeout(() => otpInputRef.current?.focus(), 250);
    } catch {
      setErrorText('تعذر الاتصال بالخادم، يرجى التأكد من اتصال الإنترنت.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    if (wrongOtpAttempts >= 3) {
      return;
    }

    const code = (codeToVerify ?? otpCode).trim();
    if (!code || code.length < 4) {
      setErrorText('يرجى إدخال رمز التحقق المكون من 4 أرقام.');
      return;
    }

    Keyboard.dismiss();
    setErrorText(null);
    setSubmitting(true);

    try {
      const fullPhone = getFullInternationalPhone();
      const fp = await getCompositeDeviceFingerprint();
      const res = await verifyWhatsAppOtp(fullPhone, code, fp);

      if (!res.ok) {
        const nextWrong = wrongOtpAttempts + 1;
        setWrongOtpAttempts(nextWrong);
        if (nextWrong >= 3) {
          setErrorText('تم إدخال رمز خاطئ 3 مرات. تم إيقاف التأكيد حتى تطلب رمزاً جديداً.');
        } else {
          setErrorText(res.error || 'رمز التحقق غير صحيح، يرجى المحاولة مرة أخرى.');
        }
        setSubmitting(false);
        return;
      }

      // تصفير عداد المضاعفة ومحاولات الخطأ بمجرد نجاح التحقق
      setWrongOtpAttempts(0);
      setOtpAttemptCount(0);
      setCooldownEndTime(0);
      setResendTimer(0);
      await setSecureItem(OTP_BACKOFF_STORAGE_KEY, null);

      if (res.is_registered && res.data?.user) {
        await loginWithDirectUser(res.data.user, res.data.refresh_token);
        setSubmitting(false);
        return;
      }

      setStep('register_details');
      setTimeout(() => nameInputRef.current?.focus(), 250);
    } catch {
      setErrorText('حدث خطأ أثناء التحقق من الرمز، يرجى المحاولة لاحقاً.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteRegistration = async () => {
    Keyboard.dismiss();
    setErrorText(null);

    const name = newFullName.trim();
    if (!name || name.split(/\s+/).length < 2) {
      setErrorText('يرجى إدخال الاسم الثنائي أو الثلاثي بالكامل.');
      return;
    }

    const yearNum = parseInt(newBirthYear.trim(), 10);
    if (!newBirthYear.trim() || newBirthYear.trim().length !== 4 || isNaN(yearNum) || yearNum < 1920 || yearNum > 2020) {
      setErrorText('يرجى إدخال سنة ميلاد صحيحة من 4 أرقام (مثال: 1995).');
      return;
    }

    const day = (newBirthDay.trim() || '01').padStart(2, '0');
    const month = (newBirthMonth.trim() || '01').padStart(2, '0');
    const birthDate = `${newBirthYear.trim()}-${month}-${day}`;

    setSubmitting(true);
    try {
      const fullPhone = getFullInternationalPhone();
      const fp = await getCompositeDeviceFingerprint();

      const res = await completeWhatsAppRegistration({
        phone: fullPhone,
        full_name: name,
        birth_date: birthDate,
        area: newArea.trim() || 'المنشية',
        device_fingerprint: fp,
      });

      if (!res.ok || !res.data?.user) {
        setErrorText(res.error || 'تعذر إتمام التسجيل، يرجى مراجعة البيانات.');
        setSubmitting(false);
        return;
      }

      await loginWithDirectUser(res.data.user, res.data.refresh_token);
      setSubmitting(false);
    } catch {
      setErrorText('تعذر حفظ البيانات بالخادم، يرجى المحاولة لاحقاً.');
      setSubmitting(false);
    }
  };

  if (hasSeenOnboarding === false) {
    return (
      <WelcomeOnboarding
        onStartAuth={async () => {
          await setSecureItem(ONBOARDING_SEEN_KEY, { seen: true });
          setHasSeenOnboarding(true);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View
        style={[styles.keyboardView, { paddingBottom: keyboardOffset }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* رأس الهوية الرسمي: اللوجو بجانب كلمة المنشية بدون خلفية أو إطار، يعمل مرة واحدة ويثبت على أوضح لون */}
          <View style={styles.brandHeader}>
            <View style={styles.brandRow}>
              <LottieView
                source={require('../../../../assets/json/logo.json')}
                autoPlay
                loop={false}
                style={styles.logoLottie}
              />
              <Text style={styles.brandTitle}>المنشية</Text>
            </View>
            <Text style={styles.brandSubtitle}>
              البوابة الرقمية الموحدة لأهالي قرية المنشية
            </Text>
          </View>

          {/* البطاقة البيضاء الأساسية المتناسقة مع ثيم التطبيق */}
          <View style={styles.card}>
            {/* زر رجوع أنيق في الخطوات الفرعية */}
            {step !== 'phone' ? (
              <Pressable
                style={styles.backRow}
                onPress={() => {
                  if (step === 'otp') setStep('phone');
                  if (step === 'register_details') setStep('otp');
                  setErrorText(null);
                }}
                hitSlop={10}>
                <Ionicons name="arrow-forward" size={18} color={APP_THEME.primary} />
                <Text style={styles.backText}>تغيير الرقم</Text>
              </Pressable>
            ) : null}

            {/* رسالة الخطأ المنسقة */}
            {errorText ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" />
                <Text style={styles.errorText}>{errorText}</Text>
              </View>
            ) : null}

            {/* =====================================================
                الخطوة 1: إدخال رقم الهاتف (LTR مع مفتاح قابل للكتابة أو الاختيار)
                ===================================================== */}
            {step === 'phone' ? (
              <View style={styles.stepBody}>
                <Text style={styles.cardTitle}>تسجيل الدخول</Text>
                <Text style={styles.cardSubtitle}>
                  أدخل رقم هاتفك لاستلام رمز التحقق عبر واتساب والدخول مباشرة
                </Text>

                <View style={styles.fieldBlock}>
                  {/* شريط موحد باتجاه LTR: المفتاح على اليسار ثم الفاصل ثم الرقم */}
                  <View style={styles.ltrPhoneBar}>
                    <View style={styles.dialKeyGroup}>
                      <Pressable
                        onPress={() => setShowCountryPicker(true)}
                        style={styles.dropdownTrigger}
                        hitSlop={8}>
                        <Ionicons name="chevron-down" size={15} color="#64748B" />
                      </Pressable>
                      <TextInput
                        style={styles.dialCodeInput}
                        value={dialCode}
                        onChangeText={handleDialCodeChange}
                        keyboardType="phone-pad"
                        maxLength={5}
                        selectionColor={APP_THEME.primary}
                      />
                    </View>

                    <View style={styles.verticalDivider} />

                    <TextInput
                      ref={phoneInputRef}
                      style={styles.ltrPhoneInput}
                      value={phone}
                      onChangeText={handlePhoneChange}
                      placeholder="رقم الهاتف"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      maxLength={requiredPhoneLength}
                      selectionColor={APP_THEME.primary}
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        if (isPhoneComplete) {
                          handleSendWhatsAppOtp();
                        }
                      }}
                    />
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    (!isPhoneComplete || submitting) && styles.primaryBtnDisabled,
                    pressed && styles.primaryBtnPressed,
                  ]}
                  onPress={handleSendWhatsAppOtp}
                  disabled={!isPhoneComplete || submitting}>
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="logo-whatsapp" size={19} color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>إرسال رمز التحقق</Text>
                    </>
                  )}
                </Pressable>

                <View style={styles.securityNote}>
                  <Ionicons name="shield-checkmark-outline" size={15} color="#64748B" />
                  <Text style={styles.securityNoteText}>
                    خدمة مجانية بالكامل ومؤمنة لأهالي القرية
                  </Text>
                </View>
              </View>
            ) : null}

            {/* =====================================================
                الخطوة 2: شاشة رمز التحقق (4 خانات مستقلة LTR)
                ===================================================== */}
            {step === 'otp' ? (
              <View style={styles.stepBody}>
                <View style={styles.otpHeaderRow}>
                  <Text style={styles.otpTitleInline} numberOfLines={1}>
                    تأكيد رمز التحقق لرقم
                  </Text>
                  <Text style={styles.otpPhoneInline} numberOfLines={1}>
                    {getFullInternationalPhone()}
                  </Text>
                </View>
                <Text style={styles.cardSubtitle}>
                  أدخل الرمز المكون من 4 أرقام المرسل عبر واتساب
                </Text>

                {/* 4 خانات منفصلة باتجاه LTR متفاعل مع الإدخال */}
                <Pressable
                  style={styles.otpCellsWrapper}
                  onPress={() => otpInputRef.current?.focus()}>
                  <View style={styles.otpCellsRow}>
                    {[0, 1, 2, 3].map((idx) => {
                      const digit = otpCode[idx] || '';
                      const isFocusedCell =
                        otpCode.length === idx ||
                        (idx === 3 && otpCode.length === 4);
                      const isFilled = Boolean(digit);

                      return (
                        <View
                          key={idx}
                          style={[
                            styles.otpCell,
                            isFilled && styles.otpCellFilled,
                            isFocusedCell && styles.otpCellActive,
                          ]}>
                          <Text style={styles.otpCellText}>{digit}</Text>
                        </View>
                      );
                    })}
                  </View>

                  <TextInput
                    ref={otpInputRef}
                    style={styles.hiddenOtpInput}
                    value={otpCode}
                    editable={!isOtpLocked && !submitting}
                    onChangeText={(val) => {
                      if (isOtpLocked) return;
                      const clean = val.replace(/[^0-9]/g, '').slice(0, 4);
                      setOtpCode(clean);
                      setErrorText(null);
                      if (clean.length === 4 && !isOtpLocked) {
                        handleVerifyOtp(clean);
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={4}
                    autoFocus
                    caretHidden
                  />
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    (otpCode.length < 4 || submitting || isOtpLocked) &&
                      styles.primaryBtnDisabled,
                    pressed && !isOtpLocked && styles.primaryBtnPressed,
                  ]}
                  onPress={() => handleVerifyOtp()}
                  disabled={otpCode.length < 4 || submitting || isOtpLocked}>
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>تأكيد المتابعة</Text>
                  )}
                </Pressable>

                <View style={styles.resendWrap}>
                  {resendTimer > 0 ? (
                    <Text style={styles.resendTimerText}>
                      يمكنك إعادة إرسال الرمز خلال {formatResendWait(resendTimer)}
                    </Text>
                  ) : (
                    <Pressable onPress={handleSendWhatsAppOtp} hitSlop={8}>
                      <Text style={styles.resendActionText}>
                        إعادة إرسال الرمز
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ) : null}

            {/* =====================================================
                الخطوة 3: إكمال بيانات المواطن الجديد
                ===================================================== */}
            {step === 'register_details' ? (
              <View style={styles.stepBody}>
                <Text style={styles.cardTitle}>إكمال بيانات الحساب</Text>
                <Text style={styles.cardSubtitle}>
                  تم توثيق رقم هاتفك بنجاح، يرجى إدخال اسمك وتاريخ ميلادك للمتابعة
                </Text>

                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                  <Text style={styles.verifiedBadgeText}>
                    {getFullInternationalPhone()}
                  </Text>
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>الاسم بالكامل</Text>
                  <TextInput
                    ref={nameInputRef}
                    style={styles.textInput}
                    placeholder="الاسم الثنائي أو الثلاثي"
                    placeholderTextColor="#94A3B8"
                    value={newFullName}
                    onChangeText={(t) => {
                      setNewFullName(t);
                      setErrorText(null);
                    }}
                    selectionColor={APP_THEME.primary}
                  />
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>تاريخ الميلاد</Text>
                  <View style={styles.dateRow}>
                    <View style={styles.dateCol}>
                      <Text style={styles.dateLabel}>السنة</Text>
                      <TextInput
                        ref={yearInputRef}
                        style={styles.dateInput}
                        placeholder="1995"
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                        maxLength={4}
                        value={newBirthYear}
                        onChangeText={(t) => {
                          setNewBirthYear(t.replace(/[^0-9]/g, ''));
                          setErrorText(null);
                        }}
                        selectionColor={APP_THEME.primary}
                      />
                    </View>

                    <View style={styles.dateCol}>
                      <Text style={styles.dateLabel}>الشهر</Text>
                      <TextInput
                        ref={monthInputRef}
                        style={styles.dateInput}
                        placeholder="05"
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                        maxLength={2}
                        value={newBirthMonth}
                        onChangeText={(t) => {
                          const clean = t.replace(/[^0-9]/g, '');
                          setNewBirthMonth(clean);
                          setErrorText(null);
                          if (clean.length === 2) yearInputRef.current?.focus();
                        }}
                        selectionColor={APP_THEME.primary}
                      />
                    </View>

                    <View style={styles.dateCol}>
                      <Text style={styles.dateLabel}>اليوم</Text>
                      <TextInput
                        style={styles.dateInput}
                        placeholder="12"
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                        maxLength={2}
                        value={newBirthDay}
                        onChangeText={(t) => {
                          const clean = t.replace(/[^0-9]/g, '');
                          setNewBirthDay(clean);
                          setErrorText(null);
                          if (clean.length === 2) monthInputRef.current?.focus();
                        }}
                        selectionColor={APP_THEME.primary}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>المنطقة أو الشارع (اختياري)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="المنشية"
                    placeholderTextColor="#94A3B8"
                    value={newArea}
                    onChangeText={setNewArea}
                    selectionColor={APP_THEME.primary}
                  />
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    (!newFullName.trim() || !newBirthYear.trim() || submitting) &&
                      styles.primaryBtnDisabled,
                    pressed && styles.primaryBtnPressed,
                  ]}
                  onPress={handleCompleteRegistration}
                  disabled={!newFullName.trim() || !newBirthYear.trim() || submitting}>
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>إتمام التسجيل والدخول</Text>
                  )}
                </Pressable>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </Animated.View>

      {/* =====================================================
          قائمة اختيار الدولة ومفتاح الاتصال (بدون أي إيموجي)
          ===================================================== */}
      <Modal
        visible={showCountryPicker}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowCountryPicker(false)}>
          <Pressable
            style={styles.countrySheet}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>اختر مفتاح الدولة</Text>
              <Pressable
                onPress={() => setShowCountryPicker(false)}
                style={styles.sheetCloseBtn}
                hitSlop={10}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.countryScroll}
              showsVerticalScrollIndicator={false}>
              {COUNTRY_OPTIONS.map((item) => {
                const isSelected = dialCode === item.dialCode;
                return (
                  <Pressable
                    key={item.code}
                    style={[
                      styles.countryOptionRow,
                      isSelected && styles.countryOptionRowActive,
                    ]}
                    onPress={() => {
                      setDialCode(item.dialCode);
                      setShowCountryPicker(false);
                      setErrorText(null);
                      setTimeout(() => phoneInputRef.current?.focus(), 150);
                    }}>
                    <Text
                      style={[
                        styles.countryOptionName,
                        isSelected && styles.countryOptionNameActive,
                      ]}>
                      {item.nameAr}
                    </Text>

                    <View style={styles.countryOptionRight}>
                      <Text
                        style={[
                          styles.countryOptionDial,
                          isSelected && styles.countryOptionDialActive,
                        ]}>
                        {item.dialCode}
                      </Text>
                      {isSelected ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={APP_THEME.primary}
                        />
                      ) : (
                        <View style={{ width: 18 }} />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF5EE',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 22,
  },
  brandRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 6,
  },
  logoLottie: {
    width: 48,
    height: 48,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  backRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    marginBottom: 12,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: APP_THEME.primary,
  },
  errorBox: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
    textAlign: rtlTextAlign,
  },
  stepBody: {
    width: '100%',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  fieldBlock: {
    width: '100%',
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
    textAlign: rtlTextAlign,
    marginBottom: 8,
  },
  ltrPhoneBar: {
    direction: 'ltr',
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  dialKeyGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dropdownTrigger: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialCodeInput: {
    height: 52,
    fontSize: 17,
    fontWeight: '700',
    color: APP_THEME.primary,
    textAlign: 'center',
    writingDirection: 'ltr',
    paddingVertical: 0,
    paddingHorizontal: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  verticalDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#CBD5E1',
    marginLeft: 4,
    marginRight: 8,
  },
  ltrPhoneInput: {
    flex: 1,
    height: 52,
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.5,
    textAlign: 'left',
    writingDirection: 'ltr',
    paddingVertical: 0,
    paddingHorizontal: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  primaryBtn: {
    width: '100%',
    height: 52,
    backgroundColor: APP_THEME.primary,
    borderRadius: 14,
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: APP_THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 4,
  },
  primaryBtnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  securityNote: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
  },
  securityNoteText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  otpHeaderRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 6,
    width: '100%',
  },
  otpTitleInline: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  otpPhoneInline: {
    fontSize: 13.5,
    fontWeight: '700',
    color: APP_THEME.primary,
    writingDirection: 'ltr',
  },
  otpCellsWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 22,
  },
  otpCellsRow: {
    direction: 'ltr',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  otpCell: {
    width: 58,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCellFilled: {
    backgroundColor: '#FFFFFF',
    borderColor: APP_THEME.primary,
  },
  otpCellActive: {
    backgroundColor: APP_THEME.primaryLight,
    borderColor: APP_THEME.primary,
    borderWidth: 2,
  },
  otpCellText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
  },
  hiddenOtpInput: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.015,
    fontSize: 24,
  },
  resendWrap: {
    marginTop: 18,
    alignItems: 'center',
  },
  resendTimerText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  resendActionText: {
    fontSize: 14,
    color: APP_THEME.primary,
    fontWeight: '800',
  },
  verifiedBadge: {
    direction: 'ltr',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 18,
    marginTop: -8,
  },
  verifiedBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
  },
  textInput: {
    height: 52,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 0,
    fontSize: 15,
    color: '#0F172A',
    textAlign: rtlTextAlign,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  dateRow: {
    direction: 'ltr',
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  dateCol: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 4,
  },
  dateInput: {
    height: 50,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 0,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  countrySheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 24 : 36,
    maxHeight: '65%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryScroll: {
    width: '100%',
  },
  countryOptionRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  countryOptionRowActive: {
    backgroundColor: APP_THEME.primaryLight,
    borderColor: APP_THEME.primaryBorder,
  },
  countryOptionName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  countryOptionNameActive: {
    color: APP_THEME.primary,
  },
  countryOptionRight: {
    direction: 'ltr',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countryOptionDial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  countryOptionDialActive: {
    color: APP_THEME.primary,
  },
});
