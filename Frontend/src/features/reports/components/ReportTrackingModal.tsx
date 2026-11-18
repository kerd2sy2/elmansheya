import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import {
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { rtlFlexDirection, rtlTextAlign } from '@/core/theme/rtl';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TimelineStep, generateTimelineSteps } from '../storage/myReportsStorage';

export interface ReportTrackingModalData {
  id: string;
  reportNumber: number;
  typeAr: string;
  title: string;
  address?: string;
  status: string;
  statusAr: string;
  createdAtAr: string;
  resolutionSummary?: string;
  steps?: TimelineStep[];
}

export interface ReportTrackingModalProps {
  visible: boolean;
  report: ReportTrackingModalData | null;
  onClose: () => void;
}

export function ReportTrackingModal({
  visible,
  report,
  onClose,
}: ReportTrackingModalProps) {
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  // أقصى ارتفاع للموديولا 85% من الشاشة حسب طلب المستخدم بدقة
  const MAX_HEIGHT = Math.round(screenHeight * 0.85);

  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);

  // معالج الهيدر للتحكم في السحب للأسفل والإغلاق بسلاسة
  const headerPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 6,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 20) {
          onClose();
        }
      },
    })
  ).current;

  if (!report) return null;

  const steps =
    report.steps && report.steps.length > 0
      ? report.steps
      : generateTimelineSteps(report.status, report.createdAtAr, report.resolutionSummary);

  // بادي آمن طبيعي أسفل المحتوى بدون أي فوتر منفصل
  const bottomSafePadding = Math.max(insets.bottom, 16) + 16;

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={styles.sheetBackdropPress} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* مقبض السحب العلوي يدعم اللمس والسحب للأسفل للإغلاق */}
          <View {...headerPanResponder.panHandlers} style={styles.dragBarContainer}>
            <View style={styles.sheetDragBar} />
          </View>

          {/* هيدر الموديولا: نظيف، أنيق، مباشر وبدون أي تاجات */}
          <View style={styles.modernHeader}>
            {/* عنوان البلاغ بخط عريض وواضح */}
            <Text style={styles.reportMainHeading}>{report.title}</Text>

            {/* العنوان / المكان بالتفصيل تحت عنوان البلاغ مباشرة */}
            {report.address ? (
              <View style={styles.addressRow}>
                <Ionicons name="location-sharp" size={13} color="#973c00" />
                <Text style={styles.addressText}>{report.address}</Text>
              </View>
            ) : null}

            {/* تاريخ البلاغ */}
            {report.createdAtAr ? (
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={12} color="#64748B" />
                <Text style={styles.dateText}>تاريخ البلاغ: {report.createdAtAr}</Text>
              </View>
            ) : null}
          </View>

          {/* محتوى الموديولا كامل بدون ارتفاع ثابت وبدون فوتر: الخطوات وزر العودة جزء طبيعي من المحتوى */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollBody}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomSafePadding }]}
            showsVerticalScrollIndicator={false}
            bounces={false}>
            {/* خط الزمن العمودي لمراحل وخطوات البلاغ */}
            <View style={styles.stepperContainer}>
              <Text style={styles.stepperSectionTitle}>خطوات تنفيذ ومتابعة البلاغ:</Text>
              {steps.map((step, idx) => {
                const isLast = idx === steps.length - 1;
                return (
                  <View key={step.stepNumber} style={styles.stepperStepRow}>
                    <View style={styles.stepperAxisCol}>
                      <View
                        style={[
                          styles.stepNodeCircle,
                          step.status === 'completed'
                            ? styles.nodeCompleted
                            : step.status === 'current'
                            ? styles.nodeCurrent
                            : styles.nodePending,
                        ]}>
                        {step.status === 'completed' ? (
                          <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                        ) : step.status === 'current' ? (
                          <View style={styles.currentPulsingDot} />
                        ) : (
                          <Text style={styles.nodePendingNum}>{step.stepNumber}</Text>
                        )}
                      </View>
                      {!isLast ? (
                        <View
                          style={[
                            styles.stepConnectingLine,
                            step.status === 'completed'
                              ? styles.lineCompleted
                              : styles.linePending,
                          ]}
                        />
                      ) : null}
                    </View>

                    <View style={styles.stepInfoBlock}>
                      <View style={styles.stepHeaderLine}>
                        <Text
                          style={[
                            styles.stepTitleText,
                            step.status === 'completed' && styles.stepTitleCompleted,
                            step.status === 'current' && styles.stepTitleCurrent,
                          ]}>
                          {step.title}
                        </Text>
                      </View>
                      <Text style={styles.stepDescText}>{step.desc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* زر الإغلاق: كلمة واحدة مباشرة تحت الخطوات */}
            <Pressable style={styles.followUpBtn} onPress={onClose}>
              <Ionicons name="close-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.followUpBtnText}>إغلاق</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetBackdropPress: {
    flex: 1,
  },
  sheetContainer: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#E2E8F0',
    elevation: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    overflow: 'hidden',
  },
  dragBarContainer: {
    paddingTop: 10,
    paddingBottom: 6,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  sheetDragBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  modernHeader: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  reportMainHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    lineHeight: 24,
  },
  addressRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    marginTop: -2,
  },
  addressText: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '600',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    flex: 1,
  },
  dateRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 5,
  },
  dateText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
    textAlign: rtlTextAlign,
  },
  scrollBody: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  stepperContainer: {
    marginBottom: 14,
  },
  stepperSectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
    textAlign: rtlTextAlign,
    marginBottom: 12,
  },
  stepperStepRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'flex-start',
    gap: 12,
    minHeight: 52,
  },
  stepperAxisCol: {
    alignItems: 'center',
    width: 26,
  },
  stepNodeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  nodeCompleted: {
    backgroundColor: '#16A34A',
  },
  nodeCurrent: {
    backgroundColor: '#973c00',
    borderWidth: 3,
    borderColor: '#FED7AA',
  },
  currentPulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  nodePending: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  nodePendingNum: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  stepConnectingLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    marginVertical: 2,
  },
  lineCompleted: {
    backgroundColor: '#16A34A',
  },
  linePending: {
    backgroundColor: '#E2E8F0',
  },
  stepInfoBlock: {
    flex: 1,
    paddingBottom: 14,
  },
  stepHeaderLine: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  stepTitleText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
    textAlign: rtlTextAlign,
  },
  stepTitleCompleted: {
    color: '#0F172A',
  },
  stepTitleCurrent: {
    color: '#973c00',
    fontWeight: '800',
  },
  stepDescText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    textAlign: rtlTextAlign,
  },
  followUpBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#973c00',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 6,
  },
  followUpBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
});
