import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import React, { memo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { APP_THEME } from '@/core/theme/colors';
import {
  NotificationSectionKey,
  VillageNotificationItem,
} from '../types/notifications.types';

const SECTION_META: Record<
  Exclude<NotificationSectionKey, 'all'>,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  news: { icon: 'newspaper-outline', color: '#973c00', bg: '#FFF7ED' },
  reports: { icon: 'megaphone-outline', color: '#B45309', bg: '#FEF3C7' },
  craftsmen: { icon: 'construct-outline', color: '#047857', bg: '#ECFDF5' },
  services: { icon: 'grid-outline', color: '#0369A1', bg: '#E0F2FE' },
  general: { icon: 'notifications-outline', color: '#973c00', bg: '#FFF7ED' },
};

interface NotificationsModalProps {
  visible: boolean;
  notifications: VillageNotificationItem[];
  loading: boolean;
  onSelectItem: (item: VillageNotificationItem) => void;
  onClearAll: () => void;
  onClose: () => void;
}

export const NotificationsModal = memo(function NotificationsModal({
  visible,
  notifications,
  loading,
  onSelectItem,
  onClearAll,
  onClose,
}: NotificationsModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable
          style={[
            styles.bottomSheetBox,
            notifications.length === 0 && styles.bottomSheetBoxEmpty,
          ]}
          onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetDragBar} />

          {loading && notifications.length === 0 ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={APP_THEME.primary} />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyNotifBox}>
              <LottieView
                source={require('../../../../assets/json/btXbjDx6qo.json')}
                autoPlay
                loop
                style={styles.emptyNotifLottie}
              />
              <Text style={styles.emptyNotifTitle} numberOfLines={1}>
                لا توجد إشعارات جديدة حالياً
              </Text>
              <Text style={styles.emptyNotifSub} numberOfLines={1}>
                ستصلك التنبيهات فور نشر أخبار أو إضافات جديدة بالقرية
              </Text>
            </View>
          ) : (
            <>
              <ScrollView
                style={styles.notifScrollArea}
                contentContainerStyle={styles.notifListWrap}
                showsVerticalScrollIndicator={false}>
                {notifications.map((n) => {
                  const meta = SECTION_META[n.section] || SECTION_META.general;
                  return (
                    <Pressable
                      key={n.id}
                      style={styles.notifItemCard}
                      onPress={() => onSelectItem(n)}>
                      <View style={styles.notifItemTextCol}>
                        <View style={styles.notifItemTopRow}>
                          <Text style={styles.notifItemTime}>{n.time_ar}</Text>
                          <View
                            style={[
                              styles.sectionTag,
                              { backgroundColor: meta.bg },
                            ]}>
                            <Text
                              style={[
                                styles.sectionTagText,
                                { color: meta.color },
                              ]}>
                              {n.section_ar}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.notifItemTitle} numberOfLines={2}>
                          {n.title}
                        </Text>

                        <Text style={styles.notifItemBody} numberOfLines={2}>
                          {n.body}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.notifItemIconWrap,
                          { backgroundColor: meta.bg },
                        ]}>
                        <Ionicons
                          name={meta.icon}
                          size={18}
                          color={meta.color}
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Pressable style={styles.clearNotifsBtn} onPress={onClearAll}>
                <Text style={styles.clearNotifsBtnText}>تحديد الكل كمقروء</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  bottomSheetBox: {
    width: '100%',
    maxHeight: '75%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'android' ? 28 : 40,
  },
  bottomSheetBoxEmpty: {
    paddingTop: 8,
    paddingBottom: Platform.OS === 'android' ? 30 : 40,
  },
  sheetDragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 10,
  },
  loadingWrap: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyNotifLottie: {
    width: 96,
    height: 96,
  },
  emptyNotifBox: {
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  emptyNotifTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptyNotifSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
  },
  notifScrollArea: {
    maxHeight: 400,
  },
  notifListWrap: {
    width: '100%',
    gap: 8,
    paddingTop: 2,
    paddingBottom: 4,
  },
  notifItemCard: {
    width: '100%',
    direction: 'ltr',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notifItemIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notifItemTextCol: {
    flex: 1,
    direction: 'ltr',
    alignItems: 'flex-end',
    gap: 4,
  },
  notifItemTopRow: {
    direction: 'ltr',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  sectionTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  sectionTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  notifItemTitle: {
    width: '100%',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'right',
  },
  notifItemTime: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'left',
  },
  notifItemBody: {
    width: '100%',
    fontSize: 12.5,
    color: '#475569',
    textAlign: 'right',
    lineHeight: 19,
  },
  clearNotifsBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  clearNotifsBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: APP_THEME.primary,
  },
});
