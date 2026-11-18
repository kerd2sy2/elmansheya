import { getSecureItem, setSecureItem } from '@/core/auth-storage/sessionStorage';

export interface TimelineStep {
  stepNumber: number;
  title: string;
  desc: string;
  timeAr: string;
  status: 'completed' | 'current' | 'pending';
}

export interface MyReportItem {
  id: string;
  reportNumber: number;
  typeAr: string;
  title: string;
  address: string;
  status: 'pending_approval' | 'under_review' | 'in_progress' | 'resolved' | 'rejected';
  statusAr: string;
  createdAtAr: string;
  resolutionSummary?: string;
  steps: TimelineStep[];
}

export function generateTimelineSteps(
  status: string,
  createdAtAr: string,
  resolutionSummary?: string
): TimelineStep[] {
  if (status === 'resolved') {
    return [
      {
        stepNumber: 1,
        title: 'تسجيل واستلام البلاغ',
        desc: 'تم تسجيل البلاغ رسميًا في منظومة القرية وتوثيق البيانات.',
        timeAr: createdAtAr,
        status: 'completed',
      },
      {
        stepNumber: 2,
        title: 'مراجعة واعتماد المشرف',
        desc: 'فحص المشرف المختص للبلاغ والتأكد من بيانات الموقع واختصاص القسم.',
        timeAr: 'مكتملة',
        status: 'completed',
      },
      {
        stepNumber: 3,
        title: 'المعاينة الميدانية وتكليف الطاقم',
        desc: 'انتقل المشرف لموقع المشكلة وتكليف الفنيين بمعدات الصيانة.',
        timeAr: 'مكتملة',
        status: 'completed',
      },
      {
        stepNumber: 4,
        title: 'تنفيذ أعمال الإصلاح والصيانة',
        desc: 'أنجز الفريق الفني كافة الأعمال الميدانية اللازمة لإنهاء العطل.',
        timeAr: 'مكتملة',
        status: 'completed',
      },
      {
        stepNumber: 5,
        title: 'إتمام الحل وإغلاق البلاغ',
        desc: resolutionSummary || 'تم التأكد ميدانياً من زوال المشكلة وعودة الخدمة لطبيعتها.',
        timeAr: 'تم الحل بنجاح',
        status: 'completed',
      },
    ];
  }

  if (status === 'in_progress') {
    return [
      {
        stepNumber: 1,
        title: 'تسجيل واستلام البلاغ',
        desc: 'تم استلام وتسجيل البلاغ رسميًا في منظومة القرية.',
        timeAr: createdAtAr,
        status: 'completed',
      },
      {
        stepNumber: 2,
        title: 'مراجعة واعتماد المشرف',
        desc: 'اعتمد المشرف البلاغ وتم تحويله لجدول أعمال الصيانة الميدانية.',
        timeAr: 'مكتملة',
        status: 'completed',
      },
      {
        stepNumber: 3,
        title: 'المعاينة الميدانية وتكليف الطاقم',
        desc: 'تمت المعاينة الميدانية وتوجيه سيارات ومعدات الوحدة للموقع.',
        timeAr: 'مكتملة',
        status: 'completed',
      },
      {
        stepNumber: 4,
        title: 'تنفيذ أعمال الإصلاح والصيانة',
        desc: 'جاري العمل في الموقع حالياً بمعرفة الفريق الفني المختص.',
        timeAr: 'المرحلة الحالية',
        status: 'current',
      },
      {
        stepNumber: 5,
        title: 'إتمام الحل وإغلاق البلاغ',
        desc: 'سيتم التأكد من زوال المشكلة وإغلاق البلاغ فور انتهاء الأعمال.',
        timeAr: 'قيد الانتظار',
        status: 'pending',
      },
    ];
  }

  // pending_approval أو under_review أو جديد
  return [
    {
      stepNumber: 1,
      title: 'تسجيل واستلام البلاغ',
      desc: 'تم إرسال البلاغ بنجاح وتوثيقه بالنظام برقم رسمي.',
      timeAr: createdAtAr,
      status: 'completed',
    },
    {
      stepNumber: 2,
      title: 'مراجعة واعتماد المشرف',
      desc: 'جاري فحص البلاغ من المشرف المسؤول بالقرية للمراجعة والاعتماد.',
      timeAr: 'المرحلة الحالية',
      status: 'current',
    },
    {
      stepNumber: 3,
      title: 'المعاينة الميدانية وتكليف الطاقم',
      desc: 'سيتم توجيه طاقم الصيانة إلى الموقع فور اعتماد المشرف.',
      timeAr: 'قيد الانتظار',
      status: 'pending',
    },
    {
      stepNumber: 4,
      title: 'تنفيذ أعمال الإصلاح والصيانة',
      desc: 'بدء أعمال الصيانة الميدانية لإصلاح العطل.',
      timeAr: 'قيد الانتظار',
      status: 'pending',
    },
    {
      stepNumber: 5,
      title: 'إتمام الحل وإغلاق البلاغ',
      desc: 'إغلاق البلاغ وإشعار المواطن بتمام الإصلاح.',
      timeAr: 'قيد الانتظار',
      status: 'pending',
    },
  ];
}

const LEGACY_STORAGE_KEY = 'elmansheya_citizen_my_reports_v1';

export function getScopedReportsKey(userKey?: string): string {
  if (!userKey || !userKey.trim()) {
    return 'elmansheya_citizen_my_reports_guest';
  }
  const sanitized = userKey.trim().replace(/[^a-zA-Z0-9_]/g, '_');
  return `elmansheya_citizen_my_reports_${sanitized}`;
}

export async function getMyReports(userKey?: string): Promise<MyReportItem[]> {
  try {
    const key = getScopedReportsKey(userKey);
    const saved = await getSecureItem<MyReportItem[]>(key);
    if (saved && Array.isArray(saved)) {
      return saved;
    }
  } catch {}
  return [];
}

export async function saveUserReports(
  reports: MyReportItem[],
  userKey?: string
): Promise<void> {
  const key = getScopedReportsKey(userKey);
  await setSecureItem(key, reports);
}

export async function addMyReport(
  item: {
    id: string;
    reportNumber: number;
    typeAr: string;
    title: string;
    address: string;
    status: 'pending_approval' | 'under_review' | 'in_progress' | 'resolved';
    statusAr: string;
    createdAtAr: string;
    resolutionSummary?: string;
  },
  userKey?: string
): Promise<MyReportItem[]> {
  const existing = await getMyReports(userKey);
  const newItem: MyReportItem = {
    ...item,
    steps: generateTimelineSteps(item.status, item.createdAtAr, item.resolutionSummary),
  };
  // إدراج البلاغ في البداية مع منع التكرار
  const filtered = existing.filter(
    (r) => r.id !== newItem.id && r.reportNumber !== newItem.reportNumber
  );
  const updated = [newItem, ...filtered];
  await saveUserReports(updated, userKey);
  return updated;
}
