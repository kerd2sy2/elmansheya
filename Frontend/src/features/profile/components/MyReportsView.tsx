import React, { useState } from 'react';
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
                <Text style={styles.countPillText}>{reports.length}</Text>
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
        {reports.length === 0 ? (
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
            {reports.map((report) => (
              <Pressable
                key={report.id}
                style={({ pressed }) => [
                  styles.myReportCard,
                  pressed && styles.myReportCardPressed,
                ]}
                onPress={() => setSelectedReportForTracking(report)}>
                {/* السطر العلوي: تصنيف البلاغ ورقمه + حالة البلاغ */}
                <View style={styles.reportCardTopRow}>
                  <View style={styles.reportCategoryBadgeRow}>
                    <View style={styles.reportCategoryPill}>
                      <Text style={styles.reportCategoryText}>{report.typeAr}</Text>
                    </View>
                    <Text style={styles.reportNumberText}>#{report.reportNumber}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadgePill,
                      report.status === 'resolved'
                        ? styles.statusResolved
                        : report.status === 'in_progress'
                        ? styles.statusInProgress
                        : styles.statusPending,
                    ]}>
                    <Text
                      style={[
                        styles.statusBadgeText,
                        report.status === 'resolved'
                          ? styles.statusResolvedText
                          : report.status === 'in_progress'
                          ? styles.statusInProgressText
                          : styles.statusPendingText,
                      ]}>
                      {report.statusAr}
                    </Text>
                  </View>
                </View>

                {/* عنوان المشكلة */}
                <Text style={styles.reportCardTitle} numberOfLines={2}>
                  {report.title}
                </Text>

                {/* المكان بالتفصيل */}
                <View style={styles.reportAddressRow}>
                  <Ionicons name="location-sharp" size={14} color="#973c00" />
                  <Text style={styles.reportAddressText} numberOfLines={1}>
                    {report.address}
                  </Text>
                </View>

                {/* السطر السفلي: التاريخ + زر متابعة الخطوات */}
                <View style={styles.reportCardFooterRow}>
                  <View style={styles.reportDateWrap}>
                    <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
                    <Text style={styles.reportDateText}>{report.createdAtAr}</Text>
                  </View>
                  <View style={styles.trackStepsRow}>
                    <Text style={styles.trackStepsPrompt}>متابعة المراحل</Text>
                    <Ionicons name="chevron-back" size={14} color="#973c00" />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* موديولا متابعة مراحل البلاغ */}
      <ReportTrackingModal
        visible={!!selectedReportForTracking}
        report={
          selectedReportForTracking
            ? {
                id: selectedReportForTracking.id,
                reportNumber: selectedReportForTracking.reportNumber,
                typeAr: selectedReportForTracking.typeAr,
                title: selectedReportForTracking.title,
                address: selectedReportForTracking.address,
                status: selectedReportForTracking.status,
                statusAr: selectedReportForTracking.statusAr,
                createdAtAr: selectedReportForTracking.createdAtAr,
                resolutionSummary: selectedReportForTracking.resolutionSummary,
                steps: selectedReportForTracking.steps,
              }
            : null
        }
        onClose={() => setSelectedReportForTracking(null)}
      />
    </View>
  );
};
