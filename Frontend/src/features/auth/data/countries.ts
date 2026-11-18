export interface CountryDialOption {
  code: string;
  nameAr: string;
  nameEn: string;
  dialCode: string;
  minDigits: number;
  maxDigits: number;
}

type CountryTuple = readonly [
  code: string,
  nameAr: string,
  nameEn: string,
  dialCode: string,
  minDigits: number,
  maxDigits: number,
];

// أطوال أرقام الهواتف المحلية بدون الصفر الابتدائي لكل دولة
const RAW_COUNTRIES: readonly CountryTuple[] = [
  ['ET', 'إثيوبيا', 'Ethiopia', '+251', 9, 9],
  ['AZ', 'أذربيجان', 'Azerbaijan', '+994', 9, 9],
  ['AM', 'أرمينيا', 'Armenia', '+374', 8, 8],
  ['ER', 'إريتريا', 'Eritrea', '+291', 7, 7],
  ['ES', 'إسبانيا', 'Spain', '+34', 9, 9],
  ['AU', 'أستراليا', 'Australia', '+61', 9, 9],
  ['EE', 'إستونيا', 'Estonia', '+372', 7, 8],
  ['AF', 'أفغانستان', 'Afghanistan', '+93', 9, 9],
  ['AR', 'الأرجنتين', 'Argentina', '+54', 10, 10],
  ['JO', 'الأردن', 'Jordan', '+962', 9, 9],
  ['EC', 'الإكوادور', 'Ecuador', '+593', 9, 9],
  ['AE', 'الإمارات', 'United Arab Emirates', '+971', 9, 9],
  ['AL', 'ألبانيا', 'Albania', '+355', 9, 9],
  ['DE', 'ألمانيا', 'Germany', '+49', 10, 11],
  ['AG', 'أنتيغوا وباربودا', 'Antigua and Barbuda', '+1268', 7, 7],
  ['AD', 'أندورا', 'Andorra', '+376', 6, 9],
  ['ID', 'إندونيسيا', 'Indonesia', '+62', 9, 12],
  ['AO', 'أنغولا', 'Angola', '+244', 9, 9],
  ['UY', 'أوروغواي', 'Uruguay', '+598', 8, 8],
  ['UZ', 'أوزبكستان', 'Uzbekistan', '+998', 9, 9],
  ['UG', 'أوغندا', 'Uganda', '+256', 9, 9],
  ['UA', 'أوكرانيا', 'Ukraine', '+380', 9, 9],
  ['IR', 'إيران', 'Iran', '+98', 10, 10],
  ['IE', 'أيرلندا', 'Ireland', '+353', 9, 9],
  ['IS', 'أيسلندا', 'Iceland', '+354', 7, 7],
  ['IT', 'إيطاليا', 'Italy', '+39', 9, 10],
  ['PG', 'بابوا غينيا الجديدة', 'Papua New Guinea', '+675', 8, 8],
  ['PY', 'باراغواي', 'Paraguay', '+595', 9, 9],
  ['BB', 'باربادوس', 'Barbados', '+1246', 7, 7],
  ['PK', 'باكستان', 'Pakistan', '+92', 10, 10],
  ['PW', 'بالاو', 'Palau', '+680', 7, 7],
  ['BS', 'باهاماس', 'Bahamas', '+1242', 7, 7],
  ['BH', 'البحرين', 'Bahrain', '+973', 8, 8],
  ['BR', 'البرازيل', 'Brazil', '+55', 10, 11],
  ['PT', 'البرتغال', 'Portugal', '+351', 9, 9],
  ['BN', 'بروناي', 'Brunei', '+673', 7, 7],
  ['BE', 'بلجيكا', 'Belgium', '+32', 9, 9],
  ['BG', 'بلغاريا', 'Bulgaria', '+359', 8, 9],
  ['BZ', 'بليز', 'Belize', '+501', 7, 7],
  ['BD', 'بنغلاديش', 'Bangladesh', '+880', 10, 10],
  ['PA', 'بنما', 'Panama', '+507', 8, 8],
  ['BJ', 'بنين', 'Benin', '+229', 8, 10],
  ['BT', 'بوتان', 'Bhutan', '+975', 8, 8],
  ['BW', 'بوتسوانا', 'Botswana', '+267', 8, 8],
  ['BF', 'بوركينا فاسو', 'Burkina Faso', '+226', 8, 8],
  ['BI', 'بوروندي', 'Burundi', '+257', 8, 8],
  ['BA', 'البوسنة والهرسك', 'Bosnia and Herzegovina', '+387', 8, 9],
  ['PL', 'بولندا', 'Poland', '+48', 9, 9],
  ['BO', 'بوليفيا', 'Bolivia', '+591', 8, 8],
  ['PE', 'بيرو', 'Peru', '+51', 9, 9],
  ['BY', 'بيلاروسيا', 'Belarus', '+375', 9, 9],
  ['TH', 'تايلاند', 'Thailand', '+66', 9, 9],
  ['TW', 'تايوان', 'Taiwan', '+886', 9, 9],
  ['TM', 'تركمانستان', 'Turkmenistan', '+993', 8, 8],
  ['TR', 'تركيا', 'Turkey', '+90', 10, 10],
  ['TT', 'ترينيداد وتوباغو', 'Trinidad and Tobago', '+1868', 7, 7],
  ['TD', 'تشاد', 'Chad', '+235', 8, 8],
  ['CZ', 'التشيك', 'Czechia', '+420', 9, 9],
  ['CL', 'تشيلي', 'Chile', '+56', 9, 9],
  ['TZ', 'تنزانيا', 'Tanzania', '+255', 9, 9],
  ['TG', 'توغو', 'Togo', '+228', 8, 8],
  ['TV', 'توفالو', 'Tuvalu', '+688', 5, 6],
  ['TN', 'تونس', 'Tunisia', '+216', 8, 8],
  ['TO', 'تونغا', 'Tonga', '+676', 5, 7],
  ['TL', 'تيمور الشرقية', 'Timor-Leste', '+670', 7, 8],
  ['JM', 'جامايكا', 'Jamaica', '+1876', 7, 7],
  ['ME', 'الجبل الأسود', 'Montenegro', '+382', 8, 8],
  ['DZ', 'الجزائر', 'Algeria', '+213', 9, 9],
  ['KM', 'جزر القمر', 'Comoros', '+269', 7, 7],
  ['SB', 'جزر سليمان', 'Solomon Islands', '+677', 7, 7],
  ['MH', 'جزر مارشال', 'Marshall Islands', '+692', 7, 7],
  ['CF', 'جمهورية أفريقيا الوسطى', 'Central African Republic', '+236', 8, 8],
  ['DO', 'جمهورية الدومينيكان', 'Dominican Republic', '+1809', 7, 7],
  ['CG', 'جمهورية الكونغو', 'Republic of the Congo', '+242', 9, 9],
  ['CD', 'الكونغو الديمقراطية', 'DR Congo', '+243', 9, 9],
  ['ZA', 'جنوب أفريقيا', 'South Africa', '+27', 9, 9],
  ['SS', 'جنوب السودان', 'South Sudan', '+211', 9, 9],
  ['GE', 'جورجيا', 'Georgia', '+995', 9, 9],
  ['DJ', 'جيبوتي', 'Djibouti', '+253', 8, 8],
  ['DK', 'الدنمارك', 'Denmark', '+45', 8, 8],
  ['DM', 'دومينيكا', 'Dominica', '+1767', 7, 7],
  ['CV', 'الرأس الأخضر', 'Cape Verde', '+238', 7, 7],
  ['RW', 'رواندا', 'Rwanda', '+250', 9, 9],
  ['RU', 'روسيا', 'Russia', '+7', 10, 10],
  ['RO', 'رومانيا', 'Romania', '+40', 9, 9],
  ['ZM', 'زامبيا', 'Zambia', '+260', 9, 9],
  ['ZW', 'زيمبابوي', 'Zimbabwe', '+263', 9, 9],
  ['CI', 'ساحل العاج', 'Ivory Coast', '+225', 10, 10],
  ['WS', 'ساموا', 'Samoa', '+685', 5, 7],
  ['SM', 'سان مارينو', 'San Marino', '+378', 8, 10],
  ['VC', 'سانت فنسنت والغرينادين', 'Saint Vincent and the Grenadines', '+1784', 7, 7],
  ['KN', 'سانت كيتس ونيفيس', 'Saint Kitts and Nevis', '+1869', 7, 7],
  ['LC', 'سانت لوسيا', 'Saint Lucia', '+1758', 7, 7],
  ['ST', 'ساو تومي وبرينسيبي', 'Sao Tome and Principe', '+239', 7, 7],
  ['LK', 'سريلانكا', 'Sri Lanka', '+94', 9, 9],
  ['SA', 'السعودية', 'Saudi Arabia', '+966', 9, 9],
  ['SV', 'السلفادور', 'El Salvador', '+503', 8, 8],
  ['SK', 'سلوفاكيا', 'Slovakia', '+421', 9, 9],
  ['SI', 'سلوفينيا', 'Slovenia', '+386', 8, 8],
  ['SG', 'سنغافورة', 'Singapore', '+65', 8, 8],
  ['SN', 'السنغال', 'Senegal', '+221', 9, 9],
  ['SZ', 'إسواتيني', 'Eswatini', '+268', 8, 8],
  ['SD', 'السودان', 'Sudan', '+249', 9, 9],
  ['SY', 'سوريا', 'Syria', '+963', 9, 9],
  ['SR', 'سورينام', 'Suriname', '+597', 6, 7],
  ['SE', 'السويد', 'Sweden', '+46', 7, 10],
  ['CH', 'سويسرا', 'Switzerland', '+41', 9, 9],
  ['SL', 'سيراليون', 'Sierra Leone', '+232', 8, 8],
  ['SC', 'سيشل', 'Seychelles', '+248', 7, 7],
  ['RS', 'صربيا', 'Serbia', '+381', 8, 9],
  ['SO', 'الصومال', 'Somalia', '+252', 8, 9],
  ['CN', 'الصين', 'China', '+86', 11, 11],
  ['TJ', 'طاجيكستان', 'Tajikistan', '+992', 9, 9],
  ['IQ', 'العراق', 'Iraq', '+964', 10, 10],
  ['OM', 'عُمان', 'Oman', '+968', 8, 8],
  ['GA', 'الغابون', 'Gabon', '+241', 7, 8],
  ['GM', 'غامبيا', 'Gambia', '+220', 7, 7],
  ['GH', 'غانا', 'Ghana', '+233', 9, 9],
  ['GD', 'غرينادا', 'Grenada', '+1473', 7, 7],
  ['GT', 'غواتيمالا', 'Guatemala', '+502', 8, 8],
  ['GY', 'غيانا', 'Guyana', '+592', 7, 7],
  ['GN', 'غينيا', 'Guinea', '+224', 9, 9],
  ['GQ', 'غينيا الاستوائية', 'Equatorial Guinea', '+240', 9, 9],
  ['GW', 'غينيا بيساو', 'Guinea-Bissau', '+245', 7, 9],
  ['VA', 'الفاتيكان', 'Vatican City', '+379', 8, 10],
  ['VU', 'فانواتو', 'Vanuatu', '+678', 7, 7],
  ['FR', 'فرنسا', 'France', '+33', 9, 9],
  ['PH', 'الفلبين', 'Philippines', '+63', 10, 10],
  ['PS', 'فلسطين', 'Palestine', '+970', 9, 9],
  ['VE', 'فنزويلا', 'Venezuela', '+58', 10, 10],
  ['FI', 'فنلندا', 'Finland', '+358', 7, 10],
  ['VN', 'فيتنام', 'Vietnam', '+84', 9, 10],
  ['FJ', 'فيجي', 'Fiji', '+679', 7, 7],
  ['CY', 'قبرص', 'Cyprus', '+357', 8, 8],
  ['QA', 'قطر', 'Qatar', '+974', 8, 8],
  ['KG', 'قيرغيزستان', 'Kyrgyzstan', '+996', 9, 9],
  ['KZ', 'كازاخستان', 'Kazakhstan', '+7', 10, 10],
  ['CM', 'الكاميرون', 'Cameroon', '+237', 9, 9],
  ['HR', 'كرواتيا', 'Croatia', '+385', 8, 9],
  ['KH', 'كمبوديا', 'Cambodia', '+855', 8, 9],
  ['CA', 'كندا', 'Canada', '+1', 10, 10],
  ['CU', 'كوبا', 'Cuba', '+53', 8, 8],
  ['KR', 'كوريا الجنوبية', 'South Korea', '+82', 9, 10],
  ['KP', 'كوريا الشمالية', 'North Korea', '+850', 8, 10],
  ['CR', 'كوستاريكا', 'Costa Rica', '+506', 8, 8],
  ['XK', 'كوسوفو', 'Kosovo', '+383', 8, 9],
  ['CO', 'كولومبيا', 'Colombia', '+57', 10, 10],
  ['KW', 'الكويت', 'Kuwait', '+965', 8, 8],
  ['KI', 'كيريباتي', 'Kiribati', '+686', 5, 8],
  ['KE', 'كينيا', 'Kenya', '+254', 9, 9],
  ['LV', 'لاتفيا', 'Latvia', '+371', 8, 8],
  ['LA', 'لاوس', 'Laos', '+856', 8, 10],
  ['LB', 'لبنان', 'Lebanon', '+961', 7, 8],
  ['LU', 'لوكسمبورغ', 'Luxembourg', '+352', 8, 9],
  ['LY', 'ليبيا', 'Libya', '+218', 9, 9],
  ['LR', 'ليبيريا', 'Liberia', '+231', 7, 9],
  ['LT', 'ليتوانيا', 'Lithuania', '+370', 8, 8],
  ['LI', 'ليختنشتاين', 'Liechtenstein', '+423', 7, 9],
  ['LS', 'ليسوتو', 'Lesotho', '+266', 8, 8],
  ['MV', 'المالديف', 'Maldives', '+960', 7, 7],
  ['MT', 'مالطا', 'Malta', '+356', 8, 8],
  ['ML', 'مالي', 'Mali', '+223', 8, 8],
  ['MY', 'ماليزيا', 'Malaysia', '+60', 9, 10],
  ['HU', 'المجر', 'Hungary', '+36', 9, 9],
  ['MG', 'مدغشقر', 'Madagascar', '+261', 9, 9],
  ['EG', 'مصر', 'Egypt', '+20', 10, 10],
  ['MA', 'المغرب', 'Morocco', '+212', 9, 9],
  ['MK', 'مقدونيا الشمالية', 'North Macedonia', '+389', 8, 8],
  ['MX', 'المكسيك', 'Mexico', '+52', 10, 10],
  ['MW', 'ملاوي', 'Malawi', '+265', 9, 9],
  ['GB', 'المملكة المتحدة', 'United Kingdom', '+44', 10, 10],
  ['MN', 'منغوليا', 'Mongolia', '+976', 8, 8],
  ['MR', 'موريتانيا', 'Mauritania', '+222', 8, 8],
  ['MU', 'موريشيوس', 'Mauritius', '+230', 8, 8],
  ['MZ', 'موزمبيق', 'Mozambique', '+258', 9, 9],
  ['MD', 'مولدوفا', 'Moldova', '+373', 8, 8],
  ['MC', 'موناكو', 'Monaco', '+377', 8, 9],
  ['MM', 'ميانمار', 'Myanmar', '+95', 8, 10],
  ['FM', 'ميكرونيسيا', 'Micronesia', '+691', 7, 7],
  ['NA', 'ناميبيا', 'Namibia', '+264', 9, 9],
  ['NR', 'ناورو', 'Nauru', '+674', 7, 7],
  ['NO', 'النرويج', 'Norway', '+47', 8, 8],
  ['AT', 'النمسا', 'Austria', '+43', 10, 11],
  ['NP', 'نيبال', 'Nepal', '+977', 10, 10],
  ['NE', 'النيجر', 'Niger', '+227', 8, 8],
  ['NG', 'نيجيريا', 'Nigeria', '+234', 10, 10],
  ['NI', 'نيكاراغوا', 'Nicaragua', '+505', 8, 8],
  ['NZ', 'نيوزيلندا', 'New Zealand', '+64', 8, 10],
  ['HT', 'هايتي', 'Haiti', '+509', 8, 8],
  ['IN', 'الهند', 'India', '+91', 10, 10],
  ['HN', 'هندوراس', 'Honduras', '+504', 8, 8],
  ['NL', 'هولندا', 'Netherlands', '+31', 9, 9],
  ['HK', 'هونغ كونغ', 'Hong Kong', '+852', 8, 8],
  ['US', 'الولايات المتحدة', 'United States', '+1', 10, 10],
  ['JP', 'اليابان', 'Japan', '+81', 10, 10],
  ['YE', 'اليمن', 'Yemen', '+967', 9, 9],
  ['GR', 'اليونان', 'Greece', '+30', 10, 10],
];

const ARABIC_COLLATOR =
  typeof Intl !== 'undefined' && typeof Intl.Collator === 'function'
    ? new Intl.Collator('ar')
    : null;

function compareArabicNames(a: string, b: string): number {
  if (ARABIC_COLLATOR) {
    return ARABIC_COLLATOR.compare(a, b);
  }
  return a.localeCompare(b, 'ar');
}

function normalizeArabicText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
}

function stripArabicDefiniteArticle(normalizedText: string): string {
  return normalizedText.replace(/(^|\s)ال/g, '$1');
}

export const COUNTRY_OPTIONS: CountryDialOption[] = RAW_COUNTRIES.map(
  ([code, nameAr, nameEn, dialCode, minDigits, maxDigits]) => ({
    code,
    nameAr,
    nameEn,
    dialCode,
    minDigits,
    maxDigits,
  })
).sort((a, b) => compareArabicNames(a.nameAr, b.nameAr));

export const COUNTRY_BY_CODE: Record<string, CountryDialOption> = COUNTRY_OPTIONS.reduce(
  (acc, item) => {
    acc[item.code] = item;
    return acc;
  },
  {} as Record<string, CountryDialOption>
);

export const DEFAULT_COUNTRY: CountryDialOption =
  COUNTRY_BY_CODE.EG ?? COUNTRY_OPTIONS[0];

const SEARCH_INDEX = COUNTRY_OPTIONS.map((item) => {
  const normAr = normalizeArabicText(item.nameAr);
  const noAlAr = stripArabicDefiniteArticle(normAr);
  return {
    item,
    normAr,
    noAlAr,
    normEn: item.nameEn.toLowerCase(),
    codeLower: item.code.toLowerCase(),
    dialDigits: item.dialCode.replace(/[^0-9]/g, ''),
  };
});

export function filterCountries(query: string): CountryDialOption[] {
  const normalizedQuery = normalizeArabicText(query);
  if (!normalizedQuery) {
    return COUNTRY_OPTIONS;
  }

  const queryNoAl = stripArabicDefiniteArticle(normalizedQuery);
  const digitQuery = query.replace(/[^0-9]/g, '');

  const prefixMatches: CountryDialOption[] = [];
  const substringMatches: CountryDialOption[] = [];

  for (const entry of SEARCH_INDEX) {
    const isPrefix =
      entry.normAr.startsWith(normalizedQuery) ||
      entry.noAlAr.startsWith(normalizedQuery) ||
      (Boolean(queryNoAl) && entry.noAlAr.startsWith(queryNoAl)) ||
      entry.normEn.startsWith(normalizedQuery) ||
      entry.codeLower === normalizedQuery ||
      (Boolean(digitQuery) && entry.dialDigits.startsWith(digitQuery));

    if (isPrefix) {
      prefixMatches.push(entry.item);
      continue;
    }

    const isSubstring =
      entry.normAr.includes(normalizedQuery) ||
      entry.noAlAr.includes(normalizedQuery) ||
      (Boolean(queryNoAl) && entry.noAlAr.includes(queryNoAl)) ||
      entry.normEn.includes(normalizedQuery) ||
      (Boolean(digitQuery) && entry.dialDigits.includes(digitQuery));

    if (isSubstring) {
      substringMatches.push(entry.item);
    }
  }

  return prefixMatches.length || substringMatches.length
    ? [...prefixMatches, ...substringMatches]
    : [];
}
