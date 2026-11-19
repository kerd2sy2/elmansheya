import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useSafeBottomTabPadding,
  useSafeTopInset,
} from '@/core/theme/useSafeTopInset';
import { rtlFlexDirection, rtlTextAlign } from '@/core/theme/rtl';
import { fetchModuleData } from '@/core/api-client/apiClient';
import { WidgetErrorBoundary } from '@/core/error-boundary/WidgetErrorBoundary';
import { ServiceCategoryGridCard } from '../components/ServiceCategoryGridCard';
import {
  ServiceCategoryItem,
  ServiceDetailItem,
  ServiceSubCategory,
} from '../types/services.types';

/* ========================================================
   أقسام الخدمات الـ ٨ الرئيسية وتفريعاتها الدقيقة لقرية المنشية
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
        description: 'التوصيل المحلي والمشاوير الداخلية ومسؤولو شكاوى التكاتك',
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

  // المستوى الأول: القسم الرئيسي المختار (طبي، مواصلات، مدارس، ديني، حكومي...)
  const [selectedCategory, setSelectedCategory] =
    useState<ServiceCategoryItem | null>(null);

  // المستوى الثاني: الخدمة الفرعية المحددة (الصيدليات، المعامل، المستشفيات، التكاتك...)
  const [selectedSubCategory, setSelectedSubCategory] =
    useState<ServiceSubCategory | null>(null);

  const [allServices, setAllServices] =
    useState<ServiceDetailItem[]>(SEED_SERVICES_LIST);
  const [loadingItems, setLoadingItems] = useState<boolean>(false);

  // تحميل أحدث بيانات الخدمات من السيرفر إن وُجدت
  const loadServerServices = useCallback(async () => {
    try {
      setLoadingItems(true);
      const res = await fetchModuleData<ServiceDetailItem[]>(
        'services',
        '/services/items',
        { cooldownMs: 0, fallbackData: [] }
      );
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const mergedMap = new Map<string, ServiceDetailItem>();
        SEED_SERVICES_LIST.forEach((s) => mergedMap.set(s.id, s));
        res.data.forEach((s) => mergedMap.set(s.id, s));
        setAllServices(Array.from(mergedMap.values()));
      }
    } catch {
      // وضع الأوفلاين يعتمد على البيانات المعتمدة محلياً
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    loadServerServices();
  }, [loadServerServices]);

  // قائمة الخدمات المفلترة بحسب القسم الرئيسي والفرعي المختارين
  const filteredServices = useMemo(() => {
    if (!selectedCategory || !selectedSubCategory) return [];
    return allServices.filter(
      (s) =>
        s.category_slug === selectedCategory.slug &&
        s.subcategory_slug === selectedSubCategory.slug
    );
  }, [allServices, selectedCategory, selectedSubCategory]);

  /* ========================================================
     إدارة زر الرجوع الفيزيائي بالهاتف (Hardware Back Button)
     خطوة واحدة دائماً:
     المستوى الثاني (قائمة الخدمات) ← المستوى الأول (كروت القسم في صف لوحده) ← المستوى صفر (كل الخدمات) ← السجل السابق
     ======================================================== */
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (selectedSubCategory) {
          setSelectedSubCategory(null);
          return true;
        }
        if (selectedCategory) {
          setSelectedCategory(null);
          return true;
        }
        return false;
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [selectedSubCategory, selectedCategory])
  );

  return (
    <View style={[styles.screenContainer, { paddingTop: topInset }]}>
      {selectedSubCategory && selectedCategory ? (
        /* ========================================================
           المستوى الثاني: صفحة تفاصيل الخدمة الفرعية المحددة (مثلاً: الصيدليات، المعامل، التكاتك...)
           بدون بحث، وبدون خط فاصل، وبدون إمكانية إضافة خدمة
           ======================================================== */
        <View style={styles.tabContainer}>
          <View style={styles.subPageFixedHeader}>
            <View style={styles.subPageHeaderRow}>
              {/* سهم الرجوع النظيف للعودة للقسم الرئيسي */}
              <Pressable
                style={styles.cleanBackArrowBtn}
                onPress={() => setSelectedSubCategory(null)}
                hitSlop={12}
                accessibilityLabel="رجوع لقائمة الخدمات">
                <Ionicons
                  name="arrow-forward"
                  size={24}
                  color="#0F172A"
                />
              </Pressable>

              {/* عنوان الخدمة الفرعية مع الأيقونة المعتمدة بثيم المنشية */}
              <View style={styles.subPageTitleBlock}>
                <View style={styles.headerIconBadge}>
                  <Ionicons
                    name={
                      (selectedSubCategory.icon ||
                        'checkmark-circle-outline') as keyof typeof Ionicons.glyphMap
                    }
                    size={22}
                    color="#973c00"
                  />
                </View>
                <Text style={styles.subPageMainTitle}>
                  {selectedSubCategory.name_ar}
                </Text>
              </View>
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
                    لا توجد خدمات مسجلة حالياً في «{selectedSubCategory.name_ar}»
                  </Text>
                  <Text style={styles.emptyDesc}>
                    يتم مراجعة وتحديث الأماكن والخدمات من قبل إدارة المنصة لخدمة أهالي القرية.
                  </Text>
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

                      {/* زر الاتصال السريع المباشر بثيم المنشية */}
                      {it.phone ? (
                        <Pressable
                          style={styles.callRow}
                          onPress={() => Linking.openURL(`tel:${it.phone}`)}>
                          <Ionicons name="call" size={14} color="#973c00" />
                          <Text style={styles.phoneText}>
                            اتصال مباشر ({it.phone})
                          </Text>
                        </Pressable>
                      ) : null}

                      {/* مواعيد العمل إن وُجدت */}
                      {it.working_hours ? (
                        <View style={styles.metaRow}>
                          <Ionicons name="time-outline" size={14} color="#64748B" />
                          <Text style={styles.metaText}>المواعيد: {it.working_hours}</Text>
                        </View>
                      ) : null}

                      {/* المكان والعنوان بالقرية */}
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
           الكروت تظهر في صف لوحدها (Full-width Row) بدون أرقام وبدون خط فاصل في الهيدر
           وبدون تكرار عنوان أو براجراف وبمحاذاة يمنية عربية وثيم المنشية المعتمد
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

              {/* عنوان القسم الرئيسي مع أيقونة ثيم المنشية فقط وبدون نصوص مكررة */}
              <View style={styles.subPageTitleBlock}>
                <View style={styles.headerIconBadge}>
                  <Ionicons
                    name={
                      (selectedCategory.icon ||
                        'grid-outline') as keyof typeof Ionicons.glyphMap
                    }
                    size={22}
                    color="#973c00"
                  />
                </View>
                <Text style={styles.subPageMainTitle}>
                  {selectedCategory.name_ar}
                </Text>
              </View>
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
            <WidgetErrorBoundary widgetNameAr="كروت الخدمات الفرعية في صف لوحدها">
              {/* كل كرت يظهر في صف لوحده ممتد بالكامل بنمط أنيق بدون عناوين مكررة */}
              <View style={styles.subCategoriesList}>
                {selectedCategory.subcategories.map((sub) => (
                  <Pressable
                    key={sub.id}
                    style={({ pressed }) => [
                      styles.subCategoryRowCard,
                      pressed && styles.subCategoryRowCardPressed,
                    ]}
                    onPress={() => setSelectedSubCategory(sub)}>
                    <View style={styles.subCategoryRowRight}>
                      <View style={styles.subCategoryRowIconBox}>
                        <Ionicons
                          name={
                            (sub.icon ||
                              'checkmark-circle-outline') as keyof typeof Ionicons.glyphMap
                          }
                          size={24}
                          color="#973c00"
                        />
                      </View>
                      <View style={styles.subCategoryRowTexts}>
                        <Text style={styles.subCategoryRowTitle}>
                          {sub.name_ar}
                        </Text>
                        <Text
                          style={styles.subCategoryRowDesc}
                          numberOfLines={2}>
                          {sub.description}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.subCategoryArrowBox}>
                      <Ionicons
                        name="chevron-back"
                        size={18}
                        color="#973c00"
                      />
                    </View>
                  </Pressable>
                ))}
              </View>
            </WidgetErrorBoundary>
          </ScrollView>
        </View>
      ) : (
        /* ========================================================
           المستوى صفر: الصفحة الرئيسية للخدمات (هيدر ثابت وشبكة الأقسام الـ ٨ بدون أي أرقام)
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
                    onPress={() => setSelectedCategory(cat)}
                  />
                ))}
              </View>
            </WidgetErrorBoundary>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#FAF5EE' },
  tabContainer: { flex: 1, width: '100%' },
  content: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 5 },
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
  // هيدر بدون أي خط فاصل مع الخلفية (#FAF5EE)
  subPageFixedHeader: {
    backgroundColor: '#FAF5EE',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 0,
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
  headerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subPageTitleBlock: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  subPageMainTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  grid: {
    flexDirection: rtlFlexDirection,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailsHeaderRow: {
    marginBottom: 12,
    marginTop: 6,
  },
  detailsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  // قائمة الكروت الفرعية بحيث يظهر كل كرت في صف لوحده ممتد وأنيق بثيم المنشية
  subCategoriesList: {
    gap: 12,
    marginBottom: 16,
    marginTop: 4,
  },
  subCategoryRowCard: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 84,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
  },
  subCategoryRowCardPressed: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  subCategoryRowRight: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  subCategoryRowIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subCategoryRowTexts: {
    flex: 1,
    gap: 3,
    alignItems: 'flex-end',
  },
  subCategoryRowTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    width: '100%',
  },
  subCategoryRowDesc: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
    lineHeight: 18,
    width: '100%',
  },
  subCategoryArrowBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
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
  itemsList: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'stretch',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  cardHeaderRow: {
    flexDirection: rtlFlexDirection,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemTitle: {
    fontSize: 16,
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
    marginBottom: 10,
    width: '100%',
  },
  callRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
    alignSelf: 'flex-end',
  },
  phoneText: {
    fontSize: 13,
    color: '#973c00',
    fontWeight: '800',
    textAlign: rtlTextAlign,
    writingDirection: 'rtl',
  },
  metaRow: {
    flexDirection: rtlFlexDirection,
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  metaText: {
    fontSize: 12.5,
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
  },
});
