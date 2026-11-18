import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import React, { memo, useMemo } from 'react';
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
import { rtlFlexDirection, rtlTextAlign } from '@/core/theme/rtl';
import {
  NotificationSectionKey,
  VillageNotificationItem,
} from '../types/notifications.types';

const SECTION_CHIPS: ReadonlyArray<{
  key: NotificationSectionKey;
  labelAr: string;
}> = [
  { key: 'all', labelAr: 'الكل' },
  { key: 'news', labelAr: 'الأخبار' },
  { key: 'reports', labelAr: 'البلاغات' },
  { key: 'craftsmen', labelAr: 'الصنايعية' },
  { key: 'services', labelAr: 'الخدمات' },
];

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
  filteredNotifications: VillageNotificationItem[];
  unreadCount: number;
  readIds: string[];
  activeSection: NotificationSectionKey;
  loading: boolean;
  onChangeSection: (section: NotificationSectionKey) => void;
  onRefresh: () => void;
  onSelectItem: (item: VillageNotificationItem) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
}

export const NotificationsModal = memo(function NotificationsModal({
  visible,
  notifications,
  filteredNotifications,
  unreadCount,
  readIds,
  activeSection,
  loading,
  onChangeSection,
  onRefresh,
  onSelectItem,
  onMarkAllAsRead,
  onClose,
}: NotificationsModalProps) {
  const readSet = useMemo(() => new Set(readIds), [readIds]);

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
            filteredNotifications.length === 0 && styles.bottomSheetBoxEmpty,
          ]}
          onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetDragBar} />

          <View style={styles.modalHeaderRow}>
            <View style={styles.modalTitleGroup}>
              <Text style={styles.modalTitle}>إشعارات القرية</Text>
              {unreadCount > 0 ? (
                <View style={styles.unreadHeaderPill}>
                  <Text style={styles.unreadHeaderText}>{unreadCount} جديد</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.headerActionsGroup}>
              <Pressable
                onPress={onRefresh}
                style={styles.refreshChipBtn}
                hitSlop={8}>
                <Ionicons name="refresh" size={16} color={APP_THEME.primary} />
              </Pressable>
              <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
                <Ionicons name="close" size={18} color="#64748B" />
              </Pressable>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScrollContent}
            style={styles.chipsScroll}>
            {SECTION_CHIPS.map((chip) => {
              const active = activeSection === chip.key;
              return (
                <Pressable
                  key={chip.key}
                  style={[styles.sectionChip, active && styles.sectionChipActive]}
                  onPress={() => onChangeSection(chip.key)}>
                  <Text
                    style={[
                      styles.sectionChipText,
                      active && styles.sectionChipTextActive,
                    ]}>
                    {chip.labelAr}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {loading && notifications.length === 0 ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={APP_THEME.primary} />
            </View>
          ) : filteredNotifications.length === 0 ? (
            <View style={styles.emptyNotifBox}>
              <LottieView
                source={require('../../../../assets/json/btXbjDx6qo.json')}
                autoPlay
                loop
                style={styles.emptyNotifLottie}
              />
              <Text style={styles.emptyNotifTitle} numberOfLines={1}>
                لا توجد إشعارات في هذا القسم حالياً
              </Text>
              <Text style={styles.emptyNotifSub} numberOfLines={2}>
                ستصلك التنبيهات تلقائياً فور إضافة خبر أو بلاغ أو صنايعي أو خدمة
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.notifScrollArea}
              contentContainerStyle={styles.notifListWrap}
              showsVerticalScrollIndicator={false}>
              {filteredNotifications.map((n) => {
                const isUnread = !readSet.has(n.id);
                const meta = SECTION_META[n.section] || SECTION_META.general;
                return (
                  <Pressable
                    key={n.id}
                    style={[
                      styles.notifItemCard,
                      isUnread && styles.notifItemCardUnread,
                    ]}
                    onPress={() => onSelectItem(n)}>
                    <View style={styles.notifItemTextCol}>
                      <View style={styles.notifItemTopRow}>
                        <View style={styles.timeUnreadGroup}>
                          <Text style={styles.notifItemTime}>{n.time_ar}</Text>
                          {isUnread ? <View style={styles.unreadDot} /> : null}
                        </View>
                        <View
                          style={[
                            styles.sectionTag,
                            { backgroundColor: meta.bg },
                          ]}>
                          <Text
                            style={[styles.sectionTagText, { color: meta.color }]}>
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
                      <Ionicons name={meta.icon} size={18} color={meta.color} />
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {unreadCount > 0 ? (
            <Pressable style={styles.clearNotifsBtn} onPress={onMarkAllAsRead}>
              <Text style={styles.clearNotifsBtnText}>تحديد الكل كمقروء</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
});

interface IncomingNotificationBannerProps {
  notification: VillageNotificationItem | null;
  topOffset: number;
  onPress: (item: VillageNotificationItem) => void;
  onDismiss: () => void;
}

export const IncomingNotificationBanner = memo(function IncomingNotificationBanner({
  notification,
  topOffset,
  onPress,
  onDismiss,
}: IncomingNotificationBannerProps) {
  if (!notification) return null;
  const meta = SECTION_META[notification.section] || SECTION_META.general;

  return (
    <View style={[styles.bannerWrap, { top: topOffset }]} pointerEvents="box-none">
      <Pressable
        style={styles.bannerCard}
        onPress={() => onPress(notification)}>
        <Pressable onPress={onDismiss} hitSlop={8} style={styles.bannerCloseBtn}>
          <Ionicons name="close" size={16} color="#64748B" />
        </Pressable>

        <View style={styles.bannerTextCol}>
          <Text style={styles.bannerSectionLabel}>
            إشعار جديد • {notification.section_ar}
          </Text>
          <Text style={styles.bannerTitle} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.bannerBody} numberOfLines={1}>
            {notification.body}
          </Text>
        </View>

        <View style={[styles.bannerIconWrap, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheetBox: {
    width: '100%',
    maxHeight: '78%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'android' ? 28 : 40,
  },
  bottomSheetBoxEmpty: {
    paddingBottom: Platform.OS === 'android' ? 24 : 36,
  },
  sheetDragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeaderRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitleGroup: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  unreadHeaderPill: {
    backgroundColor: APP_THEME.primaryLight,
    borderWidth: 1,
    borderColor: APP_THEME.primaryBorder,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  unreadHeaderText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: APP_THEME.primary,
  },
  headerActionsGroup: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
  },
  refreshChipBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: APP_THEME.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  chipsScrollContent: {
    flexDirection: rtlFlexDirection,
    gap: 8,
  },
  sectionChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionChipActive: {
    backgroundColor: APP_THEME.primary,
    borderColor: APP_THEME.primary,
  },
  sectionChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  sectionChipTextActive: {
    color: '#FFFFFF',
  },
  loadingWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyNotifLottie: {
    width: 96,
    height: 96,
  },
  emptyNotifBox: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  emptyNotifTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptyNotifSub: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
  },
  notifScrollArea: {
    maxHeight: 380,
  },
  notifListWrap: {
    gap: 8,
    paddingBottom: 6,
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
  notifItemCardUnread: {
    backgroundColor: '#FFFBF7',
    borderColor: APP_THEME.primaryBorder,
  },
  notifItemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  timeUnreadGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: APP_THEME.primary,
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
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
  },
  notifItemTime: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
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
    marginTop: 6,
  },
  clearNotifsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: APP_THEME.primary,
  },
  bannerWrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 999,
  },
  bannerCard: {
    direction: 'ltr',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: APP_THEME.primaryBorder,
    borderRadius: 16,
    padding: 12,
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
  bannerCloseBtn: {
    padding: 4,
  },
  bannerTextCol: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  bannerSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: APP_THEME.primary,
  },
  bannerTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: rtlTextAlign,
  },
  bannerBody: {
    fontSize: 12,
    color: '#475569',
    textAlign: rtlTextAlign,
  },
  bannerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
