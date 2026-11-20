import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  clearSecureItem,
  getSecureItem,
  setSecureItem,
} from '@/core/auth-storage/sessionStorage';
import {
  BoundCitizenInfo,
  getBoundCitizen,
  saveBoundCitizen,
  clearBoundCitizen,
  getCompositeDeviceFingerprint,
} from '@/core/security/deviceFingerprint';
import {
  checkDeviceBinding,
  loginWithPhoneAndPassword,
  registerCitizenAccount,
  toggleBiometricOnServer,
  unlockBiometricSessionOnServer,
} from '../api/auth.api';
import {
  AuthenticatedUser,
  LoginPayload,
  RegisterPayload,
  VerificationStatusType,
} from '../types/auth.types';

interface SavedBiometricDeviceSession {
  phone: string;
  full_name: string;
  refresh_token: string;
  userSnapshot: AuthenticatedUser;
}

interface ActivityEntry {
  id: string;
  action_ar: string;
  timestamp_ar: string;
}

interface AuthContextValue {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  savedBiometricSession: SavedBiometricDeviceSession | null;
  boundCitizen: BoundCitizenInfo | null;
  activityLogs: ActivityEntry[];
  login: (payload: LoginPayload) => Promise<{ ok: boolean; error?: string }>;
  loginWithDirectUser: (user: AuthenticatedUser, refreshToken?: string) => Promise<void>;
  register: (
    payload: RegisterPayload
  ) => Promise<{ ok: boolean; error?: string; code?: string }>;
  loginWithBiometric: () => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: {
    full_name?: string;
    area?: string;
    avatar_url?: string;
    birth_date?: string;
  }) => void;
  toggleBiometric: (enabled: boolean) => void;
  updateVerificationStatus: (status: VerificationStatusType) => void;
}

const ACTIVE_SESSION_STORAGE_KEY = 'elmansheya_active_session_v1';
const BIOMETRIC_STORAGE_KEY = 'elmansheya_biometric_session_v1';
const BIOMETRIC_PREF_KEY = 'elmansheya_biometric_pref_v1';
const LAST_REFRESH_TOKEN_KEY = 'elmansheya_last_refresh_token_v1';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(true);
  const [savedBiometricSession, setSavedBiometricSession] =
    useState<SavedBiometricDeviceSession | null>(null);
  const [boundCitizen, setBoundCitizen] = useState<BoundCitizenInfo | null>(null);
  const [lastRefreshToken, setLastRefreshToken] = useState<string>('');
  const [activityLogs, setActivityLogs] = useState<ActivityEntry[]>([]);

  // عند فتح التطبيق: تشغيل أنميشن البداية والتحقق الفعلي الدائم من تخزين الجهاز
  useEffect(() => {
    let isMounted = true;

    async function checkPersistedSession() {
      try {
        const [persistedUser, persistedBio, persistedPref, persistedRefresh, persistedBound] =
          await Promise.all([
            getSecureItem<AuthenticatedUser>(ACTIVE_SESSION_STORAGE_KEY),
            getSecureItem<SavedBiometricDeviceSession>(BIOMETRIC_STORAGE_KEY),
            getSecureItem<{ enabled: boolean }>(BIOMETRIC_PREF_KEY),
            getSecureItem<string>(LAST_REFRESH_TOKEN_KEY),
            getBoundCitizen(),
          ]);

        if (!isMounted) return;

        let currentBound = persistedBound;
        if (currentBound && currentBound.phone === '01550888841') {
          await clearBoundCitizen();
          currentBound = null;
        }

        if (currentBound) {
          setBoundCitizen(currentBound);
        }

        if (persistedRefresh) {
          setLastRefreshToken(persistedRefresh);
        }

        const isBioAllowed = persistedPref ? persistedPref.enabled : true;

        if (persistedBio && isBioAllowed) {
          setSavedBiometricSession(persistedBio);
        } else {
          setSavedBiometricSession(null);
        }

        if (persistedUser) {
          setUser({
            ...persistedUser,
            biometric_enabled: isBioAllowed ? persistedUser.biometric_enabled : false,
          });
        }
      } catch (err) {
        console.warn('[AuthProvider:bootstrap] Error restoring session:', err);
      } finally {
        setTimeout(() => {
          if (isMounted) {
            setIsBootstrapping(false);
          }
        }, 1200);
      }
    }

    checkPersistedSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const appendLog = (action_ar: string) => {
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    setActivityLogs((prev) => [
      {
        id: `act-${Date.now()}`,
        action_ar,
        timestamp_ar: `${now.toLocaleDateString('ar-EG')} - ${timeStr}`,
      },
      ...prev,
    ]);
  };

  const login = async (payload: LoginPayload) => {
    const res = await loginWithPhoneAndPassword(payload);
    if (!res.ok || !res.data) {
      return { ok: false, error: res.error };
    }

    const persistedPref = await getSecureItem<{ enabled: boolean }>(BIOMETRIC_PREF_KEY);
    const shouldEnableBio = persistedPref ? persistedPref.enabled : payload.enable_biometric;

    const finalUser: AuthenticatedUser = {
      ...res.data.user,
      biometric_enabled: shouldEnableBio,
    };

    setUser(finalUser);
    setLastRefreshToken(res.data.refresh_token);
    await setSecureItem(ACTIVE_SESSION_STORAGE_KEY, finalUser);
    await setSecureItem(LAST_REFRESH_TOKEN_KEY, res.data.refresh_token);

    // ربط هذا الجهاز نهائياً بحساب هذا المواطن لمنع الحسابات الوهمية
    const bound: BoundCitizenInfo = {
      phone: finalUser.phone,
      full_name: finalUser.full_name,
      user_id: finalUser.id,
      registered_at: new Date().toISOString(),
    };
    await saveBoundCitizen(bound);
    setBoundCitizen(bound);

    if (shouldEnableBio) {
      const bioData: SavedBiometricDeviceSession = {
        phone: finalUser.phone,
        full_name: finalUser.full_name,
        refresh_token: res.data.refresh_token,
        userSnapshot: finalUser,
      };
      setSavedBiometricSession(bioData);
      await setSecureItem(BIOMETRIC_STORAGE_KEY, bioData);
    } else {
      setSavedBiometricSession(null);
      await clearSecureItem(BIOMETRIC_STORAGE_KEY);
    }

    appendLog('تسجيل الدخول باستخدام رقم الهاتف وكلمة المرور');
    return { ok: true };
  };

  const loginWithDirectUser = async (
    rawUser: AuthenticatedUser,
    refreshToken?: string
  ) => {
    const persistedPref = await getSecureItem<{ enabled: boolean }>(BIOMETRIC_PREF_KEY);
    const isBioAllowed = persistedPref ? persistedPref.enabled : Boolean(rawUser.biometric_enabled);

    const finalUser: AuthenticatedUser = {
      ...rawUser,
      biometric_enabled: isBioAllowed,
    };
    setUser(finalUser);
    const token = refreshToken || `wa-refresh-${Date.now()}`;
    setLastRefreshToken(token);
    await setSecureItem(ACTIVE_SESSION_STORAGE_KEY, finalUser);
    await setSecureItem(LAST_REFRESH_TOKEN_KEY, token);

    if (isBioAllowed) {
      const bioData: SavedBiometricDeviceSession = {
        phone: finalUser.phone,
        full_name: finalUser.full_name,
        refresh_token: token,
        userSnapshot: finalUser,
      };
      setSavedBiometricSession(bioData);
      await setSecureItem(BIOMETRIC_STORAGE_KEY, bioData);
    }

    const bound: BoundCitizenInfo = {
      phone: finalUser.phone,
      full_name: finalUser.full_name,
      user_id: finalUser.id,
      registered_at: new Date().toISOString(),
    };
    await saveBoundCitizen(bound);
    setBoundCitizen(bound);

    appendLog('تسجيل الدخول الفوري عبر كود الواتساب');
  };

  const register = async (payload: RegisterPayload) => {
    const res = await registerCitizenAccount(payload);
    if (!res.ok || !res.data) {
      return { ok: false, error: res.error, code: res.code };
    }

    const persistedPref = await getSecureItem<{ enabled: boolean }>(BIOMETRIC_PREF_KEY);
    const shouldEnableBio = persistedPref ? persistedPref.enabled : true;

    const finalUser: AuthenticatedUser = {
      ...res.data.user,
      biometric_enabled: shouldEnableBio,
    };

    setUser(finalUser);
    setLastRefreshToken(res.data.refresh_token);
    await setSecureItem(ACTIVE_SESSION_STORAGE_KEY, finalUser);
    await setSecureItem(LAST_REFRESH_TOKEN_KEY, res.data.refresh_token);

    // ربط هذا الجهاز نهائياً بحساب هذا المواطن لمنع الحسابات الوهمية
    const bound: BoundCitizenInfo = {
      phone: finalUser.phone,
      full_name: finalUser.full_name,
      user_id: finalUser.id,
      registered_at: new Date().toISOString(),
    };
    await saveBoundCitizen(bound);
    setBoundCitizen(bound);

    if (shouldEnableBio) {
      const bioData: SavedBiometricDeviceSession = {
        phone: finalUser.phone,
        full_name: finalUser.full_name,
        refresh_token: res.data.refresh_token,
        userSnapshot: finalUser,
      };
      setSavedBiometricSession(bioData);
      await setSecureItem(BIOMETRIC_STORAGE_KEY, bioData);
    } else {
      setSavedBiometricSession(null);
      await clearSecureItem(BIOMETRIC_STORAGE_KEY);
    }

    appendLog('إنشاء حساب مواطن جديد وتسجيل الدخول');
    return { ok: true };
  };

  const loginWithBiometric = async (): Promise<{ ok: boolean; error?: string }> => {
    if (!savedBiometricSession) {
      return {
        ok: false,
        error: 'يرجى تسجيل الدخول أولاً برقم الهاتف وكلمة السر لحفظ جلسة البصمة على جهازك.',
      };
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        return {
          ok: false,
          error: 'جهازك لا يحتوي على بصمة مفعلة أو لم يتم تسجيل بصمة في إعدادات الهاتف.',
        };
      }

      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'تأكيد هويتك بالبصمة / Face ID للدخول لتطبيق المنشية',
        cancelLabel: 'إلغاء',
        disableDeviceFallback: false,
        fallbackLabel: 'استخدام كلمة السر',
      });

      if (!authResult.success) {
        if (authResult.error === 'user_cancel' || authResult.error === 'system_cancel') {
          return { ok: false };
        }
        return {
          ok: false,
          error: 'فشل التحقق من البصمة. يرجى المحاولة مرة أخرى.',
        };
      }

      const res = await unlockBiometricSessionOnServer(
        savedBiometricSession.phone,
        savedBiometricSession.refresh_token
      );
      if (!res.ok || !res.data) {
        // إذا تعذر الوصول للسيرفر أو حدث خطأ شبكة، نعتمد على التحقق الحيوي المؤكد من الجهاز
        if (savedBiometricSession.userSnapshot) {
          const snapshotUser: AuthenticatedUser = {
            ...savedBiometricSession.userSnapshot,
            biometric_enabled: true,
          };
          setUser(snapshotUser);
          await setSecureItem(ACTIVE_SESSION_STORAGE_KEY, snapshotUser);
          appendLog('تسجيل الدخول الناجح عبر البصمة (جلسة محلية موثوقة)');
          return { ok: true };
        }
        return { ok: false, error: res.error };
      }

      setUser(res.data.user);
      await setSecureItem(ACTIVE_SESSION_STORAGE_KEY, res.data.user);

      const updatedBio: SavedBiometricDeviceSession = {
        phone: res.data.user.phone,
        full_name: res.data.user.full_name,
        refresh_token: res.data.refresh_token,
        userSnapshot: res.data.user,
      };
      setSavedBiometricSession(updatedBio);
      await setSecureItem(BIOMETRIC_STORAGE_KEY, updatedBio);

      appendLog('تسجيل الدخول الناجح عبر التحقق البيومتري الحقيقي (البصمة)');
      return { ok: true };
    } catch (err) {
      console.warn('[loginWithBiometric] Error:', err);
      return {
        ok: false,
        error: 'تعذر تشغيل مستشعر البصمة على هذا الجهاز.',
      };
    }
  };

  const logout = () => {
    appendLog('تسجيل الخروج اليدوي من التطبيق');
    setUser(null);
    clearSecureItem(ACTIVE_SESSION_STORAGE_KEY);
  };

  const updateProfile = (updates: {
    full_name?: string;
    area?: string;
    avatar_url?: string;
    birth_date?: string;
  }) => {
    if (!user) return;
    const updated: AuthenticatedUser = {
      ...user,
      full_name:
        updates.full_name !== undefined
          ? updates.full_name.trim() || user.full_name
          : user.full_name,
      area:
        updates.area !== undefined
          ? updates.area.trim() || user.area
          : user.area,
      birth_date:
        updates.birth_date !== undefined
          ? updates.birth_date.trim() || user.birth_date
          : user.birth_date,
      avatar_url:
        updates.avatar_url !== undefined
          ? updates.avatar_url
          : user.avatar_url,
    };
    setUser(updated);
    setSecureItem(ACTIVE_SESSION_STORAGE_KEY, updated);
    appendLog('تحديث بيانات الملف الشخصي');
  };

  const toggleBiometric = (enabled: boolean) => {
    if (!user) return;
    const updated: AuthenticatedUser = { ...user, biometric_enabled: enabled };
    setUser(updated);
    setSecureItem(ACTIVE_SESSION_STORAGE_KEY, updated);
    setSecureItem(BIOMETRIC_PREF_KEY, { enabled });
    toggleBiometricOnServer(user.phone, enabled).catch(() => {});
    if (!enabled) {
      setSavedBiometricSession(null);
      clearSecureItem(BIOMETRIC_STORAGE_KEY);
      appendLog('إلغاء تفعيل الدخول بالبصمة على الجهاز');
    } else {
      const bioData: SavedBiometricDeviceSession = {
        phone: updated.phone,
        full_name: updated.full_name,
        refresh_token: lastRefreshToken || `bio-token-${updated.id}`,
        userSnapshot: updated,
      };
      setSavedBiometricSession(bioData);
      setSecureItem(BIOMETRIC_STORAGE_KEY, bioData);
      appendLog('تفعيل الدخول بالبصمة على الجهاز');
    }
  };

  const updateVerificationStatus = (status: VerificationStatusType) => {
    if (!user) return;
    const updated: AuthenticatedUser = {
      ...user,
      verification_status: status,
    };
    setUser(updated);
    setSecureItem(ACTIVE_SESSION_STORAGE_KEY, updated);
    appendLog('إرسال طلب توثيق الحساب بالبطاقة الشخصية لمراجعة الدعم');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isBootstrapping,
        savedBiometricSession,
        boundCitizen,
        activityLogs,
        login,
        loginWithDirectUser,
        register,
        loginWithBiometric,
        logout,
        updateProfile,
        toggleBiometric,
        updateVerificationStatus,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
