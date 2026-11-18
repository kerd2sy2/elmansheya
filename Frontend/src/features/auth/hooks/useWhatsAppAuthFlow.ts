import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { getSecureItem, setSecureItem } from '@/core/auth-storage/sessionStorage';
import { getCompositeDeviceFingerprint } from '@/core/security/deviceFingerprint';
import {
  completeWhatsAppRegistration,
  sendWhatsAppOtp,
  verifyWhatsAppOtp,
} from '../api/auth.api';
import { useAuth } from '../context/AuthContext';

export const ONBOARDING_SEEN_KEY = 'elmansheya_has_seen_onboarding_v1';
const OTP_BACKOFF_STORAGE_KEY = 'elmansheya_otp_backoff_v1';

export interface CountryDialOption {
  code: string;
  nameAr: string;
  dialCode: string;
  placeholder: string;
}

export const COUNTRY_OPTIONS: CountryDialOption[] = [
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

export type AuthStep = 'phone' | 'otp' | 'register_details';

export function formatResendWait(sec: number): string {
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
}

export function formatInternationalPhone(dialCode: string, phone: string): string {
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
}

export function useWhatsAppAuthFlow() {
  const { loginWithDirectUser } = useAuth();

  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [step, setStep] = useState<AuthStep>('phone');

  const [dialCode, setDialCode] = useState<string>('+20');
  const [phone, setPhone] = useState<string>('');
  const [showCountryPicker, setShowCountryPicker] = useState<boolean>(false);

  const [otpCode, setOtpCode] = useState<string>('');
  const [lastSentPhone, setLastSentPhone] = useState<string>('');
  const [wrongOtpAttempts, setWrongOtpAttempts] = useState<number>(0);
  const [otpAttemptCount, setOtpAttemptCount] = useState<number>(0);
  const [cooldownEndTime, setCooldownEndTime] = useState<number>(0);
  const [resendTimer, setResendTimer] = useState<number>(0);

  const [newFullName, setNewFullName] = useState<string>('');
  const [newBirthDay, setNewBirthDay] = useState<string>('');
  const [newBirthMonth, setNewBirthMonth] = useState<string>('');
  const [newBirthYear, setNewBirthYear] = useState<string>('');
  const [newArea, setNewArea] = useState<string>('المنشية');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const phoneInputRef = useRef<any>(null);
  const otpInputRef = useRef<any>(null);
  const nameInputRef = useRef<any>(null);

  const isOtpLocked = wrongOtpAttempts >= 3;
  const requiredPhoneLength = phone.startsWith('0') ? 11 : 10;
  const isPhoneComplete = phone.length === requiredPhoneLength;
  const fullInternationalPhone = formatInternationalPhone(dialCode, phone);
  const currentFullPhone = isPhoneComplete ? fullInternationalPhone : '';
  const isSendBatchBlocked =
    (otpAttemptCount >= 3 || wrongOtpAttempts >= 3) && resendTimer > 0;
  const isSamePhoneInCooldown =
    Boolean(lastSentPhone) &&
    currentFullPhone === lastSentPhone &&
    resendTimer > 0;
  const isPhoneSendDisabled =
    !isPhoneComplete || submitting || isSamePhoneInCooldown || isSendBatchBlocked;

  useEffect(() => {
    let active = true;
    getSecureItem<{ seen: boolean }>(ONBOARDING_SEEN_KEY).then((data) => {
      if (active) setHasSeenOnboarding(Boolean(data?.seen));
    });
    getSecureItem<{
      attemptCount?: number;
      cooldownEndTime?: number;
      lastSentPhone?: string;
      wrongOtpAttempts?: number;
    }>(OTP_BACKOFF_STORAGE_KEY).then((data) => {
      if (!active || !data) return;
      const storedAttempts = data.attemptCount || 0;
      const storedWrong = data.wrongOtpAttempts || 0;
      if (data.cooldownEndTime && data.cooldownEndTime > Date.now()) {
        setOtpAttemptCount(storedAttempts);
        setLastSentPhone(data.lastSentPhone || '');
        setWrongOtpAttempts(storedWrong);
        setCooldownEndTime(data.cooldownEndTime);
        setResendTimer(Math.ceil((data.cooldownEndTime - Date.now()) / 1000));
      } else if (storedAttempts >= 3 || storedWrong >= 3) {
        setSecureItem(OTP_BACKOFF_STORAGE_KEY, null);
      } else {
        setOtpAttemptCount(storedAttempts);
        setLastSentPhone(data.lastSentPhone || '');
        setWrongOtpAttempts(storedWrong);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (cooldownEndTime <= 0) {
      if (resendTimer !== 0) setResendTimer(0);
      return;
    }

    const updateRemaining = () => {
      const now = Date.now();
      if (now >= cooldownEndTime) {
        setResendTimer(0);
        setCooldownEndTime(0);
        if (otpAttemptCount >= 3 || wrongOtpAttempts >= 3) {
          setOtpAttemptCount(0);
          setWrongOtpAttempts(0);
          setSecureItem(OTP_BACKOFF_STORAGE_KEY, null);
        }
        return true;
      }
      setResendTimer(Math.ceil((cooldownEndTime - now) / 1000));
      return false;
    };

    if (updateRemaining()) return;
    const timer = setInterval(() => {
      if (updateRemaining()) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownEndTime, otpAttemptCount, wrongOtpAttempts]);

  const handleCompleteOnboarding = useCallback(async () => {
    await setSecureItem(ONBOARDING_SEEN_KEY, { seen: true });
    setHasSeenOnboarding(true);
  }, []);

  const handleDialCodeChange = useCallback((text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    setDialCode(digitsOnly ? `+${digitsOnly}` : '+');
    setErrorText(null);
  }, []);

  const handleSelectCountryDial = useCallback((code: string) => {
    setDialCode(code);
    setShowCountryPicker(false);
    setErrorText(null);
    setTimeout(() => phoneInputRef.current?.focus(), 150);
  }, []);

  const handlePhoneChange = useCallback(
    (text: string) => {
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
    },
    [dialCode]
  );

  const handleVerifyOtp = useCallback(
    async (codeToVerify?: string) => {
      if (wrongOtpAttempts >= 3) return;

      const code = (codeToVerify ?? otpCode).trim();
      if (!code || code.length < 4) {
        setErrorText('يرجى إدخال رمز التحقق المكون من 4 أرقام.');
        return;
      }

      Keyboard.dismiss();
      setErrorText(null);
      setSubmitting(true);

      try {
        const fullPhone = formatInternationalPhone(dialCode, phone);
        const fp = await getCompositeDeviceFingerprint();
        const res = await verifyWhatsAppOtp(fullPhone, code, fp);

        if (!res.ok) {
          const nextWrong = wrongOtpAttempts + 1;
          setWrongOtpAttempts(nextWrong);
          if (nextWrong >= 3) {
            const blockEndTime = Date.now() + 300 * 1000;
            setCooldownEndTime(blockEndTime);
            setResendTimer(300);
            await setSecureItem(OTP_BACKOFF_STORAGE_KEY, {
              attemptCount: otpAttemptCount,
              cooldownEndTime: blockEndTime,
              lastSentPhone,
              wrongOtpAttempts: nextWrong,
            });
            setErrorText('تم إدخال رمز خاطئ 3 مرات. تم إيقاف المحاولات لمدة 5 دقائق.');
          } else {
            await setSecureItem(OTP_BACKOFF_STORAGE_KEY, {
              attemptCount: otpAttemptCount,
              cooldownEndTime,
              lastSentPhone,
              wrongOtpAttempts: nextWrong,
            });
            setErrorText(res.error || 'رمز التحقق غير صحيح، يرجى المحاولة مرة أخرى.');
          }
          setSubmitting(false);
          return;
        }

        setLastSentPhone('');
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
    },
    [
      wrongOtpAttempts,
      otpCode,
      dialCode,
      phone,
      otpAttemptCount,
      cooldownEndTime,
      lastSentPhone,
      loginWithDirectUser,
    ]
  );

  // لصق آمن من الحافظة عند الدخول لشاشة الرمز دون تعطل إذا غابت المكتبة في Expo Go
  useEffect(() => {
    if (step !== 'otp' || wrongOtpAttempts >= 3) return;
    let cancelled = false;
    (async () => {
      try {
        let text = '';
        if (
          Platform.OS === 'web' &&
          typeof navigator !== 'undefined' &&
          navigator.clipboard?.readText
        ) {
          text = await navigator.clipboard.readText();
        } else {
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
        }
        if (cancelled || !text) return;
        const digits = text.replace(/[^0-9]/g, '');
        if (digits.length === 4) {
          setOtpCode(digits);
          setErrorText(null);
          handleVerifyOtp(digits);
        }
      } catch {
        // تجاهل بصمت
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step]);

  const handleSendWhatsAppOtp = useCallback(async () => {
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

    const fullPhone = formatInternationalPhone(dialCode, phone);
    if (resendTimer > 0 && (step === 'otp' || isSendBatchBlocked || fullPhone === lastSentPhone)) {
      setErrorText(`يرجى الانتظار ${formatResendWait(resendTimer)} قبل المحاولة مرة أخرى.`);
      return;
    }

    setSubmitting(true);
    try {
      const fp = await getCompositeDeviceFingerprint();
      const res = await sendWhatsAppOtp(fullPhone, fp);

      if (!res.ok) {
        setErrorText(res.error || 'تعذر إرسال رمز التحقق، يرجى مراجعة الرقم.');
        setSubmitting(false);
        return;
      }

      const nextAttemptCount = (otpAttemptCount >= 3 ? 0 : otpAttemptCount) + 1;
      const cooldownSeconds = nextAttemptCount >= 3 ? 300 : 60;
      const nextEndTime = Date.now() + cooldownSeconds * 1000;

      setOtpCode('');
      setLastSentPhone(fullPhone);
      setWrongOtpAttempts(0);
      setOtpAttemptCount(nextAttemptCount);
      setCooldownEndTime(nextEndTime);
      setResendTimer(cooldownSeconds);
      await setSecureItem(OTP_BACKOFF_STORAGE_KEY, {
        attemptCount: nextAttemptCount,
        cooldownEndTime: nextEndTime,
        lastSentPhone: fullPhone,
        wrongOtpAttempts: 0,
      });

      setStep('otp');
      setTimeout(() => otpInputRef.current?.focus(), 250);
    } catch {
      setErrorText('تعذر الاتصال بالخادم، يرجى التأكد من اتصال الإنترنت.');
    } finally {
      setSubmitting(false);
    }
  }, [
    dialCode,
    isPhoneComplete,
    phone,
    resendTimer,
    step,
    isSendBatchBlocked,
    lastSentPhone,
    otpAttemptCount,
  ]);

  const handleCompleteRegistration = useCallback(async () => {
    Keyboard.dismiss();
    setErrorText(null);

    const name = newFullName.trim();
    if (!name || name.split(/\s+/).length < 2) {
      setErrorText('يرجى إدخال الاسم الثنائي أو الثلاثي بالكامل.');
      return;
    }

    const yearNum = parseInt(newBirthYear.trim(), 10);
    if (
      !newBirthYear.trim() ||
      newBirthYear.trim().length !== 4 ||
      isNaN(yearNum) ||
      yearNum < 1920 ||
      yearNum > 2020
    ) {
      setErrorText('يرجى إدخال سنة ميلاد صحيحة من 4 أرقام (مثال: 1995).');
      return;
    }

    const day = (newBirthDay.trim() || '01').padStart(2, '0');
    const month = (newBirthMonth.trim() || '01').padStart(2, '0');
    const birthDate = `${newBirthYear.trim()}-${month}-${day}`;

    setSubmitting(true);
    try {
      const fullPhone = formatInternationalPhone(dialCode, phone);
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
  }, [dialCode, phone, newFullName, newBirthYear, newBirthMonth, newBirthDay, newArea, loginWithDirectUser]);

  const handleBackStep = useCallback(() => {
    if (step === 'otp') setStep('phone');
    if (step === 'register_details') setStep('otp');
    setErrorText(null);
  }, [step]);

  const handleReturnToOtp = useCallback(() => {
    setErrorText(null);
    setStep('otp');
  }, []);

  return {
    hasSeenOnboarding,
    step,
    dialCode,
    phone,
    showCountryPicker,
    setShowCountryPicker,
    otpCode,
    setOtpCode,
    resendTimer,
    isOtpLocked,
    requiredPhoneLength,
    fullInternationalPhone,
    isSendBatchBlocked,
    isSamePhoneInCooldown,
    isPhoneSendDisabled,
    newFullName,
    setNewFullName,
    newBirthDay,
    setNewBirthDay,
    newBirthMonth,
    setNewBirthMonth,
    newBirthYear,
    setNewBirthYear,
    newArea,
    setNewArea,
    submitting,
    errorText,
    setErrorText,
    phoneInputRef,
    otpInputRef,
    nameInputRef,
    handleCompleteOnboarding,
    handleDialCodeChange,
    handleSelectCountryDial,
    handlePhoneChange,
    handleSendWhatsAppOtp,
    handleVerifyOtp,
    handleCompleteRegistration,
    handleBackStep,
    handleReturnToOtp,
  };
}
