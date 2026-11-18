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

import {
  COUNTRY_BY_CODE,
  DEFAULT_COUNTRY,
  type CountryDialOption,
} from '../data/countries';

export const ONBOARDING_SEEN_KEY = 'elmansheya_has_seen_onboarding_v1';
const OTP_BACKOFF_STORAGE_KEY = 'elmansheya_otp_backoff_v1';

export type { CountryDialOption };
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
  const cleanCode = dialCode.replace(/[^0-9]/g, '') || '20';
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = cleanPhone.substring(1);
  }
  return `+${cleanCode}${cleanPhone}`;
}

export function useWhatsAppAuthFlow() {
  const { loginWithDirectUser } = useAuth();

  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [step, setStep] = useState<AuthStep>('phone');

  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(
    DEFAULT_COUNTRY.code
  );
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
  const cachedFingerprintRef = useRef<string>('');

  const selectedCountry: CountryDialOption =
    COUNTRY_BY_CODE[selectedCountryCode] || DEFAULT_COUNTRY;
  const dialCode = selectedCountry.dialCode;

  const isOtpLocked = wrongOtpAttempts >= 3;
  const hasLeadingZero = phone.startsWith('0');
  const minPhoneLength = selectedCountry.minDigits + (hasLeadingZero ? 1 : 0);
  const maxPhoneLength = selectedCountry.maxDigits + (hasLeadingZero ? 1 : 0);
  const requiredPhoneLength = maxPhoneLength;
  const isPhoneComplete =
    phone.length >= minPhoneLength && phone.length <= maxPhoneLength;
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
    getCompositeDeviceFingerprint().then((fp) => {
      if (active) cachedFingerprintRef.current = fp;
    }).catch(() => {});
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

  const handleSelectCountry = useCallback((countryCode: string) => {
    const nextCountry = COUNTRY_BY_CODE[countryCode] || DEFAULT_COUNTRY;
    setSelectedCountryCode(nextCountry.code);
    setPhone((prev) =>
      prev.slice(0, nextCountry.maxDigits + (prev.startsWith('0') ? 1 : 0))
    );
    setShowCountryPicker(false);
    setErrorText(null);
    setTimeout(() => phoneInputRef.current?.focus(), 150);
  }, []);

  const handlePhoneChange = useCallback(
    (text: string) => {
      const clean = text.replace(/[^0-9]/g, '');
      const maxLen = selectedCountry.maxDigits + (clean.startsWith('0') ? 1 : 0);
      setPhone(clean.slice(0, maxLen));
      setErrorText(null);
    },
    [selectedCountry.maxDigits]
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
      const unitLabel = minPhoneLength <= 10 ? 'أرقام' : 'رقماً';
      const countLabel =
        minPhoneLength === maxPhoneLength
          ? `${minPhoneLength} ${unitLabel}`
          : `من ${minPhoneLength} إلى ${maxPhoneLength} أرقام`;
      const zeroHint = hasLeadingZero ? ' عند البدء بـ 0' : ' بدون 0 في البداية';
      setErrorText(
        `يرجى إكمال رقم الهاتف لدولة ${selectedCountry.nameAr} (${countLabel}${zeroHint}).`
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
      const fp = cachedFingerprintRef.current || (await getCompositeDeviceFingerprint());
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
    hasLeadingZero,
    isPhoneComplete,
    maxPhoneLength,
    minPhoneLength,
    phone,
    resendTimer,
    selectedCountry.nameAr,
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
    selectedCountry,
    dialCode,
    phone,
    showCountryPicker,
    setShowCountryPicker,
    otpCode,
    setOtpCode,
    resendTimer,
    isOtpLocked,
    minPhoneLength,
    maxPhoneLength,
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
    handleSelectCountry,
    handlePhoneChange,
    handleSendWhatsAppOtp,
    handleVerifyOtp,
    handleCompleteRegistration,
    handleBackStep,
    handleReturnToOtp,
  };
}
