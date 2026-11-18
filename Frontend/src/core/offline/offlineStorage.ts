import { getSecureItem, setSecureItem } from '../auth-storage/sessionStorage';

export interface OfflineCacheEnvelope<T> {
  data: T;
  etag?: string;
  cachedAt: number;
}

const STORAGE_PREFIX = 'elmansheya_offline_cache_';

function sanitizeCacheKey(key: string): string {
  return `${STORAGE_PREFIX}${key.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

/**
 * حفظ البيانات في ذاكرة القرص الدائمة للهاتف
 */
export async function persistOfflineData<T>(
  cacheKey: string,
  data: T,
  etag?: string
): Promise<void> {
  const envelope: OfflineCacheEnvelope<T> = {
    data,
    etag: etag || '',
    cachedAt: Date.now(),
  };
  await setSecureItem(sanitizeCacheKey(cacheKey), envelope);
}

/**
 * استرجاع البيانات من ذاكرة القرص الدائمة للهاتف للعمل بدون إنترنت
 */
export async function getOfflineData<T>(
  cacheKey: string
): Promise<OfflineCacheEnvelope<T> | null> {
  return getSecureItem<OfflineCacheEnvelope<T>>(sanitizeCacheKey(cacheKey));
}

/**
 * بيانات البداية الافتراضية المدمجة (Seed Data)
 * تضمن ظهور دليل الخدمات والجهات الحيوية وأرقام الطوارئ حتى لو فُتح التطبيق لأول مرة بدون نت إطلاقاً
 */
export const OFFLINE_SEED_SERVICES = [
  {
    slug: 'health-unit',
    name_ar: 'الوحدة الصحية بالمنشية',
    icon_name: 'medkit-outline',
    description: 'رعاية صحية أولية، تطعيمات الأطفال، طب الأسرة، وعيادات تنظيم الأسرة.',
    operating_hours: 'الاستقبال متاح ٢٤ ساعة • العيادات الخارجية من ٨ ص حتى ٢ ظ',
    phone: '01000000001',
    address: 'الشارع الرئيسي - بجوار المجمع الطبي بالقرية',
  },
  {
    slug: 'post-office',
    name_ar: 'مكتب بريد المنشية',
    icon_name: 'mail-outline',
    description: 'صرف المعاشات الشهرية، الحسابات الجارية والتوفير، والحوالات البريدية الفورية.',
    operating_hours: 'الأحد إلى الخميس: ٨:٠٠ ص حتى ٣:٠٠ م',
    phone: '01000000002',
    address: 'ميدان القرية العام - أمام المدرسة الإعدادية',
  },
  {
    slug: 'agriculture-assoc',
    name_ar: 'الجمعية الزراعية',
    icon_name: 'leaf-outline',
    description: 'صرف الأسمدة والمبيدات المعتمدة، كارت الفلاح، والإرشاد الزراعي لأهالي القرية.',
    operating_hours: 'يومياً عدا الجمعة والسبت من ٨:٣٠ ص حتى ٢:٠٠ ظ',
    phone: '01000000003',
    address: 'طريق المحطة الزراعية بالمنشية',
  },
  {
    slug: 'water-electricity',
    name_ar: 'طوارئ المياه والكهرباء',
    icon_name: 'flash-outline',
    description: 'الإبلاغ عن انقطاع مياه الشرب، أعطال خطوط الكهرباء، وأعمدة الإنارة العامة.',
    operating_hours: 'غرفة طوارئ مخصصة لخدمة أهالي القرية ٢٤ ساعة',
    phone: '01000000004',
    address: 'مقر صيانة المرافق والخدمات بالقرية',
  },
  {
    slug: 'schools-education',
    name_ar: 'المدارس والتعليم',
    icon_name: 'school-outline',
    description: 'مجمعات المدارس الابتدائية والإعدادية بالقرية ومواعيد التقديم والاستفسارات.',
    operating_hours: 'أيام الدراسة من ٧:٣٠ ص حتى ٢:٠٠ ظ',
    phone: '01000000005',
    address: 'مجمع مدارس قرية المنشية',
  },
  {
    slug: 'youth-center',
    name_ar: 'مركز شباب المنشية',
    icon_name: 'football-outline',
    description: 'الأنشطة الرياضية، دوريات كرة القدم، والفعاليات الثقافية والاجتماعية للشباب.',
    operating_hours: 'يومياً من ٩ ص حتى ١٠ م',
    phone: '01000000006',
    address: 'طريق البحر - بجوار الملعب الخماسي',
  },
  {
    slug: 'mosques',
    name_ar: 'مساجد القرية ومصليات العيد',
    icon_name: 'business-outline',
    description: 'أماكن المساجد الكبرى، أوقات خطبة الجمعة، ومصليات الأعياد ومقارئ القرآن.',
    operating_hours: 'مفتوح في جميع أوقات الصلوات الخمس والجمعة',
    phone: '',
    address: 'المسجد الكبير ومساجد أحياء القرية',
  },
  {
    slug: 'veterinary-unit',
    name_ar: 'الوحدة البيطرية',
    icon_name: 'paw-outline',
    description: 'تطعيم وتحصين الماشية والحيوانات الأليفة، والرعاية البيطرية الدورية.',
    operating_hours: 'الأحد إلى الخميس: ٨:٣٠ ص حتى ١:٣٠ ظ',
    phone: '01000000007',
    address: 'الشارع الشرقي بالقرية',
  },
  {
    slug: 'social-solidarity',
    name_ar: 'الشؤون الاجتماعية والتكافل',
    icon_name: 'heart-outline',
    description: 'معاشات تكافل وكرامة، المساعدات الاجتماعية للأسر، وتوثيق الحالات الإنسانية.',
    operating_hours: 'الأحد إلى الخميس: ٩ ص حتى ٢ ظ',
    phone: '01000000008',
    address: 'مبنى الوحدة المحلية بالمنشية',
  },
];
