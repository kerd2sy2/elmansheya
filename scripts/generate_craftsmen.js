const fs = require('fs');
const path = require('path');

const categories = [
  { id: 'cat-1', slug: 'electricity', name_ar: 'كهرباء منازل' },
  { id: 'cat-2', slug: 'plumbing', name_ar: 'سباكة وصحي' },
  { id: 'cat-3', slug: 'carpentry', name_ar: 'نجارة باب وشباك' },
  { id: 'cat-4', slug: 'painting', name_ar: 'نقاشة ودهانات' },
  { id: 'cat-5', slug: 'masonry', name_ar: 'بناء ومحارة' },
  { id: 'cat-6', slug: 'ceramics', name_ar: 'سيراميك وبلاط' },
  { id: 'cat-7', slug: 'blacksmith', name_ar: 'حدادة وكريتال' },
  { id: 'cat-8', slug: 'alumetal', name_ar: 'ألوميتال وزجاج' },
  { id: 'cat-9', slug: 'gypsum', name_ar: 'جبس بورد وديكور' },
  { id: 'cat-10', slug: 'appliances', name_ar: 'صيانة أجهزة منزلية' },
  { id: 'cat-11', slug: 'hvac', name_ar: 'تكييف وتبريد' },
  { id: 'cat-12', slug: 'satellite_cctv', name_ar: 'دش وكاميرات مراقبة' },
  { id: 'cat-13', slug: 'water_filters', name_ar: 'فلاتر مياه' },
  { id: 'cat-14', slug: 'marble', name_ar: 'رخام وجرانيت' },
  { id: 'cat-15', slug: 'wood_painting', name_ar: 'استورجي ودهان أخشاب' },
  { id: 'cat-16', slug: 'upholstery', name_ar: 'تنجيد وستائر' },
  { id: 'cat-17', slug: 'reinforced_carpentry', name_ar: 'نجارة مسلح وحديد' },
  { id: 'cat-18', slug: 'auto_mechanic', name_ar: 'ميكانيكا سيارات' },
  { id: 'cat-19', slug: 'auto_electric', name_ar: 'كهرباء سيارات وتوك توك' },
  { id: 'cat-20', slug: 'welding_lathe', name_ar: 'خراطة ولحام معادن' },
  { id: 'cat-21', slug: 'agri_machinery', name_ar: 'صيانة ماكينات زراعية' },
  { id: 'cat-22', slug: 'solar_pumps', name_ar: 'طاقة شمسية وغطاسات' },
  { id: 'cat-23', slug: 'mobile_pc', name_ar: 'صيانة موبايل وكمبيوتر' },
  { id: 'cat-24', slug: 'tailoring', name_ar: 'خياطة وتفصيل' },
  { id: 'cat-25', slug: 'barber', name_ar: 'حلاقة وكوافير' },
  { id: 'cat-26', slug: 'bakery_oven', name_ar: 'صيانة أفران وبوتاجازات' },
  { id: 'cat-27', slug: 'moving_labor', name_ar: 'نقل عفش وعمالة' },
  { id: 'cat-28', slug: 'insulation', name_ar: 'عزل أسطح وخزانات' },
  { id: 'cat-29', slug: 'pest_cleaning', name_ar: 'تنظيف ومكافحة حشرات' },
  { id: 'cat-30', slug: 'sound_lighting', name_ar: 'فراشة وصوتيات أفراح' },
];

const areas = [
  'المنشية البحرية',
  'المنشية القبلية',
  'داير الناحية',
  'شارع المحطة',
  'بجوار المسجد الكبير',
  'حوض النيل',
  'طريق المقابر',
  'المدخل الشرقي',
  'شارع المدارس',
  'منطقة السوق',
];

const firstNames = [
  'أحمد', 'محمد', 'محمود', 'إبراهيم', 'حسن', 'حسين', 'سيد', 'شعبان', 'رمضان', 'عاشور',
  'طارق', 'فتحي', 'رجب', 'فرج', 'عاطف', 'جمال', 'عادل', 'سامي', 'خالد', 'مصطفى',
  'علي', 'عبد الله', 'ياسر', 'صلاح', 'ممدوح', 'عصام', 'حمدي', 'ناصر', 'مجدي', 'عنتر'
];

const lastNames = [
  'الصعيدي', 'الشرقاوي', 'البحيري', 'الشناوي', 'درويش', 'النجار', 'كابو', 'الحداد',
  'حجازي', 'منصور', 'العمدة', 'أبو الخير', 'السيد', 'عفيفي', 'بركات', 'شحاتة',
  'عبد العال', 'غنيم', 'جاد', 'سليمان', 'زايد', 'بدوي', 'فودة', 'الجزار', 'عويس'
];

const nicknames = [
  'البرنس', 'أستاذ الصنعة', 'الهندس', 'أبو قلب طيب', 'الصاروخ', 'العمدة', 'الدكتور',
  'الفنان', 'النمر', 'الكابتن', 'البلدوزر', 'المايسترو', 'الجوكر', 'حبيب الملايين', ''
];

const serviceTemplates = {
  electricity: 'تأسيس شبكات كهرباء، تشطيب منازل، لوحات توزيع وقواطع أوتوماتيك، صيانة إنارة ليد.',
  plumbing: 'تأسيس سباكة حديثة، تركيب مواتير وفلاتر مياه، تسليك وصيانة شبكات الصرف وخلاطات المياه.',
  carpentry: 'تصنيع وصيانة أبواب وشبابيك، تفصيل غرف نوم ومطابخ، تركيب كوالين وأقفال أمان.',
  painting: 'تشطيب دهانات ديكورية حديثة، معجون وبطانات، ديكورات قطيفة وورق حائط وشاشات جبس.',
  masonry: 'بناء طوب أحمر، بياض محارة وتربيعات، صيانة واجهات وترميم مباني سكنية وتجارية.',
  ceramics: 'تركيب سيراميك وبورسلين أرضيات وحوائط، ليزر وميول صرف الحمامات والمطابخ بدقة عالية.',
  blacksmith: 'تصنيع بوابات حديد، شبابيك كريتال، مظلات حماية، وأعمال لحام وتثبيت حديد زوايا.',
  alumetal: 'تفصيل شبابيك ومطابخ ألوميتال بي إس، زجاج دبل وسيكوريت، شبك ناموس وصيانة عوازل.',
  gypsum: 'تركيب جبس بورد أسقف معلقة، بيوت نور وشاشات ديكورية، إضاءات ليد مخفية بتصميمات عصرية.',
  appliances: 'صيانة غسالات أوتوماتيك، ثلاجات، ديب فريزر، وبوتاجازات مع توفير قطع غيار أصلية.',
  hvac: 'تركيب وصيانة تكييفات شارب وكاريير وميديا، شحن فريون، وتنظيف دوري للفلاتر والوحدات.',
  satellite_cctv: 'تركيب وضبط أطباق الدش، تمديد كاميرات مراقبة رقمية HD مع ربطها بالهاتف المحمول.',
  water_filters: 'تركيب وصيانة فلاتر مياه ٧ مراحل، تغيير شمعات دورية وفحص نسبة الأملاح الذائبة.',
  marble: 'تفصيل وتركيب رخام مطابخ جرانيت، درج سلالم، وتشطيب مداخل عمارات وأرضيات فاخرة.',
  wood_painting: 'دهان أستر ولاكيه ودوكو للأخشاب وغرف النوم والسفرة والصالونات وتجديد الأثاث القديم.',
  upholstery: 'تنجيد ركنات وصالونات وأنتريهات وتفصيل ستائر حديثة بأقمشة وتصميمات ممتازة.',
  reinforced_carpentry: 'نجارة وحدادة مسلحة، شدات وسقالات خرسانية للمنازل والمباني بأعلى معايير الأمان.',
  auto_mechanic: 'عمرة وصيانة محركات سيارات، كشف أعطال وفحص دوري للعفشة والمكابح.',
  auto_electric: 'صيانة كهرباء سيارات، دينامو، بطاريات، وضفائر توك توك ومركبات زراعية.',
  welding_lathe: 'أعمال خراطة دقيقة، لحام أرجون وكهرباء، تشكيل معادن وقطع غيار ومسننات.',
  agri_machinery: 'صيانة ماكينات ري وماكينات ديزل وطلمبات زراعية وجرارات مع توفير مستلزمات الصيانة.',
  solar_pumps: 'تركيب وصيانة أنظمة طاقة شمسية للآبار والغطاسات الزراعية وشبكات الري الحديثة.',
  mobile_pc: 'صيانة هواتف ذكية وكمبيوتر، تغيير شاشات وبطاريات، وسوفت وير وتسريع الأجهزة.',
  tailoring: 'تفصيل ملابس رجالي وحريمي وأطفال، تظبيط مقاسات، وتفصيل جلاليب بلدية ومفروشات.',
  barber: 'حلاقة شعر وقصات حديثة وتجهيز عرسان في الصالون أو خدمة منزلية لكبار السن.',
  bakery_oven: 'صيانة أفران عيش بلدي وأفران دوارة وبوتاجازات ومداخن بأسعار مناسبة.',
  moving_labor: 'نقل وتغليف عفش وأثاث، عمالة مدربة، ونش رفع، وسيارات نقل مغلقة داخل وخارج القرية.',
  insulation: 'عزل مائي وحراري للأسطح وخزانات المياه، فوم وممبرين لحماية المباني من تسريب الأمطار.',
  pest_cleaning: 'مكافحة الحشرات والقوارض، رش آمن للمنازل والمزارع، وتنظيف خزانات المياه.',
  sound_lighting: 'تجهيز فراشة سرادقات، صوتيات دي جي، إضاءات ليد وكوشات أفراح ومناسبات.',
};

let globalId = 100;
const craftsmen = [];

categories.forEach((cat, catIdx) => {
  // نحدد بين 2 إلى 4 عمال في كل صنف (أكثر من 100 عامل متكامل للتجربة الواقعية)
  const count = (catIdx % 3 === 0) ? 4 : (catIdx % 2 === 0) ? 3 : 2;

  for (let i = 0; i < count; i++) {
    globalId++;
    const fn = firstNames[(globalId * 3 + i) % firstNames.length];
    const ln = lastNames[(globalId * 7 + i) % lastNames.length];
    const nick = nicknames[(globalId * 5 + i) % nicknames.length];
    const area = areas[(globalId + i) % areas.length];
    const phonePrefix = ['010', '011', '012', '015'][i % 4];
    const phoneRest = String(10000000 + (globalId * 137) % 90000000);
    const phone = phonePrefix + phoneRest.slice(1);
    const rating = +(4.5 + ((globalId * 3) % 6) * 0.1).toFixed(1);
    const ratingsCount = 8 + ((globalId * 7) % 35);
    const desc = serviceTemplates[cat.slug] || `خدمات وأعمال احترافية في مجال ${cat.name_ar} بقرية المنشية بأعلى جودة وسرعة.`;

    craftsmen.push({
      id: `craftsman-${globalId}`,
      full_name: `الأسطى ${fn} ${ln}`,
      nickname: nick,
      specialty: cat.name_ar,
      phone,
      area,
      services_description: desc,
      is_accredited: (i % 2 === 0),
      average_rating: rating > 5 ? 5 : rating,
      ratings_count: ratingsCount
    });
  }
});

const outJsonPath = path.join(__dirname, '..', 'Backend', 'go-api', 'data', 'craftsmen.json');
fs.writeFileSync(outJsonPath, JSON.stringify(craftsmen, null, 2), 'utf-8');
console.log(`Generated ${craftsmen.length} craftsmen into ${outJsonPath}`);

const outMockPath = path.join(__dirname, '..', 'Frontend', 'src', 'features', 'craftsmen', 'data', 'craftsmen.mock.ts');
fs.mkdirSync(path.dirname(outMockPath), { recursive: true });
const mockTsContent = `import { CraftsmanItem } from '../types/craftsmen.types';

export const SEED_CRAFTSMEN: CraftsmanItem[] = ${JSON.stringify(craftsmen, null, 2)};
`;
fs.writeFileSync(outMockPath, mockTsContent, 'utf-8');
console.log(`Generated TypeScript mock into ${outMockPath}`);
