import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MyReportItem } from '@/features/reports/storage/myReportsStorage';
import { ReportTrackingModal } from '@/features/reports/components/ReportTrackingModal';
import { styles } from '../styles/profile.styles';

interface MyReportsViewProps {
  reports: MyReportItem[];
  onBack: () => void;
  topInset: number;
  bottomTabPadding: number;
}

export const MyReportsView: React.FC<MyReportsViewProps> = ({
  reports,
  onBack,
  topInset,
  bottomTabPadding,
}) => {
  const [selectedReportForTracking, setSelectedReportForTracking] = useState<MyReportItem | null>(null);

  // تصفية البلاغات الصالحة فقط لمنع أي انهيار في حال وجود بيانات غير مكتملة
  const validReports = useMemo(() => {
    if (!Array.isArray(reports)) return [];
    return reports.filter((r): r is MyReportItem => Boolean(r && typeof r === 'object' && (r.id || r.reportNumber)));
  }, [reports]);

  return (
    <View style={[styles.screenContainer, { paddingTop: topInset }]}>
      {/* هيدر صفحة بلاغاتي: شفاف بالكامل بدون باجراوند والعنوان في أقصى اليمين */}
      <View style={styles.cleanHeaderTransparent}>
        <View style={styles.cleanHeaderRow}>
          <Pressable
            style={styles.cleanBackArrowBtn}
            onPress={onBack}
            hitSlop={14}>
            <Ionicons name="arrow-forward" size={26} color="#0F172A" />
          </Pressable>

          <View style={styles.cleanTitlesCol}>
            <View style={styles.titleWithCountRow}>
              <Text style={styles.cleanMainHeading}>بلاغاتي</Text>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{validReports.length}</Text>
              </View>
            </View>
            <Text style={styles.cleanSubHeading}>متابعة مراحل وحالة البلاغات المسجلة</Text>
          </View>
        </View>
      </View>

      {/* قائمة البلاغات داخل الصفحة */}
      <ScrollView
        style={styles.myReportsPageScroll}
        contentContainerStyle={[
          styles.myReportsPageContent,
          { paddingBottom: bottomTabPadding + 28 },
        ]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        canCancelContentTouches={true}
        directionalLockEnabled={false}
        overScrollMode="always">
        {validReports.length === 0 ? (
          <View style={styles.emptyReportsBox}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="document-text-outline" size={38} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>لا توجد بلاغات مسجلة حالياً</Text>
            <Text style={styles.emptySub}>
              عند تقديم أي بلاغ من صفحة البلاغات، ستتمكن من متابعة خطوات تنفيذه خطوة بخطوة من هنا.
            </Text>
          </View>
        ) : (
          <View style={styles.myReportsList}>
            {validReports.map((report, idx) => {
              const itemKey = String(report.id || report.reportNumber || `rep-${idx}`);
              const repNumberStr = report.reportNumber ? `#${report.reportNumber}` : '';
              const categoryName = String(report.typeAr || 'بلاغ');
              const reportStatus = String(report.status || 'pending_approval');
              const statusName = String(report.statusAr || 'قيد المتابعة');
              const reportTitle = String(report.title || 'بلاغ بدون عنوان');
              const reportAddress = String(report.address || 'قرية المنشية');
              const reportDate = String(report.createdAtAr || 'الآن');

              return (
                <Pressable
                  key={itemKey}
                  style={({ pressed }) => [
                    styles.myReportCard,
                    pressed && styles.myReportCardPressed,
                  ]}
                  onPress={() => setSelectedReportForTracking(report)}>
                  {/* السطر العلوي: تصنيف البلاغ ورقمه + حالة البلاغ */}
                  <View style={styles.reportCardTopRow}>
                    <View style={styles.reportCategoryBadgeRow}>
                      <View style={styles.reportCategoryPill}>
                        <Text style={styles.reportCategoryText}>{categoryName}</Text>
                      </View>
                      {repNumberStr ? (
                        <Text style={styles.reportNumberText}>{repNumberStr}</Text>
                      ) : null}
                    </View>

                    <View
                      style={[
                        styles.statusBadgePill,
                        reportStatus === 'resolved'
                          ? styles.statusResolved
                          : reportStatus === 'in_progress'
                          ? styles.statusInProgress
                          : styles.statusPending,
                      ]}>
                      <Text
                        style={[
                          styles.statusBadgeText,
                          reportStatus === 'resolved'
                            ? styles.statusResolvedText
                            : reportStatus === 'in_progress'
                            ? styles.statusInProgressText
                            : styles.statusPendingText,
                        ]}>
                        {statusName}
                      </Text>
                    </View>
                  </View>

                  {/* عنوان المشكلة */}
                  <Text style={styles.reportCardTitle} numberOfLines={2}>
                    {reportTitle}
                  </Text>

                  {/* المكان بالتفصيل */}
                  <View style={styles.reportAddressRow}>
                    <Ionicons name="location-sharp" size={14} color="#973c00" />
                    <Text style={styles.reportAddressText} numberOfLines={1}>
                      {reportAddress}
                    </Text>
                  </View>

                  {/* السطر السفلي: التاريخ + زر متابعة الخطوات */}
                  <View style={styles.reportCardFooterRow}>
                    <View style={styles.reportDateWrap}>
                      <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
                      <Text style={styles.reportDateText}>{reportDate}</Text>
                    </View>
                    <View style={styles.trackStepsRow}>
                      <Text style={styles.trackStepsPrompt}>متابعة المراحل</Text>
                      <Ionicons name="chevron-back" size={14} color="#973c00" />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* موديولا متابعة مراحل البلاغ */}
      <ReportTrackingModal
        visible={Boolean(selectedReportForTracking)}
        report={
          selectedReportForTracking
            ? {
                id: String(selectedReportForTracking.id || selectedReportForTracking.reportNumber || 'rep'),
                reportNumber: Number(selectedReportForTracking.reportNumber || 0),
                typeAr: String(selectedReportForTracking.typeAr || 'بلاغ'),
                title: String(selectedReportForTracking.title || ''),
                address: String(selectedReportForTracking.address || 'قرية المنشية'),
                status: String(selectedReportForTracking.status || 'pending_approval'),
                statusAr: String(selectedReportForTracking.statusAr || 'قيد المتابعة'),
                createdAtAr: String(selectedReportForTracking.createdAtAr || 'الآن'),
                resolutionSummary: selectedReportForTracking.resolutionSummary,
                steps: Array.isArray(selectedReportForTracking.steps) ? selectedReportForTracking.steps : [],
              }
            : null
        }
        onClose={() => setSelectedReportForTracking(null)}
      />
    </View>
  );
};
