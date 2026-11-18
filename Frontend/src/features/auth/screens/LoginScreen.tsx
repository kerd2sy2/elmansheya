import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSecureItem, setSecureItem } from '@/core/auth-storage/sessionStorage';
import { getCompositeDeviceFingerprint } from '@/core/security/deviceFingerprint';
import {
  sendWhatsAppOtp,
  verifyWhatsAppOtp,
  completeWhatsAppRegistration,
} from '../api/auth.api';
import { WelcomeOnboarding } from '../components/WelcomeOnboarding';
import { useAuth } from '../context/AuthContext';

const ONBOARDING_SEEN_KEY = 'elmansheya_has_seen_onboarding_v1';

type AuthStep = 'phone' | 'otp' | 'register_details';

export function LoginScreen() {
  const { loginWithDirectUser } = useAuth();

  // حالة شاشات الترحيب
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  // مرحلة تسجيل الدخول (صفحة كاملة مخصصة)
  const [step, setStep] = useState<AuthStep>('phone');

  // المفتاح وكود الدولة (الافتراضي مصر +20)
  const [dialCode, setDialCode] = useState<string>('+20');
  const [phone, setPhone] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
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

  useEffect(() => {
    let active = true;
    getSecureItem<{ seen: boolean }>(ONBOARDING_SEEN_KEY).then((data) => {
      if (active) {
        setHasSeenOnboarding(Boolean(data?.seen));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // عداد إعادة الإرسال
  useEffect(() => {
    let timer: any = null;
    if (step === 'otp' && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, resendTimer]);

  // لصق آمن من الحافظة دون أي أخطاء
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
    if (step === 'otp') {
      handlePasteFromClipboard();
    }
  }, [step]);

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
        setErrorText(res.error || 'تعذر إرسال كود الواتساب، يرجى مراجعة الرقم.');
        setSubmitting(false);
        return;
      }

      setResendTimer(60);
      setStep('otp');
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } catch {
      setErrorText('تعذر الاتصال بالخادم. تأكد من اتصال الإنترنت.');
    } finally {
      setSubmitting(false);
    }
  };

  // ٢. التحقق من كود الواتساب
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = (codeToVerify ?? otpCode).trim();
    if (!code || code.length < 4) {
      setErrorText('يرجى كتابة رمز التحقق المكون من 4 أرقام.');
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
        setErrorText(res.error || 'كود التحقق غير صحيح، يرجى المحاولة ثانية.');
        setSubmitting(false);
        return;
      }

      // إذا كان مسجلاً من قبل -> دخول فوري إلى الرئيسية
      if (res.is_registered && res.data?.user) {
        await loginWithDirectUser(res.data.user, res.data.refresh_token);
        setSubmitting(false);
        return;
      }

      // إذا كان مستخدماً جديداً -> الانتقال لملء الاسم وتاريخ الميلاد
      setStep('register_details');
      setTimeout(() => nameInputRef.current?.focus(), 300);
    } catch {
      setErrorText('حدث خطأ أثناء فحص الكود، يرجى المحاولة لاحقاً.');
    } finally {
      setSubmitting(false);
    }
  };

  // ٣. إكمال تسجيل حساب جديد
  const handleCompleteRegistration = async () => {
    Keyboard.dismiss();
    setErrorText(null);

    const name = newFullName.trim();
    if (!name || name.split(' ').length < 2) {
      setErrorText('يرجى كتابة الاسم الثنائي أو الثلاثي بالكامل.');
      return;
    }

    const day = newBirthDay.trim().padStart(2, '0');
    const month = newBirthMonth.trim().padStart(2, '0');
    const year = newBirthYear.trim();

    if (!year || year.length !== 4 || parseInt(year, 10) < 1920 || parseInt(year, 10) > 2020) {
      setErrorText('يرجى كتابة سنة ميلاد صحيحة (مثال: 1995).');
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

      await loginWithDirectUser(res.data.user, res.data.refresh_token);
      setSubmitting(false);
    } catch {
      setErrorText('تعذر حفظ البيانات بالخادم.');
      setSubmitting(false);
    }
  };

  // إذا كانت أول مرة للمستخدم -> عرض جولة الترحيب
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
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* شريط علوي أنيق مع زر الرجوع */}
          <View style={styles.topBar}>
            {step !== 'phone' ? (
              <Pressable
                style={styles.backButton}
                onPress={() => {
                  if (step === 'otp') setStep('phone');
                  if (step === 'register_details') setStep('otp');
                  setErrorText(null);
                }}
                hitSlop={12}
              >
                <Ionicons name="arrow-forward" size={22} color="#f8fafc" />
                <Text style={styles.backButtonText}>رجوع</Text>
              </Pressable>
            ) : (
              <View style={styles.headerPill}>
                <View style={styles.greenPulse} />
                <Text style={styles.headerPillText}>بوابة الدخول الآمنة</Text>
              </View>
            )}

            <Pressable
              onPress={() => setHasSeenOnboarding(false)}
              style={styles.tourLink}
              hitSlop={8}
            >
              <Ionicons name="information-circle-outline" size={16} color="#38bdf8" />
              <Text style={styles.tourLinkText}>جولة التطبيق</Text>
            </Pressable>
          </View>

          {/* تنبيه الخطأ */}
          {Boolean(errorText) && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text style={styles.errorText}>{errorText}</Text>
            </View>
          )}

          {/* ===================================================
              المرحلة الأولى: صفحة إدخال رقم الهاتف المخصصة
             =================================================== */}
          {step === 'phone' && (
            <View style={styles.pageCard}>
              <View style={styles.iconCircle}>
                <Ionicons name="phone-portrait-outline" size={40} color="#22c55e" />
              </View>

              <Text style={styles.titleText}>تسجيل الدخول برقم الهاتف</Text>
              <Text style={styles.descText}>
                أدخل رقم هاتفك ليصلك كود التحقق السري فوراً على الواتساب للدخول المباشر.
              </Text>

              {/* بطاقة إدخال المفتاح والرقم */}
              <View style={styles.inputCard}>
                {/* كود الدولة / المفتاح */}
                <View style={styles.dialCodeCol}>
                  <Text style={styles.inputSubLabel}>المفتاح</Text>
                  <TextInput
                    ref={dialCodeInputRef}
                    style={styles.dialCodeInput}
                    value={dialCode}
                    onChangeText={handleDialCodeChange}
                    keyboardType="phone-pad"
                    maxLength={5}
                    textAlign="center"
                  />
                </View>

                {/* رقم الهاتف */}
                <View style={styles.phoneCol}>
                  <Text style={styles.inputSubLabel}>رقم الهاتف</Text>
                  <TextInput
                    ref={phoneInputRef}
                    style={styles.phoneInput}
                    value={phone}
                    onChangeText={handlePhoneChange}
                    placeholder={dialCode === '+20' ? '01012345678' : '501234567'}
                    placeholderTextColor="#64748b"
                    keyboardType="phone-pad"
                    maxLength={15}
                    textAlign="right"
                    returnKeyType="done"
                    onSubmitEditing={handleSendWhatsAppOtp}
                  />
                </View>
              </View>

              {/* أزرار سريعة لاختيار المفتاح الشائع */}
              <View style={styles.quickCountriesRow}>
                {[
                  { label: '🇪🇬 مصر (+20)', code: '+20' },
                  { label: '🇸🇦 السعودية (+966)', code: '+966' },
                  { label: '🇦🇪 الإمارات (+971)', code: '+971' },
                  { label: '🇰🇼 الكويت (+965)', code: '+965' },
                ].map((item) => (
                  <Pressable
                    key={item.code}
                    style={[
                      styles.countryChip,
                      dialCode === item.code && styles.countryChipActive,
                    ]}
                    onPress={() => {
                      setDialCode(item.code);
                      setErrorText(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.countryChipText,
                        dialCode === item.code && styles.countryChipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* شركات المحمول المصرية لو المفتاح +20 */}
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

              {/* زر الإرسال */}
              <Pressable
                style={[
                  styles.primaryButton,
                  (!phone.trim() || submitting) && styles.buttonDisabled,
                ]}
                onPress={handleSendWhatsAppOtp}
                disabled={!phone.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="logo-whatsapp" size={20} color="#ffffff" />
                    <Text style={styles.primaryButtonText}>
                      إرسال كود الدخول عبر واتساب 💬
                    </Text>
                  </>
                )}
              </Pressable>

              <View style={styles.privacyNote}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#64748b" />
                <Text style={styles.privacyNoteText}>
                  خدمة مجانية بالكامل لأهالي المنشية لحماية خصوصية بياناتك
                </Text>
              </View>
            </View>
          )}

          {/* ===================================================
              المرحلة الثانية: صفحة كود التحقق 4 أرقام المخصصة
             =================================================== */}
          {step === 'otp' && (
            <View style={styles.pageCard}>
              <View style={styles.iconCircle}>
                <Ionicons name="chatbubbles-outline" size={40} color="#38bdf8" />
              </View>

              <Text style={styles.titleText}>أدخل كود التحقق</Text>
              <Text style={styles.descText}>
                تم إرسال كود سري إلى واتساب الرقم:{'\n'}
                <Text style={styles.phoneBadgeText}>
                  {getFullInternationalPhone()}
                </Text>
              </Text>

              {/* حقل إدخال الـ 4 أرقام */}
              <View style={styles.otpBoxWrapper}>
                <TextInput
                  ref={otpInputRef}
                  style={styles.otpInputBox}
                  value={otpCode}
                  onChangeText={(val) => {
                    const clean = val.replace(/[^0-9]/g, '');
                    setOtpCode(clean);
                    setErrorText(null);
                    if (clean.length === 4) {
                      handleVerifyOtp(clean);
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="••••"
                  placeholderTextColor="#475569"
                  textAlign="center"
                  autoFocus
                />

                {/* زر سريع للصق الكود من الحافظة */}
                <Pressable
                  style={styles.pasteActionBtn}
                  onPress={handlePasteFromClipboard}
                  hitSlop={8}
                >
                  <Ionicons name="clipboard-outline" size={16} color="#38bdf8" />
                  <Text style={styles.pasteActionBtnText}>
                    لصق الكود المنسوخ من واتساب 📋
                  </Text>
                </Pressable>
              </View>

              {/* زر تأكيد الكود */}
              <Pressable
                style={[
                  styles.primaryButton,
                  (otpCode.length < 4 || submitting) && styles.buttonDisabled,
                ]}
                onPress={() => handleVerifyOtp()}
                disabled={otpCode.length < 4 || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
                    <Text style={styles.primaryButtonText}>تأكيد ومتابعة ✅</Text>
                  </>
                )}
              </Pressable>

              {/* خيارات إعادة الإرسال وتعديل الرقم */}
              <View style={styles.otpFooterRow}>
                {resendTimer > 0 ? (
                  <Text style={styles.timerNotice}>
                    إعادة الإرسال بعد {resendTimer} ثانية
                  </Text>
                ) : (
                  <Pressable onPress={handleSendWhatsAppOtp}>
                    <Text style={styles.resendActiveText}>
                      إعادة إرسال الكود مجدداً 💬
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => {
                    setStep('phone');
                    setOtpCode('');
                    setErrorText(null);
                  }}
                >
                  <Text style={styles.editPhoneLink}>تعديل رقم الهاتف ✏️</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ===================================================
              المرحلة الثالثة: صفحة بيانات المواطن الجديد
             =================================================== */}
          {step === 'register_details' && (
            <View style={styles.pageCard}>
              <View style={styles.iconCircle}>
                <Ionicons name="person-add-outline" size={40} color="#f59e0b" />
              </View>

              <Text style={styles.titleText}>أهلاً بك في عائلة المنشية! 🎉</Text>
              <Text style={styles.descText}>
                تم توثيق هاتفك بنجاح. يرجى إدخال اسمك وتاريخ ميلادك لإتمام الحساب والدخول للرئيسية مباشرة.
              </Text>

              {/* شارة الرقم الموثق */}
              <View style={styles.phoneVerifiedBadge}>
                <Ionicons name="checkmark-done" size={18} color="#22c55e" />
                <Text style={styles.phoneVerifiedBadgeText}>
                  الرقم الموثق: {getFullInternationalPhone()}
                </Text>
              </View>

              {/* الاسم بالكامل */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>الاسم بالكامل (ثنائي أو ثلاثي) *</Text>
                <TextInput
                  ref={nameInputRef}
                  style={styles.formInput}
                  placeholder="مثال: أحمد محمد عبد الله"
                  placeholderTextColor="#64748b"
                  value={newFullName}
                  onChangeText={setNewFullName}
                  textAlign="right"
                />
              </View>

              {/* تاريخ الميلاد */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>تاريخ الميلاد *</Text>
                <View style={styles.dateRow}>
                  <View style={styles.dateCol}>
                    <Text style={styles.dateHint}>السنة</Text>
                    <TextInput
                      style={styles.dateField}
                      placeholder="1995"
                      placeholderTextColor="#64748b"
                      keyboardType="number-pad"
                      maxLength={4}
                      value={newBirthYear}
                      onChangeText={setNewBirthYear}
                      textAlign="center"
                    />
                  </View>

                  <View style={styles.dateCol}>
                    <Text style={styles.dateHint}>الشهر</Text>
                    <TextInput
                      style={styles.dateField}
                      placeholder="05"
                      placeholderTextColor="#64748b"
                      keyboardType="number-pad"
                      maxLength={2}
                      value={newBirthMonth}
                      onChangeText={setNewBirthMonth}
                      textAlign="center"
                    />
                  </View>

                  <View style={styles.dateCol}>
                    <Text style={styles.dateHint}>اليوم</Text>
                    <TextInput
                      style={styles.dateField}
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

              {/* المنطقة داخل القرية */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>المنطقة / الشارع (اختياري)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="مثال: بحري البلد / وسط البلد"
                  placeholderTextColor="#64748b"
                  value={newArea}
                  onChangeText={setNewArea}
                  textAlign="right"
                />
              </View>

              {/* زر الإتمام والدخول */}
              <Pressable
                style={[
                  styles.primaryButton,
                  (!newFullName.trim() || !newBirthYear.trim() || submitting) &&
                    styles.buttonDisabled,
                ]}
                onPress={handleCompleteRegistration}
                disabled={!newFullName.trim() || !newBirthYear.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="rocket-outline" size={20} color="#ffffff" />
                    <Text style={styles.primaryButtonText}>
                      إتمام الدخول إلى الرئيسية 🚀
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0f1d',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  greenPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  headerPillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  backButtonText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  tourLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tourLinkText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14,
    padding: 14,
    width: '100%',
    marginBottom: 20,
    gap: 10,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
  },
  pageCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#131d33',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  titleText: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  descText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  phoneBadgeText: {
    color: '#38bdf8',
    fontWeight: '800',
    fontSize: 16,
  },
  inputCard: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#0a0f1d',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#25334d',
    overflow: 'hidden',
    marginBottom: 16,
  },
  dialCodeCol: {
    width: 95,
    backgroundColor: '#1b263b',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRightWidth: 1.5,
    borderRightColor: '#25334d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneCol: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  inputSubLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
    textAlign: 'center',
  },
  dialCodeInput: {
    color: '#38bdf8',
    fontSize: 18,
    fontWeight: '800',
    padding: 0,
    textAlign: 'center',
  },
  phoneInput: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: 4,
    letterSpacing: 1,
  },
  quickCountriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 16,
  },
  countryChip: {
    backgroundColor: '#1b263b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#25334d',
  },
  countryChipActive: {
    backgroundColor: '#0369a1',
    borderColor: '#38bdf8',
  },
  countryChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  countryChipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  carrierChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 24,
  },
  carrierChip: {
    backgroundColor: '#0a0f1d',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  carrierChipActive: {
    backgroundColor: '#15803d',
    borderColor: '#22c55e',
  },
  carrierChipText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  carrierChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#22c55e',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#22c55e',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#1e293b',
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  privacyNoteText: {
    color: '#64748b',
    fontSize: 12,
  },
  otpBoxWrapper: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 18,
  },
  otpInputBox: {
    width: 240,
    backgroundColor: '#0a0f1d',
    borderWidth: 2,
    borderColor: '#38bdf8',
    borderRadius: 18,
    color: '#38bdf8',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 18,
    paddingVertical: 14,
    textAlign: 'center',
  },
  pasteActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    marginTop: 16,
  },
  pasteActionBtnText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  otpFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 4,
  },
  timerNotice: {
    color: '#64748b',
    fontSize: 13,
  },
  resendActiveText: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '700',
  },
  editPhoneLink: {
    color: '#38bdf8',
    fontSize: 13,
  },
  phoneVerifiedBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  phoneVerifiedBadgeText: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '700',
  },
  formGroup: {
    width: '100%',
    marginBottom: 16,
  },
  formLabel: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'right',
  },
  formInput: {
    backgroundColor: '#0a0f1d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#25334d',
    color: '#f8fafc',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  dateCol: {
    flex: 1,
  },
  dateHint: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 4,
    textAlign: 'center',
  },
  dateField: {
    backgroundColor: '#0a0f1d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#25334d',
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    paddingVertical: 12,
    textAlign: 'center',
  },
});
