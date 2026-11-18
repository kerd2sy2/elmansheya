export interface CraftsmanCategory {
  id: string;
  slug: string;
  name_ar: string;
  icon_name: string;
}

export interface CraftsmanWorkItem {
  id: string;
  title: string;
  image_url: string;
  description?: string;
}

export interface CraftsmanReviewItem {
  id: string;
  craftsman_id: string;
  craftsman_name?: string;
  stars: number;
  comment: string;
  user_name: string;
  user_phone?: string;
  updated_at: string;
}

export interface CraftsmanItem {
  id: string;
  full_name: string;
  nickname: string;
  specialty: string;
  phone: string;
  area: string;
  is_accredited: boolean;
  average_rating: number;
  ratings_count: number;
  services_description: string;
  portfolio?: CraftsmanWorkItem[];
}

export const ALL_CRAFTSMEN_CATEGORIES: CraftsmanCategory[] = [
  { id: 'cat-1', slug: 'electricity', name_ar: 'كهرباء منازل', icon_name: 'flash-outline' },
  { id: 'cat-2', slug: 'plumbing', name_ar: 'سباكة وصحي', icon_name: 'water-outline' },
  { id: 'cat-3', slug: 'carpentry', name_ar: 'نجارة خشب', icon_name: 'hammer-outline' },
  { id: 'cat-4', slug: 'painting', name_ar: 'نقاشة ودهانات', icon_name: 'color-palette-outline' },
  { id: 'cat-5', slug: 'masonry', name_ar: 'بناء ومحارة', icon_name: 'layers-outline' },
  { id: 'cat-6', slug: 'ceramics', name_ar: 'سيراميك وبلاط', icon_name: 'grid-outline' },
  { id: 'cat-7', slug: 'blacksmith', name_ar: 'حدادة وكريتال', icon_name: 'shield-outline' },
  { id: 'cat-8', slug: 'alumetal', name_ar: 'ألوميتال وزجاج', icon_name: 'browsers-outline' },
  { id: 'cat-9', slug: 'gypsum', name_ar: 'جبس بورد', icon_name: 'sparkles-outline' },
  { id: 'cat-10', slug: 'appliances', name_ar: 'أجهزة منزلية', icon_name: 'construct-outline' },
  { id: 'cat-11', slug: 'hvac', name_ar: 'تكييف وتبريد', icon_name: 'snow-outline' },
  { id: 'cat-12', slug: 'satellite_cctv', name_ar: 'دش وكاميرات', icon_name: 'videocam-outline' },
  { id: 'cat-13', slug: 'water_filters', name_ar: 'فلاتر مياه', icon_name: 'filter-outline' },
  { id: 'cat-14', slug: 'marble', name_ar: 'رخام وجرانيت', icon_name: 'cube-outline' },
  { id: 'cat-15', slug: 'wood_painting', name_ar: 'استورجي أخشاب', icon_name: 'brush-outline' },
  { id: 'cat-16', slug: 'upholstery', name_ar: 'تنجيد وستائر', icon_name: 'bed-outline' },
  { id: 'cat-17', slug: 'reinforced_carpentry', name_ar: 'نجارة مسلح', icon_name: 'business-outline' },
  { id: 'cat-18', slug: 'auto_mechanic', name_ar: 'ميكانيكا سيارات', icon_name: 'car-sport-outline' },
  { id: 'cat-19', slug: 'auto_electric', name_ar: 'كهرباء سيارات', icon_name: 'battery-charging-outline' },
  { id: 'cat-20', slug: 'welding_lathe', name_ar: 'خراطة ولحام', icon_name: 'cog-outline' },
  { id: 'cat-21', slug: 'agri_machinery', name_ar: 'ماكينات زراعية', icon_name: 'leaf-outline' },
  { id: 'cat-22', slug: 'solar_pumps', name_ar: 'طاقة شمسية', icon_name: 'sunny-outline' },
  { id: 'cat-23', slug: 'mobile_pc', name_ar: 'موبايل وكمبيوتر', icon_name: 'phone-portrait-outline' },
  { id: 'cat-24', slug: 'tailoring', name_ar: 'خياطة وتفصيل', icon_name: 'cut-outline' },
  { id: 'cat-25', slug: 'barber', name_ar: 'حلاقة ورجالي', icon_name: 'person-outline' },
  { id: 'cat-26', slug: 'bakery_oven', name_ar: 'أفران وبوتاجازات', icon_name: 'flame-outline' },
  { id: 'cat-27', slug: 'moving_labor', name_ar: 'نقل عفش', icon_name: 'bus-outline' },
  { id: 'cat-28', slug: 'insulation', name_ar: 'عزل أسطح', icon_name: 'umbrella-outline' },
  { id: 'cat-29', slug: 'pest_cleaning', name_ar: 'مكافحة حشرات', icon_name: 'shield-checkmark-outline' },
  { id: 'cat-30', slug: 'sound_lighting', name_ar: 'فراشة ومناسبات', icon_name: 'volume-high-outline' },
];
