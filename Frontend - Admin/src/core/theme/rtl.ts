import { I18nManager, Platform } from 'react-native';

/**
 * يضمن بدء العناصر الأفقية دائماً من اليمين إلى اليسار (RTL)
 * على كافة أجهزة أندرويد وآيفون والمتصفح:
 * - إذا كان RTL مفعلاً أصلياً في أندرويد (isRTL=true) فإن 'row' يبدأ تلقائياً من اليمين.
 * - إذا كان النظام يعمل بنمط LTR فإن 'row-reverse' يقلب الاتجاه ليبدأ من اليمين.
 */
export const rtlFlexDirection = I18nManager.isRTL ? 'row' : 'row-reverse';

/**
 * محاذاة العناصر العمودية لليمين دائماً
 */
export const rtlAlignItems = I18nManager.isRTL ? 'flex-start' : 'flex-end';

/**
 * محاذاة البداية الأفقية في حاويات RTL
 */
export const rtlJustifyContent = I18nManager.isRTL ? 'flex-start' : 'flex-end';

/**
 * محاذاة النصوص لأقصى اليمين دائماً (بداية السطر العربي):
 * في أندرويد عندما يكون isRTL=true فإن 'left' تترجم إلى Gravity.START (أقصى اليمين الفيزيائي).
 * وعندما يُمرر 'right' فإنها تترجم إلى Gravity.END (أقصى اليسار).
 * أما في iOS و Web فإن 'right' هي أقصى اليمين.
 */
export const rtlTextAlign: 'left' | 'right' = Platform.select({
  android: I18nManager.isRTL ? 'left' : 'right',
  ios: 'right',
  web: 'right',
  default: 'right',
});

