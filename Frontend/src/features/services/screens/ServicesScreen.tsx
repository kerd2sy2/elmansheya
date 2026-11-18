import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  useSafeBottomTabPadding,
  useSafeTopInset,
} from '@/core/theme/useSafeTopInset';
import { rtlFlexDirection, rtlTextAlign } from '@/core/theme/rtl';
import { fetchModuleData } from '@/core/api-client/apiClient';
import { WidgetErrorBoundary } from '@/core/error-boundary/WidgetErrorBoundary';
import { useAuth } from '@/features/auth/context/AuthContext';
import { API_BASE_URL } from '@/core/config/api.config';
import { ServiceCategoryGridCard } from '../components/ServiceCategoryGridCard';
import {
  ServiceCategoryItem,
  ServiceDetailItem,
  ServiceSubCategory,
} from '../types/services.types';

/* ========================================================
   أقسام الخدمات الـ ٨ الرئيسية وتفريعاتها الدقيقة (حسب طلب أهالي القرية)
   ======================================================== */
export const ALL_SERVICE_CATEGORIES: ServiceCategoryItem[] = [
  {
    id: 'medical',
    slug: 'medical',
    name_ar: 'طبي',
    icon: 'medkit-outline',
    description: 'الصيدليات، المعامل، المستشفيات، والوحدة والمستوصف',
    subcategories: [
      {
        id: 'pharmacies',
        slug: 'pharmacies',
        name_ar: 'الصيدليات',
        icon: 'bandage-outline',
        description: 'الصيدليات المناوبة وتوصيل الأدوية للمنازل بالقرية',
      },
      {
        id: 'labs',
        slug: 'labs',
        name_ar: 'المعامل',
        icon: 'flask-outline',
        description: 'معامل التحاليل الطبية وسحب العينات المنزلية لكبار السن',
      },
      {
        id: 'hospitals',
        slug: 'hospitals',
        name_ar: 'المستشفيات',
        icon: 'business-outline',
        description: 'المستشفيات المركزية والعامة وأقسام الطوارئ القريبة',
      },
      {
        id: 'clinic_unit',
        slug: 'clinic_unit',
        name_ar: 'الوحدة والمستوصف',
        icon: 'pulse-outline',
        description: 'الوحدة الصحية بالقرية، التطعيمات، والمستوصفات الخيرية',
      },
    ],
  },
  {
    id: 'events',
    slug: 'events',
    name_ar: 'المناسبات',
    icon: 'calendar-outline',
    description: 'الأفراح، المياتم، وسرادقات العزاء وتكريم الإنسان',
    subcategories: [
      {
        id: 'weddings',
        slug: 'weddings',
        name_ar: 'الأفراح',
        icon: 'sparkles-outline',
        description: 'قاعات الأفراح والمناسبات، الفراشة، والصوتيات بالقرية',
      },
      {
        id: 'funerals',
        slug: 'funerals',
        name_ar: 'المياتم أو الأموات',
        icon: 'heart-outline',
        description: 'صوان العزاء، سيارات تكريم الموتى، ومسؤولي التجهيز والدفن',
      },
    ],
  },
  {
    id: 'transport',
    slug: 'transport',
    name_ar: 'المواصلات',
    icon: 'car-outline',
    description: 'العربيات، التكاتك، وتاكسي المشاوير الخاصة',
    subcategories: [
      {
        id: 'microbus',
        slug: 'microbus',
        name_ar: 'العربيات',
        icon: 'bus-outline',
        description: 'مواقف الميكروباص، خطوط السير اليومية، وأرقام السائقين',
      },
      {
        id: 'tuktuk',
        slug: 'tuktuk',
        name_ar: 'التكاتك',
        icon: 'bicycle-outline',
        description: 'التوصيل المحلي والمشاوير الداخلية ومسؤولي شكاوى التكاتك',
      },
      {
        id: 'taxi',
        slug: 'taxi',
        name_ar: 'تاكسي',
        icon: 'car-sport-outline',
        description: 'سيارات الأجرة والمشاوير الخاصة للمطارات والمستشفيات',
      },
    ],
  },
  {
    id: 'education',
    slug: 'education',
    name_ar: 'المدارس',
    icon: 'school-outline',
    description: 'ابتدائي، إعدادي، ثانوي، وأزهري',
    subcategories: [
      {
        id: 'primary_schools',
        slug: 'primary_schools',
        name_ar: 'ابتدائي',
        icon: 'happy-outline',
        description: 'المدارس الابتدائية ورياض الأطفال بالقرية',
      },
      {
        id: 'prep_schools',
        slug: 'prep_schools',
        name_ar: 'إعدادي',
        icon: 'book-outline',
        description: 'المدارس الإعدادية بنين وبنات بالقرية',
      },
      {
        id: 'secondary_schools',
        slug: 'secondary_schools',
        name_ar: 'ثانوي',
        icon: 'library-outline',
        description: 'المدارس الثانوية العامة والفنية والتجارية المحيطة',
      },
      {
        id: 'azhar_schools',
        slug: 'azhar_schools',
        name_ar: 'أزهري',
        icon: 'school-outline',
        description: 'المعاهد الأزهرية بنين وبنات بالقرية',
      },
    ],
  },
  {
    id: 'religious',
    slug: 'religious',
    name_ar: 'ديني',
    icon: 'moon-outline',
    description: 'المساجد، الكنائس، ومكاتب تحفيظ القرآن الكريم',
    subcategories: [
      {
        id: 'mosques',
        slug: 'mosques',
        name_ar: 'مساجد',
        icon: 'moon-outline',
        description: 'المساجد الكبرى والزوايا ومكاتب تحفيظ القرآن الكريم بالقرية',
      },
      {
        id: 'churches',
        slug: 'churches',
        name_ar: 'كنائس',
        icon: 'sunny-outline',
        description: 'الكنائس، مواعيد القداسات، والخدمات الرعوية والاجتماعية',
      },
    ],
  },
  {
    id: 'gov',
    slug: 'gov',
    name_ar: 'حكومي',
    icon: 'business-outline',
    description: 'محطة المياه، الشهر العقاري، البريد المصري، والخدمات',
    subcategories: [
      {
        id: 'water_station',
        slug: 'water_station',
        name_ar: 'محطة المياه',
        icon: 'water-outline',
        description: 'محطة مياه الشرب، شبكات الصيانة، وطوارئ الكسور والأعطال',
      },
      {
        id: 'real_estate_reg',
        slug: 'real_estate_reg',
        name_ar: 'الشهر العقاري',
        icon: 'document-text-outline',
        description: 'مكتب التوثيق والشهر العقاري واستخراج التوكيلات والعقود',
      },
      {
        id: 'egypt_post',
        slug: 'egypt_post',
        name_ar: 'البريد المصري',
        icon: 'mail-outline',
        description: 'مكتب بريد المنشية، صرف المعاشات، الحوالات، ودفاتر التوفير',
      },
      {
        id: 'local_council',
        slug: 'local_council',
        name_ar: 'الوحدة المحلية والتموين',
        icon: 'business-outline',
        description: 'مقر الوحدة المحلية للقرية، تراخيص البناء، ومكتب التموين',
      },
      {
        id: 'agricultural_coop',
        slug: 'agricultural_coop',
        name_ar: 'الجمعية الزراعية',
        icon: 'leaf-outline',
        description: 'صرف الأسمدة، التقاوي، كروت الفلاح، والإرشاد الزراعي',
      },
    ],
  },
  {
    id: 'humanitarian',
    slug: 'humanitarian',
    name_ar: 'حالات إنسانية',
    icon: 'heart-outline',
    description: 'المساعدات العلاجية، كفالة الأيتام، والأسر المتعففة',
    subcategories: [
      {
        id: 'medical_aid',
        slug: 'medical_aid',
        name_ar: 'مساعدات علاجية وأدوية',
        icon: 'medkit-outline',
        description: 'توفير العلاج الشهري، الأجهزة التعويضية، وتكاليف العمليات',
      },
      {
        id: 'orphan_care',
        slug: 'orphan_care',
        name_ar: 'كفالة أيتام وأسر',
        icon: 'heart-outline',
        description: 'الكفالات الشهرية والمساعدات العينية للأسر الأولى بالرعاية',
      },
    ],
  },
  {
    id: 'shops',
    slug: 'shops',
    name_ar: 'محلات وأسواق',
    icon: 'cart-outline',
    description: 'المخابز التموينية، السوبر ماركت، ومحلات القرية',
    subcategories: [
      {
        id: 'bakeries',
        slug: 'bakeries',
        name_ar: 'المخابز والتموين',
        icon: 'nutrition-outline',
        description: 'المخابز الآلية، صرف الخبز المدعم بالبطاقة، والحلويات',
      },
      {
        id: 'supermarkets',
        slug: 'supermarkets',
        name_ar: 'سوبر ماركت وبقالة',
        icon: 'cart-outline',
        description: 'المواد الغذائية، البقالة، المجمدات، والمستلزمات المنزلية',
      },
    ],
  },
];

/* ========================================================
   بيانات الخدمات الموثقة الأساسية (Seed Data) لقرية المنشية
   ======================================================== */
const SEED_SERVICES_LIST: ServiceDetailItem[] = [
  // طبي - الصيدليات
  {
    id: 'med-ph-1',
    category_slug: 'medical',
    subcategory_slug: 'pharmacies',
    title: 'صيدلية د. أحمد فؤاد',
    description: 'صيدلية شاملة وتوصيل فوري للعلاجات والمستلزمات للمنازل بالقرية',
    phone: '01012345678',
    working_hours: 'خدمة 24 ساعة يومياً',
    address: 'شارع داير الناحية - بجوار الجمعية الاستهلاكية',
  },
  {
    id: 'med-ph-2',
    category_slug: 'medical',
    subcategory_slug: 'pharmacies',
    title: 'صيدلية الإيمان',
    description: 'قياس مجاني للضغط والسكر واستشارات دوائية وعناية بالأطفال',
    phone: '01123456789',
    working_hours: '8:00 ص حتى 12:00 منتصف الليل',
    address: 'الشارع الرئيسي - بجوار المسجد الكبير',
  },
  {
    id: 'med-ph-3',
    category_slug: 'medical',
    subcategory_slug: 'pharmacies',
    title: 'صيدلية الشفاء',
    description: 'توافر جميع أدوية التأمين الصحي والألبان والأمصال العلاجية',
    phone: '01234567890',
    working_hours: '9:00 ص حتى 1:00 بعد منتصف الليل',
    address: 'مدخل القرية الرئيسي - أمام كوبري المدخل',
  },

  // طبي - المعامل
  {
    id: 'med-lb-1',
    category_slug: 'medical',
    subcategory_slug: 'labs',
    title: 'معمل البرج للتحاليل الطبية',
    description: 'أحدث أجهزة التحاليل وسحب عينات منزلية لكبار السن والمرضى',
    phone: '01098765432',
    working_hours: '9:00 ص حتى 9:00 م يومياً عدا الجمعة',
    address: 'أمام الجمعية الزراعية - الدور الأول',
  },
  {
    id: 'med-lb-2',
    category_slug: 'medical',
    subcategory_slug: 'labs',
    title: 'معمل النخبة للتحاليل الشاملة',
    description: 'باقات فحص شامل وتحاليل وظائف كبد وكلى وسكر تراكمي بأسعار مخفضة',
    phone: '01551234567',
    working_hours: '10:00 ص حتى 8:00 م',
    address: 'شارع داير الناحية - أعلى صيدلية د. أحمد',
  },

  // طبي - المستشفيات
  {
    id: 'med-hs-1',
    category_slug: 'medical',
    subcategory_slug: 'hospitals',
    title: 'مستشفى المركز العام (طوارئ واستقبال)',
    description: 'أقرب مستشفى مركزي للقرية - أقسام جراحة، استقبال حوادث، وعناية مركزة',
    phone: '0133221144',
    working_hours: 'طوارئ 24 ساعة يومياً',
    address: 'طريق المركز الرئيسي - على بعد 10 دقائق من القرية',
  },
  {
    id: 'med-hs-2',
    category_slug: 'medical',
    subcategory_slug: 'hospitals',
    title: 'مستشفى الطوارئ والحضانات التخصصي',
    description: 'حضانات أطفال حديثي الولادة وبنك دم وغسيل كلوي طارئ',
    phone: '0122334455',
    working_hours: 'طوارئ على مدار الساعة',
    address: 'طريق المحطة العام',
  },

  // طبي - الوحدة والمستوصف
  {
    id: 'med-un-1',
    category_slug: 'medical',
    subcategory_slug: 'clinic_unit',
    title: 'الوحدة الصحية لقرية المنشية',
    description: 'تطعيمات المواليد والأطفال، متابعة الحوامل، رعاية الأسرة، وصرف الألبان المدعمة',
    phone: '01055566677',
    working_hours: '8:00 ص حتى 2:00 ظهراً (تطعيمات الأحد والأربعاء)',
    address: 'بجوار المدرسة الإعدادية - وسط القرية',
  },
  {
    id: 'med-un-2',
    category_slug: 'medical',
    subcategory_slug: 'clinic_unit',
    title: 'مستوصف أهل الخير الخيري',
    description: 'عيادات تخصصية مسائية (أطفال، باطنة، عظام، وأسنان) بأجر رمزي',
    phone: '01199887766',
    working_hours: '5:00 م حتى 10:00 م يومياً',
    address: 'مبنى المجمع الإسلامي - الشارع الشرقي',
  },

  // المناسبات - الأفراح
  {
    id: 'ev-wd-1',
    category_slug: 'events',
    subcategory_slug: 'weddings',
    title: 'دار مناسبات أهل القرية الكبرى',
    description: 'قاعة مكيفة مجهزة بالكامل للأفراح والخطوبات والندوات تسع 500 فرد',
    phone: '01066778899',
    working_hours: 'الحجز متاح طوال الأسبوع',
    address: 'شارع المعهد الديني - وسط القرية',
  },
  {
    id: 'ev-wd-2',
    category_slug: 'events',
    subcategory_slug: 'weddings',
    title: 'قاعة ومسرح المنشية للأفراح والمناسبات',
    description: 'تجهيز كوشة، أنظمة إضاءة، تصوير فوتوغرافي، وبوفيه متكامل',
    phone: '01155443322',
    working_hours: 'مفتوح للحجوزات من 10 ص حتى 10 م',
    address: 'المدخل الشرقي للقرية',
  },

  // المناسبات - المياتم أو الأموات
  {
    id: 'ev-fn-1',
    category_slug: 'events',
    subcategory_slug: 'funerals',
    title: 'سيارة تكريم الإنسان (نقل الموتى مجاناً)',
    description: 'سيارة مجهزة لنقل الجثامين من وإلى أي مستشفى ومقابر القرية لوجه الله وبدون أي مقابل',
    phone: '01099887711',
    working_hours: 'متاح 24 ساعة على مدار اليوم لوجه الله',
    address: 'مقر الجمعية الخيرية بالمنشية',
  },
  {
    id: 'ev-fn-2',
    category_slug: 'events',
    subcategory_slug: 'funerals',
    title: 'صوان ومستلزمات العزاء الخيري',
    description: 'صوان كامل ومقاعد وكشافات وسماعات صوتية بدون أجر لأهالي القرية',
    phone: '01288776655',
    working_hours: 'جاهزية فورية على مدار 24 ساعة',
    address: 'مخازن لجنة الزكاة - بجوار المسجد الكبير',
  },
  {
    id: 'ev-fn-3',
    category_slug: 'events',
    subcategory_slug: 'funerals',
    title: 'مقابر القرية ومسؤول التجهيز والدفن',
    description: 'مغسلة الموتى الشرعية وتجهيز المقابر وتوفير الأكفان الشرعية',
    phone: '01011223344',
    working_hours: 'متاح في أي وقت عند الوفاة',
    address: 'طريق المقابر الشرقي',
  },

  // المواصلات - العربيات
  {
    id: 'tr-mb-1',
    category_slug: 'transport',
    subcategory_slug: 'microbus',
    title: 'موقف ميكروباص المنشية - المركز الرئيسي',
    description: 'سيارات خط سير منتظم لنقل الركاب والموظفين والطلبة يومياً',
    phone: '01033445566',
    working_hours: 'من 6:00 ص حتى 10:30 م يومياً',
    address: 'الموقف الرئيسي - بجوار مدخل كوبري القرية',
  },
  {
    id: 'tr-mb-2',
    category_slug: 'transport',
    subcategory_slug: 'microbus',
    title: 'خط ميكروباص المنشية - المحطة والقطار',
    description: 'سيارات دورية متجهة لمحطة القطار لخدمة السفر السريع',
    phone: '01144556677',
    working_hours: 'من 6:30 ص حتى 9:00 م',
    address: 'شارع الموقف القديم',
  },

  // المواصلات - التكاتك
  {
    id: 'tr-tk-1',
    category_slug: 'transport',
    subcategory_slug: 'tuktuk',
    title: 'مكتب سائقي التوكتوك والمفقودات',
    description: 'للمشاوير السريعة داخل القرية والإبلاغ عن الأمانات والمفقودات في التكاتك',
    phone: '01222334411',
    working_hours: 'من 6:00 ص حتى 1:00 بعد منتصف الليل',
    address: 'ميدان كوبري المدخل',
  },
  {
    id: 'tr-tk-2',
    category_slug: 'transport',
    subcategory_slug: 'tuktuk',
    title: 'دليفري وتوصيل طلبات بالتوكتوك',
    description: 'توصيل الطلبات والمشتريات من المحلات والصيدليات حتى باب البيت',
    phone: '01555667788',
    working_hours: 'طوال اليوم حتى منتصف الليل',
    address: 'خدمة تغطي كافة شوارع وعزب القرية',
  },

  // المواصلات - تاكسي
  {
    id: 'tr-tx-1',
    category_slug: 'transport',
    subcategory_slug: 'taxi',
    title: 'تاكسي القرية للمشاوير الخاصة والمطارات',
    description: 'سيارات حديثة مكيفة للحجز المسبق للمطارات، المشاوير العائلية، والطوارئ',
    phone: '01077889900',
    working_hours: 'حجز مسبق ومتاح على مدار الساعة للطوارئ',
    address: 'المنشية ومحيطها',
  },

  // المدارس - ابتدائي
  {
    id: 'ed-pr-1',
    category_slug: 'education',
    subcategory_slug: 'primary_schools',
    title: 'مدرسة المنشية الابتدائية المشتركة',
    description: 'مدرسة تعليم أساسي حكومية - إدارة التربية والتعليم - كادر تدريسي متكامل',
    phone: '01022334455',
    working_hours: 'من 7:30 ص حتى 1:30 ظهراً',
    address: 'شارع المدارس - وسط القرية',
  },
  {
    id: 'ed-pr-2',
    category_slug: 'education',
    subcategory_slug: 'primary_schools',
    title: 'مدرسة الأمل الابتدائية الجديدة',
    description: 'فصول نموذجية ورياض أطفال وأنشطة تعليمية وتربوية',
    phone: '01133445566',
    working_hours: 'فترة صباحية (7:30 ص : 1:30 ظ)',
    address: 'الشارع الغربي للقرية',
  },

  // المدارس - إعدادي
  {
    id: 'ed-pp-1',
    category_slug: 'education',
    subcategory_slug: 'prep_schools',
    title: 'مدرسة المنشية الإعدادية بنين',
    description: 'تعليم إعدادي حكومي ومعامل حاسب آلي وعلوم وأنشطة رياضية',
    phone: '01244556677',
    working_hours: 'من 7:30 ص حتى 1:30 ظهراً',
    address: 'شارع المدارس - بجوار الوحدة الصحية',
  },
  {
    id: 'ed-pp-2',
    category_slug: 'education',
    subcategory_slug: 'prep_schools',
    title: 'مدرسة المنشية الإعدادية بنات',
    description: 'بيئة تعليمية متميزة ونشاط مدرسي ودروس تقوية مجانية',
    phone: '01555664433',
    working_hours: 'فترة صباحية منتظمة',
    address: 'شارع المدارس - مبنى مستقل',
  },

  // المدارس - ثانوي
  {
    id: 'ed-sc-1',
    category_slug: 'education',
    subcategory_slug: 'secondary_schools',
    title: 'مدرسة الشهداء الثانوية المشتركة',
    description: 'أقرب مدرسة ثانوية عامة وتجارية وصناعية تخدم أبناء وبنات القرية',
    phone: '01099881122',
    working_hours: 'من 7:45 ص حتى 2:00 ظهراً',
    address: 'طريق المجمع التعليمي العام',
  },

  // المدارس - أزهري
  {
    id: 'ed-az-1',
    category_slug: 'education',
    subcategory_slug: 'azhar_schools',
    title: 'معهد المنشية الابتدائي الأزهري',
    description: 'معهد أزهري شريف لتعليم القرآن الكريم والعلوم الشرعية والحديثة',
    phone: '01177665544',
    working_hours: 'من 7:30 ص حتى 1:30 ظهراً',
    address: 'شارع المعهد الأزهري - بجوار المسجد الكبير',
  },
  {
    id: 'ed-az-2',
    category_slug: 'education',
    subcategory_slug: 'azhar_schools',
    title: 'المعهد الديني الإعدادي الثانوي الأزهري',
    description: 'قسم بنين وقسم فتيات - شهادة إعدادية وثانوية أزهرية معتمدة',
    phone: '01299887766',
    working_hours: 'فترة صباحية أزهرية',
    address: 'شارع المعهد الديني العام',
  },

  // ديني - مساجد
  {
    id: 'rel-mq-1',
    category_slug: 'religious',
    subcategory_slug: 'mosques',
    title: 'المسجد الكبير بالمنشية',
    description: 'أقدم وأكبر مساجد القرية - إمام وخطيب الأوقاف - مصلى رجال وسيدات وصلاة الجمعة',
    phone: '01022339900',
    working_hours: 'مفتوح للصلوات الخمس يومياً',
    address: 'ميدان وسط البلد بالقرية',
  },
  {
    id: 'rel-mq-2',
    category_slug: 'religious',
    subcategory_slug: 'mosques',
    title: 'مسجد الرحمن (المجمع الإسلامي)',
    description: 'مسجد جامع ومكتب تحفيظ براعم ومقر مقرأة القرآن الأسبوعية',
    phone: '01188776633',
    working_hours: 'مفتوح طوال اليوم',
    address: 'الشارع الشرقي للقرية',
  },
  {
    id: 'rel-mq-3',
    category_slug: 'religious',
    subcategory_slug: 'mosques',
    title: 'مسجد النور',
    description: 'إقامة الصلوات الخمس ومصلى واسع ومصلى العيدين',
    phone: '01233448877',
    working_hours: 'الصلوات الخمس والجمعة',
    address: 'شارع داير الناحية',
  },

  // ديني - كنائس
  {
    id: 'rel-ch-1',
    category_slug: 'religious',
    subcategory_slug: 'churches',
    title: 'كنيسة السيدة العذراء والشهيد مارجرجس',
    description: 'مواعيد القداسات الصباحية (الأحد والجمعة) والخدمات الاجتماعية والرعوية',
    phone: '01044556688',
    working_hours: 'قداسات وخدمات رعوية منتظمة',
    address: 'الشارع الرئيسي - مدخل القرية',
  },
  {
    id: 'rel-ch-2',
    category_slug: 'religious',
    subcategory_slug: 'churches',
    title: 'كنيسة رئيس الملائكة ميخائيل',
    description: 'قداسات روحية، رعاية الأسر، واجتماعات مدارس الأحد والشباب',
    phone: '01155667799',
    working_hours: 'مواعيد الصلاة والخدمات الدورية',
    address: 'بجوار الطريق الزراعي العام',
  },

  // حكومي - محطة المياه
  {
    id: 'gv-wt-1',
    category_slug: 'gov',
    subcategory_slug: 'water_station',
    title: 'محطة مياه شرب القرية وشبكات الصيانة',
    description: 'بلاغات طوارئ كسر المواسير، انقطاع المياه، وضعف الضغط الميداني في الشوارع',
    phone: '01011229988',
    working_hours: 'طوارئ الصيانة والشبكات 24 ساعة',
    address: 'طريق الترعة الرئيسي - مدخل المحطة',
  },

  // حكومي - الشهر العقاري
  {
    id: 'gv-re-1',
    category_slug: 'gov',
    subcategory_slug: 'real_estate_reg',
    title: 'مكتب توثيق وشهر عقاري المنشية',
    description: 'توثيق التوكيلات، عقود البيع والإيجار، والتصديق على التوقيعات الرسمية',
    phone: '01277889911',
    working_hours: 'من 9:00 ص حتى 2:00 ظهراً يومياً عدا الجمعة والسبت',
    address: 'مبنى المجمع الحكومي - الدور الثاني',
  },

  // حكومي - البريد المصري
  {
    id: 'gv-po-1',
    category_slug: 'gov',
    subcategory_slug: 'egypt_post',
    title: 'مكتب بريد المنشية المركزي',
    description: 'صرف المعاشات، الحوالات البريدية السريعة، بطاقات فيزا إيزي باي، ودفاتر التوفير',
    phone: '01144332211',
    working_hours: 'من 8:00 ص حتى 3:00 م من الأحد إلى الخميس',
    address: 'بجوار مبنى السنترال القديم - الشارع العام',
  },

  // حكومي - الوحدة المحلية والتموين
  {
    id: 'gv-lc-1',
    category_slug: 'gov',
    subcategory_slug: 'local_council',
    title: 'مقر الوحدة المحلية بالقرية',
    description: 'استخراج تراخيص البناء، شهادات المتغيرات المكانية، ومتابعة النظافة والإنارة',
    phone: '01088992244',
    working_hours: 'من 8:30 ص حتى 2:30 ظهراً',
    address: 'الشارع الرئيسي - مبنى الوحدة المحلية',
  },
  {
    id: 'gv-lc-2',
    category_slug: 'gov',
    subcategory_slug: 'local_council',
    title: 'مكتب تموين قرية المنشية',
    description: 'إصدار بطاقات التموين، بدل تالف وفاقد، الفصل الاجتماعي، وتظلمات البطاقات',
    phone: '01299001122',
    working_hours: 'من 8:30 ص حتى 2:00 ظهراً',
    address: 'أمام الجمعية الزراعية',
  },

  // حكومي - الجمعية الزراعية
  {
    id: 'gv-ag-1',
    category_slug: 'gov',
    subcategory_slug: 'agricultural_coop',
    title: 'الجمعية الزراعية بالمنشية',
    description: 'صرف حصص الأسمدة المدعمة، استخراج كارت الفلاح، وصرف التقاوي والمبيدات المعتمدة',
    phone: '01055443322',
    working_hours: 'من 8:00 ص حتى 2:00 ظهراً',
    address: 'طريق الحقول - مجمع الجمعية الزراعية',
  },

  // حالات إنسانية - مساعدات علاجية وأدوية
  {
    id: 'hm-md-1',
    category_slug: 'humanitarian',
    subcategory_slug: 'medical_aid',
    title: 'لجنة الزكاة وتوفير الأدوية بالقرية',
    description: 'صرف شهري للأدوية المزمنة للمستحقين، توفير الكراسي المتحركة، وأنابيب الأكسجين مجاناً',
    phone: '01099882233',
    working_hours: 'التواصل متاح يومياً على مدار اليوم',
    address: 'مقر لجنة الزكاة - المسجد الكبير',
  },

  // حالات إنسانية - كفالة أيتام وأسر
  {
    id: 'hm-or-1',
    category_slug: 'humanitarian',
    subcategory_slug: 'orphan_care',
    title: 'جمعية أهل المنشية لرعاية الأيتام',
    description: 'كفالة أيتام شهرية موثقة، تجهيز عرائس، وتوزيع كراتين غذائية في المواسم',
    phone: '01122446688',
    working_hours: 'من 9:00 ص حتى 5:00 م',
    address: 'بجوار مدرسة الأمل الابتدائية',
  },

  // محلات وأسواق - المخابز والتموين
  {
    id: 'sh-bk-1',
    category_slug: 'shops',
    subcategory_slug: 'bakeries',
    title: 'مخبز المنشية الآلي البلدي',
    description: 'صرف الخبز البلدي المدعم بالبطاقة التموينية بجودة ومتابعة مستمرة',
    phone: '01033221199',
    working_hours: 'يومياً من 5:00 ص حتى انتهاء الحصة المقررة',
    address: 'شارع الجمعية الزراعية',
  },
  {
    id: 'sh-bk-2',
    category_slug: 'shops',
    subcategory_slug: 'bakeries',
    title: 'مخبز وحلواني الرحمة',
    description: 'عيش فينو، بقسماط، مخبوزات طازجة، وحلويات شرقية وغربية',
    phone: '01122338899',
    working_hours: 'من 6:00 ص حتى 11:00 م',
    address: 'الشارع التجاري بالقرية',
  },

  // محلات وأسواق - سوبر ماركت وبقالة
  {
    id: 'sh-sm-1',
    category_slug: 'shops',
    subcategory_slug: 'supermarkets',
    title: 'سوبر ماركت البركة (جملة وقطاعي)',
    description: 'مواد تموينية، ألبان، جبن، مجمدات، ومستلزمات منزلية مع توصيل مجاني',
    phone: '01066554433',
    working_hours: 'من 7:00 ص حتى 1:00 بعد منتصف الليل',
    address: 'داير الناحية - أمام مدرسة الأمل',
  },
  {
    id: 'sh-sm-2',
    category_slug: 'shops',
    subcategory_slug: 'supermarkets',
    title: 'ماركت الأمانة للبقالة والمجمدات',
    description: 'سلع غذائية متكاملة وخضار مجمد ومستلزمات نظافة وأسعار تنافسية',
    phone: '01233445566',
    working_hours: 'طوال اليوم من 8 ص حتى 12 م',
    address: 'المدخل الشرقي للقرية',
  },
];

export function ServicesScreen() {
  const router = useRouter();
  const topInset = useSafeTopInset();
  const bottomTabPadding = useSafeBottomTabPadding();
  const { user } = useAuth();

  // المستوى الأول: القسم الرئيسي المختار (مثلاً: طبي، مواصلات، مدارس، ديني، حكومي...)
  const [selectedCategory, setSelectedCategory] =
    useState<ServiceCategoryItem | null>(null);

  // المستوى الثاني: الخدمة الفرعية المحددة (مثلاً: الصيدليات، المعامل، المستشفيات، التكاتك...)
  const [selectedSubCategory, setSelectedSubCategory] =
    useState<ServiceSubCategory | null>(null);

  const [allServices, setAllServices] =
    useState<ServiceDetailItem[]>(SEED_SERVICES_LIST);
  const [loadingItems, setLoadingItems] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // موديول إضافة خدمة جديدة في هذا القسم
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newHours, setNewHours] = useState<string>('');
  const [newAddress, setNewAddress] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // تحميل الخدمات المحدثة من السيرفر إن وُجدت
  const loadServerServices = useCallback(async () => {
    try {
      setLoadingItems(true);
      const res = await fetchModuleData<ServiceDetailItem[]>(
        'services',
        '/services/items',
        { cooldownMs: 0, fallbackData: [] }
      );
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        // دمج الخدمات من السيرفر مع الخدمات الأساسية ومنع التكرار
        const mergedMap = new Map<string, ServiceDetailItem>();
        SEED_SERVICES_LIST.forEach((s) => mergedMap.set(s.id, s));
        res.data.forEach((s) => mergedMap.set(s.id, s));
        setAllServices(Array.from(mergedMap.values()));
      }
    } catch {
      // وضع الأوفلاين يستخدم البيانات الموثقة الأساسية
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    loadServerServices();
  }, [loadServerServices]);

  // حساب عدد الخدمات في كل تفرع فرعي
  const countBySubcategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of allServices) {
      if (item.subcategory_slug) {
        counts[item.subcategory_slug] = (counts[item.subcategory_slug] || 0) + 1;
      }
    }
    return counts;
  }, [allServices]);

  // قائمة الخدمات المفلترة بحسب القسم الرئيسي والفرعي المختارين وكلمة البحث
  const filteredServices = useMemo(() => {
    if (!selectedCategory || !selectedSubCategory) return [];
    let list = allServices.filter(
      (s) =>
        s.category_slug === selectedCategory.slug &&
        s.subcategory_slug === selectedSubCategory.slug
    );

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          (s.address && s.address.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allServices, selectedCategory, selectedSubCategory, searchQuery]);

  /* ========================================================
     إدارة زر الرجوع الفيزيائي بالهاتف (Hardware Back Button)
     خطوة واحدة دائماً:
     المستوى الثاني (تفاصيل الخدمة الفرعية) ← المستوى الأول (كروت القسم) ← المستوى صفر (كل الخدمات) ← السجل السابق
     ======================================================== */
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (showAddModal) {
          setShowAddModal(false);
          return true;
        }
        if (selectedSubCategory) {
          setSelectedSubCategory(null);
          setSearchQuery('');
          return true;
        }
        if (selectedCategory) {
          setSelectedCategory(null);
          setSearchQuery('');
          return true;
        }
        return false;
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [showAddModal, selectedSubCategory, selectedCategory])
  );

  // إرسال وحفظ خدمة جديدة
  const handleCreateService = async () => {
    if (!newTitle.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة اسم الخدمة أو الجهة');
      return;
    }
    if (!selectedCategory || !selectedSubCategory) return;

    setIsSubmitting(true);
    const newServiceItem: ServiceDetailItem = {
      id: `srv-${Date.now()}`,
      category_slug: selectedCategory.slug,
      subcategory_slug: selectedSubCategory.slug,
      title: newTitle.trim(),
      description: newDesc.trim() || 'خدمة مسجلة في دليل قرية المنشية',
      phone: newPhone.trim() || undefined,
      working_hours: newHours.trim() || undefined,
      address: newAddress.trim() || 'قرية المنشية',
      created_at: new Date().toISOString(),
    };

    // حفظ فوري محلياً لضمان سرعة الاستجابة
    setAllServices((prev) => [newServiceItem, ...prev]);

    try {
      await fetch(`${API_BASE_URL}/services/create-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newServiceItem),
      });
    } catch {
      // Saved locally
    }

    setIsSubmitting(false);
    setShowAddModal(false);
    setNewTitle('');
    setNewDesc('');
    setNewPhone('');
    setNewHours('');
    setNewAddress('');
    Alert.alert('تمت الإضافة', `تمت إضافة «${newServiceItem.title}» بنجاح في قسم ${selectedSubCategory.name_ar}.`);
  };

  return (
    <View style={[styles.screenContainer, { paddingTop: topInset }]}>
      {selectedSubCategory && selectedCategory ? (
        /* ========================================================
           المستوى الثاني: صفحة الخدمة الفرعية المحددة (مثلاً: الصيدليات، المعامل، التكاتك...)
           مع سهم رجوع نظيف ومحاذاة يمين كاملة
           ======================================================== */
        <View style={styles.tabContainer}>
          <View style={styles.subPageFixedHeader}>
            <View style={styles.subPageHeaderRow}>
              {/* سهم الرجوع النظيف للعودة للقسم الرئيسي */}
              <Pressable
                style={styles.cleanBackArrowBtn}
                onPress={() => {
                  setSelectedSubCategory(null);
                  setSearchQuery('');
                }}
                hitSlop={12}
                accessibilityLabel="رجوع لقائمة الخدمات">
                <Ionicons
                  name="arrow-forward"
                  size={24}
                  color="#0F172A"
                />
              </Pressable>

              {/* عنوان الخدمة الفرعية مع الأيقونة بجانبه مباشرة */}
              <View style={styles.subPageTitleBlock}>
                <Ionicons
                  name={
                    (selectedSubCategory.icon ||
                      'checkmark-circle-outline') as keyof typeof Ionicons.glyphMap
                  }
                  size={22}
                  color="#973c00"
                />
                <Text style={styles.subPageMainTitle}>
                  {selectedSubCategory.name_ar}
                </Text>
              </View>

              {/* زر إضافة جهة أو خدمة جديدة في هذا القسم */}
              <Pressable
                style={styles.headerAddIconBtn}
                onPress={() => setShowAddModal(true)}
                hitSlop={8}
                accessibilityLabel="إضافة جهة أو خدمة جديدة">
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </Pressable>
            </View>
            <Text style={styles.subPageDesc}>{selectedSubCategory.description}</Text>
          </View>

          {/* شريط البحث السريع داخل خدمات هذا القسم */}
          <View style={styles.searchBarBox}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchBarInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={`ابحث في ${selectedSubCategory.name_ar} بالاسم أو المكان...`}
              placeholderTextColor="#94A3B8"
              textAlign="right"
              returnKeyType="search"
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: bottomTabPadding },
            ]}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            canCancelContentTouches={true}
            directionalLockEnabled={false}
            overScrollMode="always">
            <WidgetErrorBoundary widgetNameAr="قائمة الخدمات المحددة">
              <View style={styles.detailsHeaderRow}>
                <Text style={styles.detailsTitle}>
                  الجهات والخدمات المسجلة ({filteredServices.length})
                </Text>
              </View>

              {loadingItems && filteredServices.length === 0 ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color="#973c00" />
                  <Text style={styles.loadingText}>جاري تحميل البيانات...</Text>
                </View>
              ) : filteredServices.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="folder-open-outline" size={38} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>
                    {searchQuery
                      ? 'لا توجد نتائج تطابق بحثك'
                      : `لا توجد خدمات مسجلة بعد في «${selectedSubCategory.name_ar}»`}
                  </Text>
                  <Text style={styles.emptyDesc}>
                    اضغط على زر (+) في الأعلى لإضافة أول جهة أو رقم تواصل في هذا القسم لخدمة جيرانك بالقرية.
                  </Text>
                  <Pressable
                    style={styles.emptyAddBtn}
                    onPress={() => setShowAddModal(true)}>
                    <Ionicons name="add-circle" size={17} color="#FFFFFF" />
                    <Text style={styles.emptyAddBtnText}>إضافة جهة أو رقم في {selectedSubCategory.name_ar}</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.itemsList}>
                  {filteredServices.map((it) => (
                    <View key={it.id} style={styles.itemCard}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.itemTitle}>{it.title}</Text>
                      </View>
                      {it.description ? (
                        <Text style={styles.itemDesc}>{it.description}</Text>
                      ) : null}

                      {/* زر الاتصال السريع المباشر */}
                      {it.phone ? (
                        <Pressable
                          style={styles.callRow}
                          onPress={() => Linking.openURL(`tel:${it.phone}`)}>
                          <Ionicons name="call" size={14} color="#973c00" />
                          <Text style={styles.phoneText}>اتصال مباشر ({it.phone})</Text>
                        </Pressable>
                      ) : null}

                      {/* مواعيد العمل إن وُجدت */}
                      {it.working_hours ? (
                        <View style={styles.metaRow}>
                          <Ionicons name="time-outline" size={14} color="#64748B" />
                          <Text style={styles.metaText}>المواعيد: {it.working_hours}</Text>
                        </View>
                      ) : null}

                      {/* العنوان ومكان الخدمة بالقرية */}
                      {it.address ? (
                        <View style={styles.metaRow}>
                          <Ionicons name="location-outline" size={14} color="#64748B" />
                          <Text style={styles.metaText}>المكان: {it.address}</Text>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </WidgetErrorBoundary>
          </ScrollView>
        </View>
      ) : selectedCategory ? (
        /* ========================================================
           المستوى الأول: صفحة القسم المختار (طبي، مواصلات، مناسبات، مدارس...)
           تظهر كروت التفرعات الدقيقة (الصيدليات، المعامل، المستشفيات...)
           ======================================================== */
        <View style={styles.tabContainer}>
          <View style={styles.subPageFixedHeader}>
            <View style={styles.subPageHeaderRow}>
              {/* سهم الرجوع النظيف للعودة لكل الأقسام */}
              <Pressable
                style={styles.cleanBackArrowBtn}
                onPress={() => setSelectedCategory(null)}
                hitSlop={12}
                accessibilityLabel="رجوع لجميع أقسام الخدمات">
                <Ionicons
                  name="arrow-forward"
                  size={24}
                  color="#0F172A"
                />
              </Pressable>

              {/* عنوان القسم الرئيسي مع الأيقونة */}
              <View style={styles.subPageTitleBlock}>
                <Ionicons
                  name={
                    (selectedCategory.icon ||
                      'grid-outline') as keyof typeof Ionicons.glyphMap
                  }
                  size={22}
                  color="#973c00"
                />
                <Text style={styles.subPageMainTitle}>
                  {selectedCategory.name_ar}
                </Text>
              </View>
            </View>
            <Text style={styles.subPageDesc}>{selectedCategory.description}</Text>
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: bottomTabPadding },
            ]}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            canCancelContentTouches={true}
            directionalLockEnabled={false}
            overScrollMode="always">
            <WidgetErrorBoundary widgetNameAr="كروت الخدمات الفرعية">
              <View style={styles.detailsHeaderRow}>
                <Text style={styles.detailsTitle}>
                  اختر الخدمة المطلوبة ({selectedCategory.subcategories.length})
                </Text>
              </View>

              <View style={styles.grid}>
                {selectedCategory.subcategories.map((sub) => {
                  const subCount = countBySubcategory[sub.slug] || 0;
                  return (
                    <ServiceCategoryGridCard
                      key={sub.id}
                      item={sub}
                      isSelected={false}
                      count={subCount}
                      onPress={() => setSelectedSubCategory(sub)}
                    />
                  );
                })}
              </View>
            </WidgetErrorBoundary>
          </ScrollView>
        </View>
      ) : (
        /* ========================================================
           المستوى صفر: الصفحة الرئيسية للخدمات (هيدر ثابت وشبكة الأقسام الـ ٨ بدون مشاكل القرية)
           ======================================================== */
        <View style={styles.tabContainer}>
          <View style={styles.fixedHeader}>
            <View style={styles.headerTitlesBox}>
              <Text style={styles.title}>الخدمات</Text>
              <Text style={styles.headerSubtitle}>
                دليل الخدمات والمرافق والجهات الحيوية بقرية المنشية
              </Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: bottomTabPadding },
            ]}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            canCancelContentTouches={true}
            directionalLockEnabled={false}
            overScrollMode="always">
            <WidgetErrorBoundary widgetNameAr="شبكة أقسام الخدمات">
              <View style={styles.grid}>
                {ALL_SERVICE_CATEGORIES.map((cat) => (
                  <ServiceCategoryGridCard
                    key={cat.id}
                    item={cat}
                    isSelected={false}
                    count={cat.subcategories.length}
                    onPress={() => setSelectedCategory(cat)}
                  />
                ))}
              </View>
            </WidgetErrorBoundary>
          </ScrollView>
        </View>
      )}

      {/* ========================================================
         موديول إضافة جهة أو خدمة جديدة في القسم الفرعي
         ======================================================== */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowAddModal(false)}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowAddModal(false)}>
          <View
            style={styles.modalContainer}
            onStartShouldSetResponder={() => true}>
            <View style={styles.modalDragBar} />

            <View style={styles.modalTopRow}>
              <Text style={styles.modalHeading}>
                إضافة جهة في «{selectedSubCategory?.name_ar}»
              </Text>
              <Pressable
                onPress={() => setShowAddModal(false)}
                hitSlop={10}
                style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>
                الاسم أو الجهة <Text style={styles.star}>*</Text>
              </Text>
              <TextInput
                style={styles.inputField}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="مثال: صيدلية الأمل، تاكسي أبو علي..."
                placeholderTextColor="#94A3B8"
                textAlign="right"
              />

              <Text style={styles.inputLabel}>رقم الهاتف للاتصال المباشر</Text>
              <TextInput
                style={styles.inputField}
                value={newPhone}
                onChangeText={setNewPhone}
                placeholder="010XXXXXXXX"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                textAlign="right"
              />

              <Text style={styles.inputLabel}>المكان والعنوان بالقرية</Text>
              <TextInput
                style={styles.inputField}
                value={newAddress}
                onChangeText={setNewAddress}
                placeholder="مثال: شارع داير الناحية، بجوار المسجد الكبير..."
                placeholderTextColor="#94A3B8"
                textAlign="right"
              />

              <Text style={styles.inputLabel}>مواعيد العمل أو التواجد</Text>
              <TextInput
                style={styles.inputField}
                value={newHours}
                onChangeText={setNewHours}
                placeholder="مثال: 9 ص : 10 م، 24 ساعة..."
                placeholderTextColor="#94A3B8"
                textAlign="right"
              />

              <Text style={styles.inputLabel}>تفاصيل أو ملاحظات إضافية</Text>
              <TextInput
                style={[styles.inputField, styles.textAreaField]}
                value={newDesc}
                onChangeText={setNewDesc}
                placeholder="تفاصيل التخصص، الخدمات المتوفرة، أو الحجز..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                textAlign="right"
              />

              <Pressable
                style={styles.submitBtn}
                onPress={handleCreateService}
                disabled={isSubmitting}>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ ونشر الخدمة بالدليل'}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#FAF5EE' },
  tabContainer: { flex: 1, width: '100%' },
  content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 5 },
  fixedHeader: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FAF5EE',
    borderBottomWidth: 0,
    zIndex: 10,
  },
  headerTitlesBox: {
    gap: 2,
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  subPageFixedHeader: {
    backgroundColor: '#FAF5EE',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1E9DA',
  },
  subPageHeaderRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 10,
  },
  cleanBackArrowBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subPageTitleBlock: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  subPageMainTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  subPageDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginRight: 48,
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    lineHeight: 18,
  },
  headerAddIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#973c00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#973c00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  searchBarBox: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchBarInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0F172A',
    paddingVertical: 0,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: rtlTextAlign,
  },
  grid: {
    flexDirection: rtlFlexDirection,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailsHeaderRow: {
    marginBottom: 12,
    marginTop: 4,
  },
  detailsTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  itemsList: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'stretch',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  cardHeaderRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    flex: 1,
  },
  itemDesc: {
    fontSize: 13,
    color: '#475569',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    lineHeight: 20,
    marginBottom: 8,
    width: '100%',
  },
  callRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginBottom: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  phoneText: {
    fontSize: 12.5,
    color: '#973c00',
    fontWeight: '800',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  metaRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    marginVertical: 12,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 10,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  emptyAddBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#973c00',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  modalDragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTopRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeading: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: rtlTextAlign,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    textAlign: rtlTextAlign,
    marginBottom: 6,
    marginTop: 10,
  },
  star: {
    color: '#DC2626',
  },
  inputField: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: '#0F172A',
  },
  textAreaField: {
    height: 72,
    paddingTop: 8,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#973c00',
    borderRadius: 12,
    height: 46,
    marginTop: 20,
    marginBottom: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
