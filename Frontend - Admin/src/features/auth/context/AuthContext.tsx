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
  loginWithPhoneAndPassword,
  registerCitizenAccount,
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
  token: string;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  savedBiometricSession: SavedBiometricDeviceSession | null;
  activityLogs: ActivityEntry[];
  login: (payload: LoginPayload) => Promise<{ ok: boolean; error?: string }>;
  register: (
    payload: RegisterPayload
  ) => Promise<{ ok: boolean; error?: string }>;
  loginWithBiometric: () => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: {
    full_name?: string;
    area?: string;
    avatar_url?: string;
  }) => void;
  toggleBiometric: (enabled: boolean) => void;
  updateVerificationStatus: (status: VerificationStatusType) => void;
}

const ACTIVE_SESSION_STORAGE_KEY = 'elmansheya_active_session_v1';
const BIOMETRIC_STORAGE_KEY = 'elmansheya_biometric_session_v1';
const BIOMETRIC_PREF_KEY = 'elmansheya_biometric_pref_v1';
const LAST_REFRESH_TOKEN_KEY = 'elmansheya_last_refresh_token_v1';
const LAST_ACCESS_TOKEN_KEY = 'elmansheya_last_access_token_v1';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(true);
  const [savedBiometricSession, setSavedBiometricSession] =
    useState<SavedBiometricDeviceSession | null>(null);
  const [lastRefreshToken, setLastRefreshToken] = useState<string>('');
  const [lastAccessToken, setLastAccessToken] = useState<string>('');
  const [activityLogs, setActivityLogs] = useState<ActivityEntry[]>([]);

  // عند فتح التطبيق: تشغيل أنميشن البداية والتحقق الفعلي الدائم من تخزين الجهاز
  useEffect(() => {
    let isMounted = true;

    async function checkPersistedSession() {
      try {
        const [persistedUser, persistedBio, persistedPref, persistedRefresh, persistedAccess] =
          await Promise.all([
            getSecureItem<AuthenticatedUser>(ACTIVE_SESSION_STORAGE_KEY),
            getSecureItem<SavedBiometricDeviceSession>(BIOMETRIC_STORAGE_KEY),
            getSecureItem<{ enabled: boolean }>(BIOMETRIC_PREF_KEY),
            getSecureItem<string>(LAST_REFRESH_TOKEN_KEY),
            getSecureItem<string>(LAST_ACCESS_TOKEN_KEY),
          ]);

        if (!isMounted) return;

        if (persistedRefresh) {
          setLastRefreshToken(persistedRefresh);
        }
        if (persistedAccess) {
          setLastAccessToken(persistedAccess);
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
    setLastAccessToken(res.data.access_token);
    await setSecureItem(ACTIVE_SESSION_STORAGE_KEY, finalUser);
    await setSecureItem(LAST_REFRESH_TOKEN_KEY, res.data.refresh_token);
    await setSecureItem(LAST_ACCESS_TOKEN_KEY, res.data.access_token);

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

  const register = async (payload: RegisterPayload) => {
    const res = await registerCitizenAccount(payload);
    if (!res.ok || !res.data) {
      return { ok: false, error: res.error };
    }

    const persistedPref = await getSecureItem<{ enabled: boolean }>(BIOMETRIC_PREF_KEY);
    const shouldEnableBio = persistedPref ? persistedPref.enabled : true;

    const finalUser: AuthenticatedUser = {
      ...res.data.user,
      biometric_enabled: shouldEnableBio,
    };

    setUser(finalUser);
    setLastRefreshToken(res.data.refresh_token);
    setLastAccessToken(res.data.access_token);
    await setSecureItem(ACTIVE_SESSION_STORAGE_KEY, finalUser);
    await setSecureItem(LAST_REFRESH_TOKEN_KEY, res.data.refresh_token);
    await setSecureItem(LAST_ACCESS_TOKEN_KEY, res.data.access_token);

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
        return { ok: false, error: res.error };
      }

      setUser(res.data.user);
      setLastAccessToken(res.data.access_token);
      setLastRefreshToken(res.data.refresh_token);
      await setSecureItem(ACTIVE_SESSION_STORAGE_KEY, res.data.user);
      await setSecureItem(LAST_ACCESS_TOKEN_KEY, res.data.access_token);
      await setSecureItem(LAST_REFRESH_TOKEN_KEY, res.data.refresh_token);

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
    setLastAccessToken('');
    setLastRefreshToken('');
    clearSecureItem(ACTIVE_SESSION_STORAGE_KEY);
    clearSecureItem(LAST_ACCESS_TOKEN_KEY);
    clearSecureItem(LAST_REFRESH_TOKEN_KEY);
  };

  const updateProfile = (updates: {
    full_name?: string;
    area?: string;
    avatar_url?: string;
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
        token: lastAccessToken || lastRefreshToken,
        isAuthenticated: Boolean(user),
        isBootstrapping,
        savedBiometricSession,
        activityLogs,
        login,
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
