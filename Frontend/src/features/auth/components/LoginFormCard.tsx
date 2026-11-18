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
import { rtlFlexDirection, rtlTextAlign } from '@/core/theme/rtl';
import { useSmoothKeyboardOffset } from '@/core/theme/useSmoothKeyboardOffset';
import { getCompositeDeviceFingerprint } from '@/core/security/deviceFingerprint';
import { checkDeviceBinding } from '../api/auth.api';
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

const COUNTRIES: CountryItem[] = [
  {
    code: 'EG',
    nameAr: 'مصر',
    flag: '🇪🇬',
    dialCode: '+20',
    placeholder: '01012345678',
    maxLength: 11,
    minLength: 10,
    validate: (n) =>
      (n.length === 11 && (n.startsWith('010') || n.startsWith('011') || n.startsWith('012') || n.startsWith('015'))) ||
      (n.length === 10 && (n.startsWith('10') || n.startsWith('11') || n.startsWith('12') || n.startsWith('15'))),
    format: (n) => (n.length === 10 && !n.startsWith('0') ? '0' + n : n),
    errorMessage: 'يرجى إدخال رقم هاتف مصري صحيح (11 رقماً ويبدأ بـ 010 أو 011 أو 012 أو 015).',
  },
  {
    code: 'SA',
    nameAr: 'المملكة العربية السعودية',
    flag: '🇸🇦',
    dialCode: '+966',
    placeholder: '0501234567',
    maxLength: 10,
    minLength: 9,
    validate: (n) => (n.length === 10 && n.startsWith('05')) || (n.length === 9 && n.startsWith('5')),
    format: (n) => (n.startsWith('0') ? n.substring(1) : n),
    errorMessage: 'يرجى إدخال رقم جوال سعودي صحيح (يبدأ بـ 05 ويتكون من 10 أرقام).',
  },
  {
    code: 'AE',
    nameAr: 'الإمارات العربية المتحدة',
    flag: '🇦🇪',
    dialCode: '+971',
    placeholder: '0501234567',
    maxLength: 10,
    minLength: 9,
    validate: (n) => (n.length === 10 && n.startsWith('05')) || (n.length === 9 && n.startsWith('5')),
    format: (n) => (n.startsWith('0') ? n.substring(1) : n),
    errorMessage: 'يرجى إدخال رقم هاتف إماراتي صحيح (يبدأ بـ 05).',
  },
  {
    code: 'KW',
    nameAr: 'الكويت',
    flag: '🇰🇼',
    dialCode: '+965',
    placeholder: '51234567',
    maxLength: 8,
    minLength: 8,
    validate: (n) => n.length === 8 && /^[569]/.test(n),
    errorMessage: 'يرجى إدخال رقم هاتف كويتي صحيح (8 أرقام).',
  },
  {
    code: 'QA',
    nameAr: 'قطر',
    flag: '🇶🇦',
    dialCode: '+974',
    placeholder: '33123456',
    maxLength: 8,
    minLength: 8,
    validate: (n) => n.length === 8 && /^[3567]/.test(n),
    errorMessage: 'يرجى إدخال رقم هاتف قطري صحيح (8 أرقام).',
  },
  {
    code: 'BH',
    nameAr: 'البحرين',
    flag: '🇧🇭',
    dialCode: '+973',
    placeholder: '39123456',
    maxLength: 8,
    minLength: 8,
    validate: (n) => n.length === 8 && /^[36]/.test(n),
    errorMessage: 'يرجى إدخال رقم هاتف بحريني صحيح (8 أرقام).',
  },
  {
    code: 'OM',
    nameAr: 'سلطنة عُمان',
    flag: '🇴🇲',
    dialCode: '+968',
    placeholder: '91234567',
    maxLength: 8,
    minLength: 8,
    validate: (n) => n.length === 8 && /^[79]/.test(n),
    errorMessage: 'يرجى إدخال رقم هاتف عُماني صحيح (8 أرقام).',
  },
  {
    code: 'JO',
    nameAr: 'الأردن',
    flag: '🇯🇴',
    dialCode: '+962',
    placeholder: '0791234567',
    maxLength: 10,
    minLength: 9,
    validate: (n) => (n.length === 10 && n.startsWith('07')) || (n.length === 9 && n.startsWith('7')),
    errorMessage: 'يرجى إدخال رقم هاتف أردني صحيح (يبدأ بـ 07).',
  },
  {
    code: 'IQ',
    nameAr: 'العراق',
    flag: '🇮🇶',
    dialCode: '+964',
    placeholder: '07701234567',
    maxLength: 11,
    minLength: 10,
    validate: (n) => (n.length === 11 && n.startsWith('07')) || (n.length === 10 && n.startsWith('7')),
    errorMessage: 'يرجى إدخال رقم هاتف عراقي صحيح (يبدأ بـ 07).',
  },
  {
    code: 'PS',
    nameAr: 'فلسطين',
    flag: '🇵🇸',
    dialCode: '+970',
    placeholder: '0599123456',
    maxLength: 10,
    minLength: 9,
    validate: (n) => (n.length === 10 && n.startsWith('05')) || (n.length === 9 && n.startsWith('5')),
    errorMessage: 'يرجى إدخال رقم هاتف فلسطيني صحيح.',
  },
  {
    code: 'LY',
    nameAr: 'ليبيا',
    flag: '🇱🇾',
    dialCode: '+218',
    placeholder: '0911234567',
    maxLength: 10,
    minLength: 9,
    validate: (n) => (n.length === 10 && n.startsWith('09')) || (n.length === 9 && n.startsWith('9')),
    errorMessage: 'يرجى إدخال رقم هاتف ليبي صحيح (يبدأ بـ 09).',
  },
  {
    code: 'SD',
    nameAr: 'السودان',
    flag: '🇸🇩',
    dialCode: '+249',
    placeholder: '0912345678',
    maxLength: 10,
    minLength: 9,
    validate: (n) => (n.length === 10 && n.startsWith('09')) || (n.length === 9 && n.startsWith('9')),
    errorMessage: 'يرجى إدخال رقم هاتف سوداني صحيح.',
  },
  {
    code: 'YE',
    nameAr: 'اليمن',
    flag: '🇾🇪',
    dialCode: '+967',
    placeholder: '771234567',
    maxLength: 9,
    minLength: 9,
    validate: (n) => n.length === 9 && /^[7]/.test(n),
    errorMessage: 'يرجى إدخال رقم هاتف يمني صحيح (9 أرقام يبدأ بـ 7).',
  },
  {
    code: 'SY',
    nameAr: 'سوريا',
    flag: '🇸🇾',
    dialCode: '+963',
    placeholder: '0933123456',
    maxLength: 10,
    minLength: 9,
    validate: (n) => (n.length === 10 && n.startsWith('09')) || (n.length === 9 && n.startsWith('9')),
    errorMessage: 'يرجى إدخال رقم هاتف سوري صحيح.',
  },
  {
    code: 'LB',
    nameAr: 'لبنان',
    flag: '🇱🇧',
    dialCode: '+961',
    placeholder: '03123456',
    maxLength: 8,
    minLength: 7,
    errorMessage: 'يرجى إدخال رقم هاتف لبناني صحيح (7-8 أرقام).',
  },
  {
    code: 'TN',
    nameAr: 'تونس',
    flag: '🇹🇳',
    dialCode: '+216',
    placeholder: '20123456',
    maxLength: 8,
    minLength: 8,
    errorMessage: 'يرجى إدخال رقم هاتف تونسي صحيح (8 أرقام).',
  },
  {
    code: 'DZ',
    nameAr: 'الجزائر',
    flag: '🇩🇿',
    dialCode: '+213',
    placeholder: '0551234567',
    maxLength: 10,
    minLength: 9,
    errorMessage: 'يرجى إدخال رقم هاتف جزائري صحيح.',
  },
  {
    code: 'MA',
    nameAr: 'المغرب',
    flag: '🇲🇦',
    dialCode: '+212',
    placeholder: '0612345678',
    maxLength: 10,
    minLength: 9,
    errorMessage: 'يرجى إدخال رقم هاتف مغربي صحيح.',
  },
  {
    code: 'US',
    nameAr: 'أمريكا / كندا',
    flag: '🇺🇸',
    dialCode: '+1',
    placeholder: '2025550123',
    maxLength: 10,
    minLength: 10,
    errorMessage: 'يرجى إدخال رقم هاتف أمريكي صحيح (10 أرقام).',
  },
  {
    code: 'GB',
    nameAr: 'المملكة المتحدة',
    flag: '🇬🇧',
    dialCode: '+44',
    placeholder: '7911123456',
    maxLength: 11,
    minLength: 10,
    errorMessage: 'يرجى إدخال رقم هاتف بريطاني صحيح.',
  },
  {
    code: 'TR',
    nameAr: 'تركيا',
    flag: '🇹🇷',
    dialCode: '+90',
    placeholder: '5321234567',
    maxLength: 10,
    minLength: 10,
    errorMessage: 'يرجى إدخال رقم هاتف تركي صحيح (10 أرقام).',
  },
  {
    code: 'DE',
    nameAr: 'ألمانيا',
    flag: '🇩🇪',
    dialCode: '+49',
    placeholder: '1511234567',
    maxLength: 11,
    minLength: 10,
    errorMessage: 'يرجى إدخال رقم هاتف ألماني صحيح.',
  },
  {
    code: 'FR',
    nameAr: 'فرنسا',
    flag: '🇫🇷',
    dialCode: '+33',
    placeholder: '612345678',
    maxLength: 10,
    minLength: 9,
    errorMessage: 'يرجى إدخال رقم هاتف فرنسي صحيح.',
  },
  {
    code: 'IT',
    nameAr: 'إيطاليا',
    flag: '🇮🇹',
    dialCode: '+39',
    placeholder: '3201234567',
    maxLength: 10,
    minLength: 10,
    errorMessage: 'يرجى إدخال رقم هاتف إيطالي صحيح.',
  },
  {
    code: 'OTHER',
    nameAr: 'دولة أخرى (رمز دولي مخصص)',
    flag: '🌐',
    dialCode: '+',
    placeholder: 'رقم الهاتف مع كود الدولة',
    maxLength: 15,
    minLength: 7,
    errorMessage: 'يرجى إدخال رقم هاتف دولي حقيقي وصحيح.',
  },
];

/**
 * فحص صارم لمنع الأرقام الزائفة والتسلسلات الوهمية (Anti-Fake Heuristics)
 */
function isLegitPhoneNumber(num: string): boolean {
  if (!num || num.length < 7 || num.length > 15) return false;
  // منع الأرقام المتطابقة بالكامل (مثل 00000000 أو 11111111)
  if (/^(\d)\1+$/.test(num)) return false;
  // منع التسلسلات الساذجة تصاعدياً أو تنازلياً
  const asc = '0123456789012345';
  const desc = '9876543210987654';
  if (asc.includes(num) || desc.includes(num)) return false;
  // يجب أن يحتوي الرقم على 3 أرقام فريدة ومختلفة على الأقل
  const unique = new Set(num.split('')).size;
  if (unique < 3) return false;
  return true;
}

/**
 * التحقق الشامل من صحة الرقم بناءً على قواعد الدولة وهيكلية الأرقام الحقيقية
 */
function validatePhoneNumber(country: CountryItem, rawPhone: string): { valid: boolean; error?: string } {
  const clean = rawPhone.replace(/[^0-9]/g, '');
  if (!clean) {
    return { valid: false, error: 'يرجى تحديد أو إدخال رقم الهاتف المحمول.' };
  }

  // 1. فحص واقعية الرقم لمنع الحسابات الوهمية
  if (!isLegitPhoneNumber(clean)) {
    return {
      valid: false,
      error: 'يرجى إدخال رقم هاتف حقيقي (الأرقام المكررة أو المتسلسلة غير مقبولة).',
    };
  }

  // 2. التحقق الخاص بالدولة
  if (country.validate && !country.validate(clean)) {
    return {
      valid: false,
      error: country.errorMessage || 'رقم الهاتف غير متوافق مع صيغة أرقام الدولة المختارة.',
    };
  }

  // 3. التحقق من الحدود الدنيا والقصوى للأرقام
  if (clean.length < country.minLength || clean.length > country.maxLength) {
    return {
      valid: false,
      error:
        country.errorMessage ||
        `رقم الهاتف يجب أن يتكون من ${country.minLength} إلى ${country.maxLength} أرقام.`,
    };
  }

  return { valid: true };
}

/**
 * توحيد صيغة حفظ الرقم ومطابقته بدقة:
 * - مصر: 01xxxxxxxxx (للتوافق 100% مع الحسابات القائمة وقواعد بيانات السيرفر)
 * - باقي دول العالم: بالصيغة الدولية الكاملة E.164 مع مفتاح الدولة (مثل +966501234567)
 */
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
    area: string,
    email?: string
  ) => Promise<{ ok: boolean; error?: string; code?: string }>;
  onTriggerBiometric?: () => void;
}

export function LoginFormCard({
  onLoginSubmit,
  onRegisterSubmit,
  onTriggerBiometric,
}: LoginFormCardProps) {
  const { boundCitizen } = useAuth();
  const keyboardOffset = useSmoothKeyboardOffset(Platform.OS === 'android' ? 14 : 0);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('EG');
  const [showCountryPicker, setShowCountryPicker] = useState<boolean>(false);
  const [countrySearch, setCountrySearch] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [checkingDevice, setCheckingDevice] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const activeCountry =
    COUNTRIES.find((c) => c.code === selectedCountryCode) || COUNTRIES[0];

  const filteredCountries = COUNTRIES.filter((c) => {
    if (!countrySearch.trim()) return true;
    const q = countrySearch.trim().toLowerCase();
    return (
      c.nameAr.toLowerCase().includes(q) ||
      c.dialCode.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  });

  // موديولا الهاتف المسجل مسبقاً
  const [showAlreadyRegisteredModal, setShowAlreadyRegisteredModal] = useState<boolean>(false);

  const phoneInputRef = useRef<any>(null);
  const emailInputRef = useRef<any>(null);
  const passwordInputRef = useRef<any>(null);
  const confirmPasswordInputRef = useRef<any>(null);

  const handlePhoneChange = (text: string) => {
    // الكشف الذكي التلقائي عند لصق أو إدخال رقم بكود الدولة (مثل +966 أو 00966 أو +20)
    if (text.startsWith('+') || text.startsWith('00')) {
      const stripped = text.startsWith('+') ? text.substring(1) : text.substring(2);
      const matched = COUNTRIES.find(
        (c) => c.code !== 'OTHER' && stripped.startsWith(c.dialCode.replace('+', ''))
      );
      if (matched) {
        setSelectedCountryCode(matched.code);
        const national = stripped.substring(matched.dialCode.replace('+', '').length);
        setPhone(national);
        setErrorText(null);
        return;
      }
    }

    const clean = text.replace(/[^0-9]/g, '');

    // الكشف الذكي بين مصر والسعودية في حال كتابة الأنماط المحلية
    if (clean.startsWith('05') && clean.length >= 3 && selectedCountryCode === 'EG') {
      setSelectedCountryCode('SA');
    } else if (clean.startsWith('01') && clean.length >= 3 && selectedCountryCode === 'SA') {
      setSelectedCountryCode('EG');
    }

    setPhone(clean);
    setErrorText(null);
  };

  const handleSwitchToLogin = () => {
    setShowAlreadyRegisteredModal(false);
    setMode('login');
    setRegisterStep(1);
    setErrorText(null);
    setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 200);
  };

  const handleSwitchToRegister = () => {
    setMode('register');
    setRegisterStep(1);
    setErrorText(null);
    setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 200);
  };

  const handleStep1Continue = async () => {
    Keyboard.dismiss();
    setErrorText(null);

    const validation = validatePhoneNumber(activeCountry, phone);
    if (!validation.valid) {
      setErrorText(validation.error || 'يرجى إدخال رقم هاتف صحيح.');
      return;
    }

    const fullPhone = getFullFormattedPhone(activeCountry, phone);

    // 1. فحص محلي
    if (boundCitizen) {
      setShowAlreadyRegisteredModal(true);
      return;
    }

    // 2. فحص السيرفر للتأكد من بصمة الجهاز ورقم الشريحة
    try {
      setCheckingDevice(true);
      const fp = await getCompositeDeviceFingerprint();
      const serverCheck = await checkDeviceBinding(fp, fullPhone);
      if (serverCheck.bound) {
        setShowAlreadyRegisteredModal(true);
        return;
      }
    } catch (e) {
      console.warn('[LoginFormCard] SIM check failed:', e);
    } finally {
      setCheckingDevice(false);
    }

    // الانتقال للخطوة 2 بنجاح
    setRegisterStep(2);
    setErrorText(null);
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setErrorText(null);

    if (mode === 'login') {
      const validation = validatePhoneNumber(activeCountry, phone);
      if (!validation.valid) {
        setErrorText(validation.error || 'يرجى إدخال رقم هاتف صحيح.');
        return;
      }
      if (!password) {
        setErrorText('يرجى إدخال كلمة السر.');
        return;
      }
      const fullPhone = getFullFormattedPhone(activeCountry, phone);
      setSubmitting(true);
      const result = await onLoginSubmit(fullPhone, password, true);
      setSubmitting(false);
      if (!result.ok && result.error) {
        setErrorText(result.error);
      }
      return;
    }

    // إنشاء حساب جديد - الخطوة 1
    if (registerStep === 1) {
      await handleStep1Continue();
      return;
    }

    // إنشاء حساب جديد - الخطوة 2
    if (!fullName.trim()) {
      setErrorText('يرجى إدخال الاسم بالكامل.');
      return;
    }
    if (fullName.trim().split(' ').length < 2) {
      setErrorText('يرجى إدخال الاسم ثنائياً على الأقل.');
      return;
    }
    if (email.trim() && !email.includes('@')) {
      setErrorText('يرجى كتابة بريد إلكتروني صحيح أو تركه فارغاً.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorText('يرجى إدخال كلمة سر لا تقل عن ٦ أحرف أو أرقام.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorText('كلمة السر وتأكيد كلمة السر غير متطابقين.');
      return;
    }

    const fullPhone = getFullFormattedPhone(activeCountry, phone);

    setSubmitting(true);
    const result = await onRegisterSubmit(
      fullName.trim(),
      fullPhone,
      password,
      'المنشية',
      email.trim() || undefined
    );
    setSubmitting(false);

    if (!result.ok) {
      if (
        result.code === 'PHONE_ALREADY_EXISTS' ||
        result.code === 'DEVICE_ALREADY_BOUND' ||
        (result.error && (result.error.includes('مسجل') || result.error.includes('مقترن')))
      ) {
        setShowAlreadyRegisteredModal(true);
      } else if (result.error) {
        setErrorText(result.error);
      }
    }
  };

  return (
    <View style={styles.card}>
      {/* عنوان الشاشة */}
      <Text style={styles.formTitle}>
        {mode === 'register' ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
      </Text>

      {/* مؤشر الخطوات في حالة إنشاء حساب جديد */}
      {mode === 'register' ? (
        <View style={styles.stepperContainer}>
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                styles.stepCircleActive,
                registerStep > 1 && styles.stepCircleDone,
              ]}>
              {registerStep > 1 ? (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              ) : (
                <Text style={styles.stepNumberActive}>١</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, styles.stepLabelActive]}>
              رقم الشريحة
            </Text>
          </View>

          <View style={[styles.stepLine, registerStep > 1 && styles.stepLineActive]} />

          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                registerStep === 2 && styles.stepCircleActive,
              ]}>
              <Text
                style={[
                  styles.stepNumber,
                  registerStep === 2 && styles.stepNumberActive,
                ]}>
                ٢
              </Text>
            </View>
            <Text
              style={[
                styles.stepLabel,
                registerStep === 2 && styles.stepLabelActive,
              ]}>
              البيانات الشخصية
            </Text>
          </View>
        </View>
      ) : null}

      {/* رسالة الخطأ البسيطة إن وجدت */}
      {errorText ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={17} color="#DC2626" />
          <Text style={styles.errorText}>{errorText}</Text>
        </View>
      ) : null}

      {/* ========================================================
          حالة 1: تسجيل الدخول (Login)
          ======================================================== */}
      {mode === 'login' ? (
        <>
          {/* حقل رقم الموبايل */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>رقم الموبايل</Text>
            <View style={styles.phoneInputRow}>
              <Pressable
                style={styles.countryBadge}
                onPress={() => setShowCountryPicker(true)}
                hitSlop={8}>
                <Text style={styles.flagEmoji}>{activeCountry.flag}</Text>
                <Text style={styles.countryCode}>{activeCountry.dialCode}</Text>
                <Ionicons name="chevron-down" size={12} color="#64748B" style={styles.countryChevron} />
              </Pressable>
              <View style={styles.phoneDivider} />
              <TextInput
                ref={phoneInputRef}
                style={styles.phoneField}
                placeholder={activeCountry.placeholder}
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                importantForAutofill="yes"
                maxLength={activeCountry.maxLength + 2}
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
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>كلمة السر</Text>
            <View style={styles.passwordInputRow}>
              <TextInput
                ref={passwordInputRef}
                style={styles.passwordField}
                placeholder="كلمة السر"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setErrorText(null);
                }}
                selectionColor="#973c00"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeBtn}
                hitSlop={12}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748B"
                />
              </Pressable>
            </View>
          </View>
        </>
      ) : null}

      {/* ========================================================
          حالة 2: إنشاء حساب جديد - الخطوة 1 (اختيار الشريحة ورقم الهاتف)
          ======================================================== */}
      {mode === 'register' && registerStep === 1 ? (
        <>
          <View style={styles.simNoticeCard}>
            <View style={styles.simIconWrap}>
              <Ionicons name="hardware-chip-outline" size={24} color="#973c00" />
            </View>
            <View style={styles.simTextWrap}>
              <Text style={styles.simNoticeTitle}>تأكيد شريحة الهاتف (SIM)</Text>
              <Text style={styles.simNoticeDesc}>
                اختر أو اكتب رقم شريحة الهاتف المربوطة بهذا الجهاز للمتابعة تجنباً للحسابات الزائفة.
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>رقم شريحة الموبايل</Text>
            <View style={styles.phoneInputRow}>
              <Pressable
                style={styles.countryBadge}
                onPress={() => setShowCountryPicker(true)}
                hitSlop={8}>
                <Text style={styles.flagEmoji}>{activeCountry.flag}</Text>
                <Text style={styles.countryCode}>{activeCountry.dialCode}</Text>
                <Ionicons name="chevron-down" size={12} color="#64748B" style={styles.countryChevron} />
              </Pressable>
              <View style={styles.phoneDivider} />
              <TextInput
                ref={phoneInputRef}
                style={styles.phoneField}
                placeholder={activeCountry.placeholder}
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                importantForAutofill="yes"
                maxLength={activeCountry.maxLength + 2}
                value={phone}
                onChangeText={handlePhoneChange}
                selectionColor="#973c00"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>
            <Text style={styles.fieldHelper}>
              💡 يظهر نظام الهاتف رقم الشريحة تلقائياً بضغطة زر عند لمس الحقل.
            </Text>
          </View>
        </>
      ) : null}

      {/* ========================================================
          حالة 3: إنشاء حساب جديد - الخطوة 2 (البيانات الشخصية والبريد)
          ======================================================== */}
      {mode === 'register' && registerStep === 2 ? (
        <>
          {/* كارت تأكيد الشريحة المعتمدة */}
          <View style={styles.confirmedPhonePill}>
            <View style={styles.confirmedPhoneRight}>
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
              <Text style={styles.confirmedPhoneText}>
                الرقم المعتمد: {activeCountry.flag} {getFullFormattedPhone(activeCountry, phone)}
              </Text>
            </View>
            <Pressable
              onPress={() => setRegisterStep(1)}
              style={styles.editPhoneBtn}
              hitSlop={8}>
              <Ionicons name="create-outline" size={15} color="#973c00" />
              <Text style={styles.editPhoneBtnText}>تغيير</Text>
            </Pressable>
          </View>

          {/* حقل الاسم بالكامل */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>الاسم بالكامل</Text>
            <TextInput
              style={styles.textInput}
              placeholder="الاسم الثلاثي أو الرباعي"
              placeholderTextColor="#94A3B8"
              autoComplete="name"
              importantForAutofill="yes"
              value={fullName}
              onChangeText={(t) => {
                setFullName(t);
                setErrorText(null);
              }}
              selectionColor="#973c00"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => emailInputRef.current?.focus()}
            />
          </View>

          {/* حقل البريد الإلكتروني (يتعرف تلقائياً على Google Account) */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>البريد الإلكتروني</Text>
              <Text style={styles.optionalTag}>(اختياري)</Text>
            </View>
            <TextInput
              ref={emailInputRef}
              style={styles.textInput}
              placeholder="example@gmail.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              importantForAutofill="yes"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setErrorText(null);
              }}
              selectionColor="#973c00"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordInputRef.current?.focus()}
            />
            <Text style={styles.fieldHelper}>
              💡 يتعرف الهاتف تلقائياً على بريدك المسجل في الجهاز (Google) بمجرد لمس الحقل.
            </Text>
          </View>

          {/* حقل كلمة السر */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>كلمة السر</Text>
            <View style={styles.passwordInputRow}>
              <TextInput
                ref={passwordInputRef}
                style={styles.passwordField}
                placeholder="٦ أحرف أو أرقام على الأقل"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setErrorText(null);
                }}
                selectionColor="#973c00"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
              />
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeBtn}
                hitSlop={12}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748B"
                />
              </Pressable>
            </View>
          </View>

          {/* حقل تأكيد كلمة السر */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>تأكيد كلمة السر</Text>
            <View style={styles.passwordInputRow}>
              <TextInput
                ref={confirmPasswordInputRef}
                style={styles.passwordField}
                placeholder="أعد إدخال كلمة السر"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  setErrorText(null);
                }}
                selectionColor="#973c00"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <Pressable
                onPress={() => setShowConfirmPassword((prev) => !prev)}
                style={styles.eyeBtn}
                hitSlop={12}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748B"
                />
              </Pressable>
            </View>
          </View>
        </>
      ) : null}

      {/* زر العمل الرئيسي */}
      <Pressable
        style={({ pressed }) => [
          styles.submitBtn,
          pressed && styles.submitBtnPressed,
          (submitting || checkingDevice) && styles.submitBtnDisabled,
        ]}
        onPress={handleSubmit}
        disabled={submitting || checkingDevice}>
        {submitting || checkingDevice ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.submitBtnText}>
            {mode === 'login'
              ? 'تسجيل الدخول'
              : registerStep === 1
              ? 'متابعة للبيانات الشخصية ←'
              : 'إتمام إنشاء الحساب'}
          </Text>
        )}
      </Pressable>

      {/* زر الرجوع للخطوة الأولى في حالة الخطوة الثانية */}
      {mode === 'register' && registerStep === 2 ? (
        <Pressable
          style={styles.backStepBtn}
          onPress={() => setRegisterStep(1)}
          hitSlop={8}>
          <Text style={styles.backStepBtnText}>الرجوع لتعديل رقم الهاتف</Text>
        </Pressable>
      ) : null}

      {/* التبديل بين تسجيل الدخول وإنشاء حساب */}
      <View style={styles.switchWrap}>
        {mode === 'register' ? (
          <Pressable onPress={handleSwitchToLogin} hitSlop={12} style={styles.switchPressable}>
            <Text style={styles.switchText}>
              لديك حساب بالفعل؟ <Text style={styles.switchLink}>تسجيل الدخول</Text>
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSwitchToRegister}
            hitSlop={12}
            style={styles.switchPressable}
            disabled={checkingDevice}>
            <Text style={styles.switchText}>
              ليس لديك حساب؟ <Text style={styles.switchLink}>إنشاء حساب جديد</Text>
            </Text>
          </Pressable>
        )}
      </View>

      {/* زر الدخول بالبصمة إذا كان متاحاً */}
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

      {/* ========================================================
         موديولا الهاتف المسجل مسبقاً (أنيميشن Lottie وتصميم نظيف جداً)
         ======================================================== */}
      <Modal
        visible={showAlreadyRegisteredModal}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowAlreadyRegisteredModal(false);
        }}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            Keyboard.dismiss();
            setShowAlreadyRegisteredModal(false);
          }}>
          <Animated.View
            style={[
              styles.modalSheet,
              { paddingBottom: Animated.add(keyboardOffset, Platform.OS === 'android' ? 24 : 36) },
            ]}>
            <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalInner}>
              <View style={styles.dragHandle} />

              {/* أنيميشن H1e3qC7ucu المطلوبة */}
              <View style={styles.lottieWrap}>
                <LottieView
                  source={require('../../../../assets/json/H1e3qC7ucu.json')}
                  autoPlay
                  loop
                  style={styles.lottieAnim}
                />
              </View>

              <Text style={styles.modalTitle}>هذا الهاتف مسجل مسبقاً</Text>
              <View style={styles.modalTextWrap}>
                <Text style={styles.modalMessageTop}>تم تسجيل هذا الهاتف من قبل</Text>
                <Text style={styles.modalMessageBottom}>
                  يرجى تسجيل الدخول بحسابك تجنباً للحسابات الزائفة
                </Text>
              </View>

              {/* زر واحد مباشر ونظيف لتسجيل الدخول */}
              <Pressable
                style={({ pressed }) => [
                  styles.modalActionBtn,
                  pressed && styles.modalActionBtnPressed,
                ]}
                onPress={handleSwitchToLogin}>
                <Text style={styles.modalActionBtnText}>تسجيل الدخول</Text>
              </Pressable>

              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setShowAlreadyRegisteredModal(false)}
                hitSlop={12}>
                <Text style={styles.modalCancelBtnText}>إلغاء</Text>
              </Pressable>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* ========================================================
          موديولا اختيار الدولة ومفتاح الاتصال
          ======================================================== */}
      <Modal
        visible={showCountryPicker}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => {
          setShowCountryPicker(false);
          setCountrySearch('');
        }}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setShowCountryPicker(false);
            setCountrySearch('');
          }}>
          <Animated.View
            style={[
              styles.countryPickerSheet,
              { paddingBottom: Animated.add(keyboardOffset, Platform.OS === 'android' ? 20 : 32) },
            ]}>
            <Pressable onPress={(e) => e.stopPropagation()} style={styles.countryPickerInner}>
              <View style={styles.dragHandle} />

              <View style={styles.countryPickerHeader}>
                <Text style={styles.countryPickerTitle}>اختر الدولة ومفتاح الاتصال</Text>
                <Pressable
                  onPress={() => {
                    setShowCountryPicker(false);
                    setCountrySearch('');
                  }}
                  hitSlop={12}
                  style={styles.closeModalBtn}>
                  <Ionicons name="close" size={22} color="#64748B" />
                </Pressable>
              </View>

              {/* حقل البحث السريع بالدولة أو كود الاتصال */}
              <View style={styles.countrySearchBox}>
                <Ionicons name="search-outline" size={18} color="#94A3B8" />
                <TextInput
                  style={styles.countrySearchInput}
                  placeholder="ابحث باسم الدولة أو كود الاتصال (+966, مصر...)"
                  placeholderTextColor="#94A3B8"
                  value={countrySearch}
                  onChangeText={setCountrySearch}
                  selectionColor="#973c00"
                  autoCorrect={false}
                />
                {countrySearch ? (
                  <Pressable onPress={() => setCountrySearch('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </Pressable>
                ) : null}
              </View>

              {/* قائمة الدول */}
              <ScrollView
                style={styles.countryList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}>
                {filteredCountries.map((item) => {
                  const isSelected = item.code === activeCountry.code;
                  return (
                    <Pressable
                      key={item.code}
                      style={[
                        styles.countryPickerRow,
                        isSelected && styles.countryPickerRowActive,
                      ]}
                      onPress={() => {
                        setSelectedCountryCode(item.code);
                        setShowCountryPicker(false);
                        setCountrySearch('');
                        setErrorText(null);
                        setTimeout(() => {
                          phoneInputRef.current?.focus();
                        }, 150);
                      }}>
                      <Text style={styles.countryRowFlag}>{item.flag}</Text>
                      <View style={styles.countryRowInfo}>
                        <Text
                          style={[
                            styles.countryRowName,
                            isSelected && styles.countryRowNameActive,
                          ]}>
                          {item.nameAr}
                        </Text>
                      </View>
                      <Text style={styles.countryRowDial}>{item.dialCode}</Text>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={18} color="#973c00" />
                      ) : (
                        <View style={{ width: 18 }} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 16,
  },
  stepperContainer: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#973c00',
    borderColor: '#973c00',
  },
  stepCircleDone: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  stepNumberActive: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 10,
    marginBottom: 18,
  },
  stepLineActive: {
    backgroundColor: '#16A34A',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  simNoticeCard: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  simIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simTextWrap: {
    flex: 1,
  },
  simNoticeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#973c00',
    textAlign: rtlTextAlign,
    marginBottom: 2,
  },
  simNoticeDesc: {
    fontSize: 12,
    color: '#7C2D12',
    lineHeight: 18,
    textAlign: rtlTextAlign,
  },
  fieldHelper: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
    textAlign: rtlTextAlign,
    lineHeight: 16,
  },
  confirmedPhonePill: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  confirmedPhoneRight: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
  },
  confirmedPhoneText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  editPhoneBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 8,
  },
  editPhoneBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#973c00',
  },
  labelRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  optionalTag: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  backStepBtn: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  backStepBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  errorRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
    textAlign: rtlTextAlign,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textAlign: rtlTextAlign,
    marginBottom: 6,
  },
  textInput: {
    height: 48,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0F172A',
    textAlign: rtlTextAlign,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flagEmoji: {
    fontSize: 16,
  },
  countryCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  phoneDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 10,
  },
  phoneField: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'left',
    paddingVertical: 0,
  },
  passwordInputRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    height: 48,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  passwordField: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    textAlign: rtlTextAlign,
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
  },
  submitBtn: {
    backgroundColor: '#973c00',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitBtnPressed: {
    opacity: 0.9,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  switchWrap: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchPressable: {
    paddingVertical: 4,
  },
  switchText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  switchLink: {
    color: '#973c00',
    fontWeight: '800',
  },
  biometricBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    marginTop: 12,
  },
  biometricBtnPressed: {
    backgroundColor: '#F8FAFC',
  },
  biometricBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* موديولا نظيفة وعصرية جداً */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  modalInner: {
    alignItems: 'center',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 14,
  },
  lottieWrap: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  lottieAnim: {
    width: 100,
    height: 100,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalTextWrap: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 4,
    paddingHorizontal: 12,
  },
  modalMessageTop: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  modalMessageBottom: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
  },
  modalActionBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#973c00',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionBtnPressed: {
    opacity: 0.9,
  },
  modalActionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalCancelBtn: {
    marginTop: 10,
    paddingVertical: 8,
  },
  modalCancelBtnText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  countryChevron: {
    marginLeft: 2,
  },
  countryPickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '82%',
    width: '100%',
    paddingTop: 12,
  },
  countryPickerInner: {
    paddingHorizontal: 20,
    maxHeight: 520,
  },
  countryPickerHeader: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  countryPickerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: rtlTextAlign,
  },
  closeModalBtn: {
    padding: 4,
  },
  countrySearchBox: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
    gap: 8,
  },
  countrySearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    textAlign: rtlTextAlign,
    paddingVertical: 0,
  },
  countryList: {
    maxHeight: 360,
  },
  countryPickerRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
    borderRadius: 10,
    gap: 12,
  },
  countryPickerRowActive: {
    backgroundColor: '#FFF7ED',
  },
  countryRowFlag: {
    fontSize: 22,
  },
  countryRowInfo: {
    flex: 1,
  },
  countryRowName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: rtlTextAlign,
  },
  countryRowNameActive: {
    color: '#973c00',
    fontWeight: '800',
  },
  countryRowDial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    direction: 'ltr',
  },
});
