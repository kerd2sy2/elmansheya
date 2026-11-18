import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeBottomTabPadding, useSafeTopInset } from '@/core/theme/useSafeTopInset';
import { rtlFlexDirection } from '@/core/theme/rtl';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ADMIN_ROLES_CONFIG, AdminRole } from '@/core/permissions/adminRoles';

interface StaffUser {
  id: string;
  name: string;
  phone: string;
  role: AdminRole;
  isVerified: boolean;
}

const INITIAL_STAFF: StaffUser[] = [
  { id: 'usr-super', name: 'المدير العام (المشرف العام)', phone: '0500626432', role: 'super_admin', isVerified: true },
  { id: 'usr-2', name: 'أ. محمود عبد الرحمن', phone: '01011112233', role: 'admin', isVerified: true },
  { id: 'usr-3', name: 'م. أحمد الشناوي', phone: '01223344556', role: 'media_events_assistant', isVerified: true },
  { id: 'usr-4', name: 'د. مصطفى كامل', phone: '01122334455', role: 'health_humanitarian_assistant', isVerified: true },
  { id: 'usr-5', name: 'أ. طارق عبد السلام', phone: '01099887766', role: 'public_utilities_assistant', isVerified: true },
  { id: 'usr-6', name: 'م. سامح رضوان', phone: '01554433221', role: 'commerce_mobility_assistant', isVerified: true },
];

export function SuperAdminDashboardScreen() {
  const topInset = useSafeTopInset();
  const bottomTabPadding = useSafeBottomTabPadding();
  const { user, logout } = useAuth();
  const [staff, setStaff] = useState<StaffUser[]>(INITIAL_STAFF);

  const isSuperAdmin = user?.role === 'super_admin';

  const toggleVerification = (id: string) => {
    setStaff((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const nextState = !s.isVerified;
          Alert.alert(
            nextState ? '✅ تم التوثيق' : '⚠️ تم إلغاء التوثيق',
            `تم ${nextState ? 'منح الشارة الزرقاء وتوثيق' : 'إلغاء توثيق'} حساب «${s.name}» بنجاح.`
          );
          return { ...s, isVerified: nextState };
        }
        return s;
      })
    );
  };

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج من لوحة التحكم؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تسجيل الخروج', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topInset + 12, paddingBottom: bottomTabPadding + 50 },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* بطاقة حساب المشرف العام الحالي */}
        <View style={styles.superProfileCard}>
          <View style={styles.superProfileRow}>
            <View style={styles.superAvatar}>
              <Text style={styles.superAvatarInitials}>
                {user?.full_name?.slice(0, 2) || 'عم'}
              </Text>
            </View>
            <View style={styles.superTexts}>
              <View style={styles.nameBadgeRow}>
                <Text style={styles.superName}>{user?.full_name || 'المشرف العام'}</Text>
                <Ionicons name="checkmark-circle" size={17} color="#16A34A" />
              </View>
              <Text style={styles.superPhone}>{user?.phone}</Text>
              <View style={styles.superRoleBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#973c00" />
                <Text style={styles.superRoleBadgeText}>
                  {user?.role_name_ar || 'المشرف العام (صلاحية كاملة)'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.superCardFooter}>
            <View style={styles.securityStatus}>
              <Ionicons name="lock-closed" size={14} color="#16A34A" />
              <Text style={styles.securityText}>جلسة مؤمنة ومشفرة PBKDF2</Text>
            </View>
            <Pressable style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={16} color="#DC2626" />
              <Text style={styles.logoutBtnText}>تسجيل الخروج</Text>
            </Pressable>
          </View>
        </View>

        {/* الترويسة الرئيسية */}
        <View style={styles.headerBox}>
          <View style={styles.crownRow}>
            <Ionicons name="ribbon" size={18} color="#D97706" />
            <Text style={styles.crownLabel}>القيادة المركزية وتوزيع الصلاحيات</Text>
          </View>
          <Text style={styles.screenTitle}>إدارة وتوثيق طاقم المشرفين والمساعدين</Text>
          <Text style={styles.screenDesc}>
            يتحكم المشرف العام هنا في شارات التوثيق واختصاصات المساعدين الأربعة لإدارة فروع القرية.
          </Text>
        </View>

        {/* عرض طاقم العمل والصلاحيات */}
        <View style={styles.staffListWrap}>
          {staff.map((item) => {
            const roleInfo = ADMIN_ROLES_CONFIG[item.role];
            const isSuper = item.role === 'super_admin';

            return (
              <View key={item.id} style={styles.staffCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.nameGroup}>
                    <Text style={styles.staffName}>{item.name}</Text>
                    {item.isVerified && (
                      <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                    )}
                  </View>
                  <View style={styles.phoneGroup}>
                    <Ionicons name="call-outline" size={13} color="#64748B" />
                    <Text style={styles.staffPhone}>{item.phone}</Text>
                  </View>
                </View>

                <View style={[styles.roleTag, { backgroundColor: roleInfo.badgeBg }]}>
                  <Text style={[styles.roleTagText, { color: roleInfo.badgeColor }]}>
                    {roleInfo.titleAr}
                  </Text>
                </View>

                <Text style={styles.roleDesc}>{roleInfo.descriptionAr}</Text>

                {!isSuper && (
                  <View style={styles.cardActions}>
                    <Pressable
                      style={[
                        styles.verifyBtn,
                        item.isVerified ? styles.unverifyBtn : styles.verifyBtnActive,
                      ]}
                      onPress={() => toggleVerification(item.id)}>
                      <Ionicons
                        name={item.isVerified ? 'close-circle-outline' : 'shield-checkmark-outline'}
                        size={16}
                        color={item.isVerified ? '#DC2626' : '#FFFFFF'}
                      />
                      <Text
                        style={[
                          styles.verifyBtnText,
                          item.isVerified ? styles.unverifyBtnText : styles.verifyBtnActiveText,
                        ]}>
                        {item.isVerified ? 'سحب التوثيق' : 'منح التوثيق والشارة'}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  superProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  superProfileRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 12,
  },
  superAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  superAvatarInitials: {
    fontSize: 16,
    fontWeight: '800',
    color: '#973c00',
  },
  superTexts: {
    flex: 1,
    alignItems: 'flex-start',
  },
  nameBadgeRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
  },
  superName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  superPhone: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  superRoleBadge: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  superRoleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#973c00',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  superCardFooter: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  securityStatus: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
  },
  securityText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#16A34A',
  },
  logoutBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  headerBox: {
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  crownRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  crownLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  screenTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'right',
  },
  screenDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 4,
    lineHeight: 18,
  },
  staffListWrap: {
    gap: 12,
  },
  staffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'flex-start',
  },
  cardHeader: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  nameGroup: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
  },
  staffName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  phoneGroup: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 4,
  },
  staffPhone: {
    fontSize: 12,
    color: '#64748B',
  },
  roleTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  roleDesc: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'right',
    lineHeight: 18,
    marginBottom: 10,
  },
  cardActions: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    flexDirection: rtlFlexDirection,
    justifyContent: 'flex-end',
  },
  verifyBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  verifyBtnActive: {
    backgroundColor: '#0284C7',
  },
  verifyBtnActiveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  unverifyBtn: {
    backgroundColor: '#FEE2E2',
  },
  unverifyBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  verifyBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
