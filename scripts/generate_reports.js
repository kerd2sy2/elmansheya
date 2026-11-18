const fs = require('fs');
const path = require('path');

const tenReports = [
  {
    id: "rep-1",
    report_number: 1,
    report_type: "electricity",
    report_type_ar: "الكهرباء والإنارة",
    title: "صيانة كشافات وأعمدة الإنارة بطريق المقابر",
    description: "انقطاع الإنارة عن ٤ أعمدة متتالية مما يسبب ظلاماً تاماً في مدخل طريق المقابر ليلاً.",
    manual_address: "طريق المقابر - المدخل الشرقي للقرية",
    status: "resolved",
    status_ar: "تم الحل والإصلاح",
    resolution_summary: "تم استبدال الكشافات التالفة بلمبات ليد موفرة بمعرفة فني كهرباء الوحدة المحلية وعادت الإنارة للعمل.",
    created_at: "2026-11-10T14:30:00Z"
  },
  {
    id: "rep-2",
    report_number: 2,
    report_type: "water",
    report_type_ar: "المياه",
    title: "كسر مفاجئ في ماسورة مياه الشرب",
    description: "تدفق كميات كبيرة من المياه الصالحة للشرب في الشارع وتجمعها أمام المنازل.",
    manual_address: "المنشية البحرية - شارع المحطة أمام صيدلية النور",
    status: "resolved",
    status_ar: "تم الحل والإصلاح",
    resolution_summary: "انتقل طاقم شركة المياه وتم غلق المحبس وإصلاح الماسورة المكسورة وعودة الضخ بشكل طبيعي.",
    created_at: "2026-11-10T16:15:00Z"
  },
  {
    id: "rep-3",
    report_number: 3,
    report_type: "sewage",
    report_type_ar: "الصرف الصحي",
    title: "انسداد بيارة الصرف وطفح مياه أمام مجمع المدارس",
    description: "انسداد في خط الصرف الصحي الرئيسي تسبب في طفح المياه أمام بوابة مدرسة المنشية الابتدائية.",
    manual_address: "شارع مجمع المدارس - بجوار المدرسة الابتدائية",
    status: "in_progress",
    status_ar: "جاري العمل والمعاينة",
    resolution_summary: "تم الدفع بسيارة نافوري لتسليك البيارة والعمل جاري على سحب المياه المتراكمة.",
    created_at: "2026-11-11T01:00:00Z"
  },
  {
    id: "rep-4",
    report_number: 4,
    report_type: "sanitation",
    report_type_ar: "النظافة",
    title: "تراكم مخلفات هدم ونظافة بجوار ترعة المنشية",
    description: "وجود مخلفات بناء وقمامة تعيق حركة المشاة والسيارات على جانب الطريق الرئيسي.",
    manual_address: "داير الناحية - طريق جسر الترعة",
    status: "resolved",
    status_ar: "تم رفع المخلفات",
    resolution_summary: "تم الدفع بلودر وسيارة نقل تابعة لمنظومة النظافة وتم رفع كافة التراكمات وتنظيف الموقع بالكامل.",
    created_at: "2026-11-09T18:20:00Z"
  },
  {
    id: "rep-5",
    report_number: 5,
    report_type: "roads",
    report_type_ar: "الطرق",
    title: "هبوط أرضي وتكسير في طبقة الأسفلت",
    description: "وجود حفرة عميقة ناتجة عن هبوط أرضي مفاجئ تهدد السيارات والدراجات النارية.",
    manual_address: "الشارع الرئيسي - أمام مسجد التقوى",
    status: "in_progress",
    status_ar: "جاري المعاينة والتمهيد",
    resolution_summary: "تم وضع علامات تحذيرية وتوريد رمل وسن لردم الهبوط وإعادة ضبط منسوب الشارع.",
    created_at: "2026-11-11T02:10:00Z"
  },
  {
    id: "rep-6",
    report_number: 6,
    report_type: "electricity",
    report_type_ar: "الكهرباء والإنارة",
    title: "كابل كهرباء أرضي مكشوف بجوار الحضانة",
    description: "كابل كهرباء يظهر على سطح الأرض بشكل مكشوف وخطير على حركة الأطفال والمارة.",
    manual_address: "المنشية القبلية - بجوار حضانة المستقبل",
    status: "resolved",
    status_ar: "تم التأمين والإصلاح",
    resolution_summary: "حضر مسؤولو هندسة الكهرباء وتم عزل الكابل بالكامل ودفنه داخل ماسورة حماية خرسانية تحت الأرض.",
    created_at: "2026-11-09T11:45:00Z"
  },
  {
    id: "rep-7",
    report_number: 7,
    report_type: "water",
    report_type_ar: "المياه",
    title: "ضعف ضغط المياه وانقطاعها في الطوابق العليا",
    description: "شكوى متكررة من أهالي المنطقة من ضعف شديد في ضخ مياه الشرب طوال ساعات النهار.",
    manual_address: "منطقة حوض النيل - غرب القرية",
    status: "pending",
    status_ar: "قيد المتابعة والفحص",
    resolution_summary: "تم إخطار شبكة مياه المركز لرفع كفاءة محبس التغذية وضبط ضغط الخط الرئيسي.",
    created_at: "2026-11-11T03:00:00Z"
  },
  {
    id: "rep-8",
    report_number: 8,
    report_type: "sewage",
    report_type_ar: "الصرف الصحي",
    title: "غطاء بالوعة مكسور يحتاج إلى تغيير فوري",
    description: "غطاء غرفة تفتيش صرف مكسور في وسط شارع فرعي مما قد يؤدي لسقوط المارة والسيارات.",
    manual_address: "شارع المستودع القديم - متفرع من المحطة",
    status: "resolved",
    status_ar: "تم التركيب والحل",
    resolution_summary: "تم تركيب غطاء خرساني مسلح جديد ومحكم وتثبيته بالمونة الأسمنتية.",
    created_at: "2026-11-08T15:10:00Z"
  },
  {
    id: "rep-9",
    report_number: 9,
    report_type: "sanitation",
    report_type_ar: "النظافة",
    title: "حاجة المنطقة لصندوق قمامة كبير إضافي",
    description: "الصندوق الحالي يمتلئ بسرعة بسبب الكثافة السكانية وتتراكم الأكياس حوله على الأرض.",
    manual_address: "ميدان الجمعية الزراعية - أمام مركز الشباب",
    status: "in_progress",
    status_ar: "جاري التجهيز والتوريد",
    resolution_summary: "تم اعتماد تزويد الموقع بصندوقين معدنيين سعة ١ متر مكعب ضمن خطة التوزيع الأسبوعية.",
    created_at: "2026-11-11T02:45:00Z"
  },
  {
    id: "rep-10",
    report_number: 10,
    report_type: "general",
    report_type_ar: "البلاغات العامة",
    title: "طلب تقليم فروع أشجار ضخمة متداخلة مع أسلاك الكهرباء",
    description: "فروع شجرة جميز قديمة تتشابك مع أسلاك الضغط المنخفض وتحدث شرزاً كهربائياً مع حركة الرياح.",
    manual_address: "طريق داير الناحية - أمام منزل الحاج عبد العال",
    status: "pending",
    status_ar: "قيد الفحص والمتابعة",
    resolution_summary: "تم التنسيق مع إدارة الأزمات والكهرباء لفصل التيار مؤقتاً وتقليم الفروع المتشابكة بأمان.",
    created_at: "2026-11-11T04:15:00Z"
  }
];

const outJsonPath = path.join(__dirname, '..', 'Backend', 'go-api', 'data', 'reports.json');
fs.writeFileSync(outJsonPath, JSON.stringify(tenReports, null, 2), 'utf-8');
console.log(`Saved 10 reports into ${outJsonPath}`);

const outMockDir = path.join(__dirname, '..', 'Frontend', 'src', 'features', 'reports', 'data');
fs.mkdirSync(outMockDir, { recursive: true });
const outMockPath = path.join(outMockDir, 'reports.mock.ts');

const tsMockContent = `import { PublicReportItem } from '../types/reports.types';

export const SEED_TEN_REPORTS: PublicReportItem[] = ${JSON.stringify(tenReports.map(r => ({
  id: r.id,
  report_number: r.report_number,
  report_type_ar: r.report_type_ar,
  title: r.title,
  description: r.description,
  manual_address: r.manual_address,
  status: r.status,
  status_ar: r.status_ar,
  resolution_summary: r.resolution_summary,
  created_at_ar: new Date(r.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
})), null, 2)};
`;

fs.writeFileSync(outMockPath, tsMockContent, 'utf-8');
console.log(`Saved 10 mock reports into ${outMockPath}`);
