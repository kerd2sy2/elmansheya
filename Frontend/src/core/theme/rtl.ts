import { Platform } from 'react-native';

/**
 * اتجاه الفليكس الأفقي الصارم للغة العربية (من اليمين إلى اليسار):
 * نستخدم 'row-reverse' دائماً وبشكل قاطع على كافة الأجهزة
 * لضمان أن تبدأ كافة العناصر والأيقونات والعناوين والنافبار من أقصى اليمين الفيزيائي
 * دون أي تأثر بلغة نظام الهاتف أو تذبذب الـ Native Views.
 */
export const rtlFlexDirection: 'row-reverse' = 'row-reverse';

/**
 * محاذاة العناصر للجهة اليمنى (نهاية المحور الأفقي في البيئة القياسية = أقصى اليمين)
 */
export const rtlAlignItems: 'flex-end' = 'flex-end';

/**
 * محاذاة البداية الأفقية
 */
export const rtlJustifyContent: 'flex-start' = 'flex-start';

/**
 * محاذاة النصوص لأقصى اليمين دائماً (بداية السطر العربي):
 * في اللغة العربية يجب دائماً أن تبدأ النصوص والفقرات والعناوين من اليمين الفيزيائي للشاشة.
 */
export const rtlTextAlign: 'right' = 'right';





