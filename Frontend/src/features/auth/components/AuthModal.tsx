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
import { Ionicons } from '@expo/vector-icons';
import { rtlFlexDirection, rtlTextAlign } from '@/core/theme/rtl';
import { useSmoothKeyboardOffset } from '@/core/theme/useSmoothKeyboardOffset';
import { getCompositeDeviceFingerprint } from '@/core/security/deviceFingerprint';
import {
  sendWhatsAppOtp,
  verifyWhatsAppOtp,
  completeWhatsAppRegistration,
} from '../api/auth.api';
import { useAuth } from '../context/AuthContext';

export interface CountryItem {
  code: string;
  nameAr: string;
  flag: string;
  dialCode: string;
  placeholder: string;
  maxLength: number;
  minLength: number;
  validate?: (cleanNum: string) => boolean;
  format?: (cleanNum: string) => string;
  errorMessage?: string;
}

export const COUNTRIES: CountryItem[] = [
  {
    code: 'EG',
    nameAr: 'مصر',
    flag: '🇪🇬',
    dialCode: '+20',
    placeholder: '01012345678',
    maxLength: 11,
    minLength: 10,
    validate: (n) =>
      (n.length === 11 &&
        (n.startsWith('010') ||
          n.startsWith('011') ||
          n.startsWith('012') ||
          n.startsWith('015'))) ||
      (n.length === 10 &&
        (n.startsWith('10') ||
          n.startsWith('11') ||
          n.startsWith('12') ||
          n.startsWith('15'))),
    format: (n) => (n.length === 10 && !n.startsWith('0') ? '0' + n : n),
    errorMessage:
      'يرجى إدخال رقم هاتف مصري صحيح (11 رقماً ويبدأ بـ 010 أو 011 أو 012 أو 015).',
  },
  {
    code: 'SA',
    nameAr: 'المملكة العربية السعودية',
    flag: '🇸🇦',
    dialCode: '+966',
    placeholder: '0501234567',
    maxLength: 10,
    minLength: 9,
    validate: (n) =>
      (n.length === 10 && n.startsWith('05')) ||
      (n.length === 9 && n.startsWith('5')),
    format: (n) => (n.startsWith('0') ? n.substring(1) : n),
    errorMessage:
      'يرجى إدخال رقم جوال سعودي صحيح (يبدأ بـ 05 ويتكون من 10 أرقام).',
  },
  {
    code: 'AE',
    nameAr: 'الإمارات',
    flag: '🇦🇪',
    dialCode: '+971',
    placeholder: '0501234567',
    maxLength: 10,
    minLength: 9,
    errorMessage: 'يرجى إدخال رقم هاتف إماراتي صحيح.',
  },
  {
    code: 'KW',
    nameAr: 'الكويت',
    flag: '🇰🇼',
    dialCode: '+965',
    placeholder: '91234567',
    maxLength: 8,
    minLength: 8,
    errorMessage: 'يرجى إدخال رقم هاتف كويتي صحيح.',
  },
  {
    code: 'QA',
    nameAr: 'قطر',
    flag: '🇶🇦',
    dialCode: '+974',
    placeholder: '33123456',
    maxLength: 8,
    minLength: 8,
    errorMessage: 'يرجى إدخال رقم هاتف قطري صحيح.',
  },
  {
    code: 'OTHER',
    nameAr: 'دولة أخرى',
    flag: '🌐',
    dialCode: '+',
    placeholder: 'رقم الهاتف مع كود الدولة',
    maxLength: 15,
    minLength: 7,
    errorMessage: 'يرجى إدخال رقم هاتف دولي صحيح.',
  },
];

function getFullFormattedPhone(country: CountryItem, rawPhone: string): string {
  let clean = rawPhone.replace(/[^0-9]/g, '');
  if (country.code === 'EG') {
    if (clean.startsWith('20')) clean = clean.substring(2);
    if (clean.length === 10 && clean.startsWith('1')) clean = '0' + clean;
    return clean;
  }
  if (country.code === 'OTHER') {
    return rawPhone.startsWith('+') ? rawPhone.trim() : '+' + clean;
  }
  const national = clean.startsWith('0') ? clean.substring(1) : clean;
  return `${country.dialCode}${national}`;
}

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onLoginSubmit?: (
    phone: string,
    password: string,
    enableBiometric: boolean
  ) => Promise<{ ok: boolean; error?: string }>;
  onRegisterSubmit?: (
    fullName: string,
    phone: string,
    password: string,
    area: string,
    email?: string
  ) => Promise<{ ok: boolean; error?: string; code?: string }>;
  onTriggerBiometric?: () => void;
}

type AuthPhase = 'phone' | 'otp' | 'register_details';

export function AuthModal({ visible, onClose }: AuthModalProps) {
  const { loginWithDirectUser } = useAuth();
  const keyboardOffset = useSmoothKeyboardOffset(
    Platform.OS === 'android' ? 14 : 0
  );

  const [phase, setPhase] = useState<AuthPhase>('phone');

  // كود الدولة قابل للتعديل المباشر (الديفولت مصر +20)
  const [dialCode, setDialCode] = useState<string>('+20');
  const [phone, setPhone] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [otpDevHint, setOtpDevHint] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState<number>(60);

  // بيانات الحساب الجديد
  const [newFullName, setNewFullName] = useState<string>('');
  const [newBirthYear, setNewBirthYear] = useState<string>('');
  const [newBirthMonth, setNewBirthMonth] = useState<string>('');
  const [newBirthDay, setNewBirthDay] = useState<string>('');
  const [newArea, setNewArea] = useState<string>('المنشية');

  // حالات التحميل والخطأ
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const dialCodeInputRef = useRef<any>(null);
  const phoneInputRef = useRef<any>(null);
  const otpInputRef = useRef<any>(null);
  const nameInputRef = useRef<any>(null);

  // حساب الرقم الدولي الموحد للإرسال
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

  // عداد إعادة الإرسال
  useEffect(() => {
    let timer: any = null;
    if (phase === 'otp' && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [phase, resendTimer]);

  // لصق كود التحقق من الحافظة بأمان دون حدوث أي خطأ
  const handlePasteFromClipboard = async () => {
    try {
      let text = '';
      try {
        const mod = require('expo-clipboard');
        if (mod && typeof mod.getStringAsync === 'function') {
          text = await mod.getStringAsync();
        }
      } catch {}

      if (!text) return;
      const digits = text.replace(/[^0-9]/g, '');
      if (digits.length >= 4) {
        const code = digits.substring(0, 4);
        setOtpCode(code);
        setErrorText(null);
        handleVerifyOtp(code);
      }
    } catch {}
  };

  useEffect(() => {
    if (phase === 'otp') {
      handlePasteFromClipboard();
    }
  }, [phase]);

  const handleDialCodeChange = (text: string) => {
    let clean = text.trim();
    if (!clean.startsWith('+')) {
      clean = '+' + clean.replace(/[^0-9]/g, '');
    } else {
      clean = '+' + clean.substring(1).replace(/[^0-9]/g, '');
    }
    setDialCode(clean);
    setErrorText(null);
  };

  const handlePhoneChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, '');
    // تمييز ذكي تلقائي: إذا كتب 05 يحول الكود لسعودي
    if (clean.startsWith('05') && clean.length >= 3 && dialCode === '+20') {
      setDialCode('+966');
    } else if (clean.startsWith('01') && clean.length >= 3 && dialCode === '+966') {
      setDialCode('+20');
    }
    setPhone(clean);
    setErrorText(null);
  };

  // ١. إرسال كود الواتساب
  const handleSendWhatsAppOtp = async () => {
    Keyboard.dismiss();
    setErrorText(null);

    const fullPhone = getFullInternationalPhone();
    if (!phone.trim() || phone.trim().length < 7) {
      setErrorText('يرجى إدخال رقم هاتف صحيح للمتابعة.');
      return;
    }

    setSubmitting(true);
    try {
      const fp = await getCompositeDeviceFingerprint();
      const res = await sendWhatsAppOtp(fullPhone, fp);

      if (!res.ok) {
        setErrorText(res.error || 'تعذر إرسال كود الواتساب، يرجى التحقق من الرقم.');
        setSubmitting(false);
        return;
      }

      if (res.dev_code) {
        setOtpDevHint(res.dev_code);
      }

      setResendTimer(60);
      setPhase('otp');
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } catch {
      setErrorText('تعذر الاتصال بالخادم. يرجى التأكد من تشغيل الإنترنت.');
    } finally {
      setSubmitting(false);
    }
  };

  // ٢. التحقق من كود الواتساب
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = (codeToVerify ?? otpCode).trim();
    if (!code || code.length < 4) {
      setErrorText('يرجى إدخال كود التحقق المكون من 4 أرقام.');
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
        setErrorText(res.error || 'كود التحقق غير صحيح، يرجى التأكد وإعادة المحاولة.');
        setSubmitting(false);
        return;
      }

      // إذا كان المستخدم مسجلاً من قبل -> دخوله فوري إلى الرئيسية
      if (res.is_registered && res.data?.user) {
        await loginWithDirectUser(res.data.user, res.data.refresh_token);
        setSubmitting(false);
        onClose();
        return;
      }

      // إذا كان مستخدماً جديداً -> الانتقال لملء الاسم وتاريخ الميلاد
      setPhase('register_details');
      setTimeout(() => nameInputRef.current?.focus(), 300);
    } catch {
      setErrorText('حدث خطأ أثناء التحقق، يرجى المحاولة لاحقاً.');
    } finally {
      setSubmitting(false);
    }
  };

  // ٣. إكمال تسجيل حساب جديد (الاسم + تاريخ الميلاد) ثم الانتقال مباشرة للرئيسية
  const handleCompleteRegistration = async () => {
    Keyboard.dismiss();
    setErrorText(null);

    const name = newFullName.trim();
    if (!name || name.split(' ').length < 2) {
      setErrorText('يرجى إدخال الاسم الثنائي أو الثلاثي بالكامل.');
      return;
    }

    const day = newBirthDay.trim().padStart(2, '0');
    const month = newBirthMonth.trim().padStart(2, '0');
    const year = newBirthYear.trim();

    if (!year || year.length !== 4 || parseInt(year, 10) < 1920 || parseInt(year, 10) > 2020) {
      setErrorText('يرجى إدخال سنة ميلاد صحيحة (مثال: 1995).');
      return;
    }

    const birthDate = `${year}-${month || '01'}-${day || '01'}`;

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

      // تسجيل دخول فوري بالبيانات الجديدة والانتقال للرئيسية
      await loginWithDirectUser(res.data.user, res.data.refresh_token);
      setSubmitting(false);
      onClose();
    } catch {
      setErrorText('تعذر حفظ البيانات بالخادم، يرجى المحاولة لاحقاً.');
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={Keyboard.dismiss}>
        <Animated.View style={[styles.modalCard, { transform: [{ translateY: keyboardOffset }] }]}>
          
          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => {
                if (phase === 'otp') {
                  setPhase('phone');
                  setErrorText(null);
                } else if (phase === 'register_details') {
                  setPhase('otp');
                  setErrorText(null);
                } else {
                  onClose();
                }
              }}
              style={styles.closeBtn}
              hitSlop={12}
            >
              <Ionicons
                name={phase === 'phone' ? 'close' : 'arrow-forward'}
                size={22}
                color="#94a3b8"
              />
            </Pressable>

            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>
                {phase === 'phone' && 'تسجيل الدخول عبر واتساب 💬'}
                {phase === 'otp' && 'رمز التحقق السري 🔒'}
                {phase === 'register_details' && 'بيانات المواطن الجديد 🏛️'}
              </Text>
            </View>

            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* رسالة الخطأ */}
            {Boolean(errorText) && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                <Text style={styles.errorText}>{errorText}</Text>
              </View>
            )}

            {/* المرحلة الأولى: إدخال رقم الهاتف */}
            {phase === 'phone' && (
              <View style={styles.stepContainer}>
                <View style={styles.iconCircle}>
                  <Ionicons name="logo-whatsapp" size={44} color="#22c55e" />
                </View>

                <Text style={styles.mainTitle}>أهلاً بك في تطبيق المنشية</Text>
                <Text style={styles.subtitle}>
                  أدخل رقم هاتفك وسنرسل لك كود دخول مكون من 4 أرقام على الواتساب فوراً وبشكل مجاني.
                </Text>

                {/* حقل إدخال كود الدولة ورقم الهاتف (قابل للتعديل اليدوي المباشر) */}
                <View style={styles.phoneInputRow}>
                  {/* كود الدولة يدوي (افتراضي +20 مصر) */}
                  <View style={styles.dialCodeWrap}>
                    <Text style={styles.dialCodeLabel}>كود الدولة</Text>
                    <TextInput
                      ref={dialCodeInputRef}
                      style={styles.dialCodeInput}
                      keyboardType="phone-pad"
                      value={dialCode}
                      onChangeText={handleDialCodeChange}
                      maxLength={5}
                      textAlign="center"
                    />
                  </View>

                  {/* رقم الهاتف */}
                  <View style={styles.localPhoneWrap}>
                    <Text style={styles.phoneLabel}>رقم الهاتف</Text>
                    <TextInput
                      ref={phoneInputRef}
                      style={styles.phoneInput}
                      placeholder={dialCode === '+20' ? '01012345678' : '501234567'}
                      placeholderTextColor="#64748b"
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={handlePhoneChange}
                      maxLength={15}
                      textAlign="right"
                      returnKeyType="done"
                      onSubmitEditing={handleSendWhatsAppOtp}
                    />
                  </View>
                </View>

                {/* أزرار سريعة لاختيار الدول الأكثر استخداماً */}
                <View style={styles.countryPillsRow}>
                  {[
                    { label: '🇪🇬 مصر (+20)', code: '+20' },
                    { label: '🇸🇦 السعودية (+966)', code: '+966' },
                    { label: '🇦🇪 الإمارات (+971)', code: '+971' },
                    { label: '🇰🇼 الكويت (+965)', code: '+965' },
                  ].map((item) => (
                    <Pressable
                      key={item.code}
                      style={[
                        styles.countryPill,
                        dialCode === item.code && styles.countryPillActive,
                      ]}
                      onPress={() => {
                        setDialCode(item.code);
                        setErrorText(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.countryPillText,
                          dialCode === item.code && styles.countryPillTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* شركات المحمول بمصر لو كود الدولة +20 */}
                {dialCode === '+20' && (
                  <View style={styles.carrierChipsRow}>
                    {[
                      { label: 'فودافون (010)', prefix: '010' },
                      { label: 'اتصالات (011)', prefix: '011' },
                      { label: 'أورانج (012)', prefix: '012' },
                      { label: 'وي (015)', prefix: '015' },
                    ].map((c) => (
                      <Pressable
                        key={c.prefix}
                        style={[
                          styles.carrierChip,
                          phone.startsWith(c.prefix) && styles.carrierChipActive,
                        ]}
                        onPress={() => {
                          if (!phone || phone.length <= 3) setPhone(c.prefix);
                        }}
                      >
                        <Text
                          style={[
                            styles.carrierChipText,
                            phone.startsWith(c.prefix) && styles.carrierChipTextActive,
                          ]}
                        >
                          {c.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* زر إرسال كود الواتساب */}
                <Pressable
                  style={[
                    styles.primaryBtn,
                    (!phone.trim() || submitting) && styles.btnDisabled,
                  ]}
                  onPress={handleSendWhatsAppOtp}
                  disabled={!phone.trim() || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="paper-plane" size={18} color="#ffffff" />
                      <Text style={styles.primaryBtnText}>
                        إرسال كود الدخول عبر واتساب 💬
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}

            {/* المرحلة الثانية: كود التحقق 4 أرقام */}
            {phase === 'otp' && (
              <View style={styles.stepContainer}>
                <View style={styles.iconCircle}>
                  <Ionicons name="chatbubble-ellipses" size={44} color="#38bdf8" />
                </View>

                <Text style={styles.mainTitle}>أدخل كود التحقق</Text>
                <Text style={styles.subtitle}>
                  تم إرسال رسالة واتساب إلى الرقم{' '}
                  <Text style={styles.highlightText}>
                    {getFullInternationalPhone()}
                  </Text>
                  {'\n'}تحتوي على كود الدخول المكون من 4 أرقام.
                </Text>

                {/* تنبيه كود التطوير إذا وُجد */}
                {Boolean(otpDevHint) && (
                  <View style={styles.devHintBadge}>
                    <Text style={styles.devHintText}>كود الواتساب: {otpDevHint}</Text>
                  </View>
                )}

                {/* إدخال كود الـ OTP */}
                <View style={styles.otpInputBox}>
                  <TextInput
                    ref={otpInputRef}
                    style={styles.otpInputField}
                    keyboardType="number-pad"
                    maxLength={4}
                    value={otpCode}
                    onChangeText={(val) => {
                      const clean = val.replace(/[^0-9]/g, '');
                      setOtpCode(clean);
                      setErrorText(null);
                      if (clean.length === 4) {
                        handleVerifyOtp(clean);
                      }
                    }}
                    placeholder="••••"
                    placeholderTextColor="#475569"
                    textAlign="center"
                    autoFocus
                  />

                  {/* زر سريع للصق الكود من الحافظة */}
                  <Pressable
                    style={styles.pasteBtn}
                    onPress={handlePasteFromClipboard}
                    hitSlop={8}
                  >
                    <Ionicons name="clipboard-outline" size={16} color="#38bdf8" />
                    <Text style={styles.pasteBtnText}>لصق الكود المنسوخ من واتساب 📋</Text>
                  </Pressable>
                </View>

                {/* زر تأكيد الكود */}
                <Pressable
                  style={[
                    styles.primaryBtn,
                    (otpCode.length < 4 || submitting) && styles.btnDisabled,
                  ]}
                  onPress={() => handleVerifyOtp()}
                  disabled={otpCode.length < 4 || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                      <Text style={styles.primaryBtnText}>تأكيد ومتابعة ✅</Text>
                    </>
                  )}
                </Pressable>

                {/* خيارات إعادة الإرسال وتعديل الرقم */}
                <View style={styles.otpOptionsRow}>
                  {resendTimer > 0 ? (
                    <Text style={styles.timerText}>
                      إعادة الإرسال بعد {resendTimer} ثانية
                    </Text>
                  ) : (
                    <Pressable onPress={handleSendWhatsAppOtp}>
                      <Text style={styles.resendLinkText}>إعادة إرسال الكود مجدداً 💬</Text>
                    </Pressable>
                  )}

                  <Pressable
                    onPress={() => {
                      setPhase('phone');
                      setOtpCode('');
                      setErrorText(null);
                    }}
                  >
                    <Text style={styles.changePhoneText}>تعديل الرقم ✏️</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* المرحلة الثالثة: إدخال الاسم وتاريخ الميلاد للمواطن الجديد */}
            {phase === 'register_details' && (
              <View style={styles.stepContainer}>
                <View style={styles.iconCircle}>
                  <Ionicons name="person-add" size={44} color="#f59e0b" />
                </View>

                <Text style={styles.mainTitle}>أهلاً بك في عائلة المنشية! 🎉</Text>
                <Text style={styles.subtitle}>
                  تم توثيق رقم هاتفك بنجاح. يرجى إدخال اسمك وتاريخ ميلادك لإتمام حسابك والدخول إلى الرئيسية مباشرة.
                </Text>

                {/* شارة الرقم الموثق */}
                <View style={styles.verifiedPhoneBadge}>
                  <Ionicons name="shield-checkmark" size={18} color="#22c55e" />
                  <Text style={styles.verifiedPhoneText}>
                    الرقم الموثق: {getFullInternationalPhone()}
                  </Text>
                </View>

                {/* الاسم بالكامل */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>الاسم بالكامل (ثنائي أو ثلاثي) *</Text>
                  <TextInput
                    ref={nameInputRef}
                    style={styles.textInput}
                    placeholder="مثال: أحمد محمد عبد الله"
                    placeholderTextColor="#64748b"
                    value={newFullName}
                    onChangeText={setNewFullName}
                    textAlign="right"
                  />
                </View>

                {/* تاريخ الميلاد (سنة - شهر - يوم) */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>تاريخ الميلاد *</Text>
                  <View style={styles.dateInputsRow}>
                    <View style={styles.dateInputCol}>
                      <Text style={styles.dateSubLabel}>السنة</Text>
                      <TextInput
                        style={styles.dateInput}
                        placeholder="1995"
                        placeholderTextColor="#64748b"
                        keyboardType="number-pad"
                        maxLength={4}
                        value={newBirthYear}
                        onChangeText={setNewBirthYear}
                        textAlign="center"
                      />
                    </View>

                    <View style={styles.dateInputCol}>
                      <Text style={styles.dateSubLabel}>الشهر</Text>
                      <TextInput
                        style={styles.dateInput}
                        placeholder="05"
                        placeholderTextColor="#64748b"
                        keyboardType="number-pad"
                        maxLength={2}
                        value={newBirthMonth}
                        onChangeText={setNewBirthMonth}
                        textAlign="center"
                      />
                    </View>

                    <View style={styles.dateInputCol}>
                      <Text style={styles.dateSubLabel}>اليوم</Text>
                      <TextInput
                        style={styles.dateInput}
                        placeholder="12"
                        placeholderTextColor="#64748b"
                        keyboardType="number-pad"
                        maxLength={2}
                        value={newBirthDay}
                        onChangeText={setNewBirthDay}
                        textAlign="center"
                      />
                    </View>
                  </View>
                </View>

                {/* زر الإتمام والدخول للرئيسية */}
                <Pressable
                  style={[
                    styles.primaryBtn,
                    (!newFullName.trim() || !newBirthYear.trim() || submitting) &&
                      styles.btnDisabled,
                  ]}
                  onPress={handleCompleteRegistration}
                  disabled={!newFullName.trim() || !newBirthYear.trim() || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="rocket" size={18} color="#ffffff" />
                      <Text style={styles.primaryBtnText}>إتمام الدخول إلى الرئيسية 🚀</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}

          </ScrollView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    paddingBottom: 16,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
  },
  stepContainer: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  mainTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  highlightText: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
  },
  phoneInputRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
    overflow: 'hidden',
  },
  dialCodeWrap: {
    width: 85,
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRightWidth: 1,
    borderRightColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialCodeLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  dialCodeInput: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '800',
    padding: 0,
    minWidth: 55,
  },
  localPhoneWrap: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  phoneLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'right',
  },
  phoneInput: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '600',
    paddingVertical: 4,
    letterSpacing: 1,
  },
  countryPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  countryPill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  countryPillActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  countryPillText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  countryPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  carrierChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  carrierChip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  carrierChipActive: {
    backgroundColor: '#0369a1',
    borderColor: '#38bdf8',
  },
  carrierChipText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  carrierChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: '#22c55e',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: '#22c55e',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  otpInputBox: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 16,
  },
  otpInputField: {
    width: 220,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#38bdf8',
    borderRadius: 16,
    color: '#38bdf8',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 16,
    paddingVertical: 12,
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
    marginTop: 12,
  },
  pasteBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  devHintBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  devHintText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  otpOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 18,
    paddingHorizontal: 4,
  },
  timerText: {
    color: '#64748b',
    fontSize: 13,
  },
  resendLinkText: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '700',
  },
  changePhoneText: {
    color: '#38bdf8',
    fontSize: 13,
  },
  verifiedPhoneBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  verifiedPhoneText: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '700',
  },
  fieldWrap: {
    width: '100%',
    marginBottom: 16,
  },
  fieldLabel: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'right',
  },
  textInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateInputsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  dateInputCol: {
    flex: 1,
  },
  dateSubLabel: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 4,
    textAlign: 'center',
  },
  dateInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 10,
  },
});
