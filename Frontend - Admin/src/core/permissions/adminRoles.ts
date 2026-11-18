/**
 * تعريف الأدوار الإدارية وصلاحيات المساعدين الأربعة في منظومة المنشية
 */

export type AdminRole =
  | 'super_admin'
  | 'admin'
  | 'media_events_assistant'
  | 'health_humanitarian_assistant'
  | 'public_utilities_assistant'
  | 'commerce_mobility_assistant';

export interface AdminRoleConfig {
  role: AdminRole;
  titleAr: string;
  descriptionAr: string;
  badgeColor: string;
  badgeBg: string;
  allowedSections: string[];
}

export const ADMIN_ROLES_CONFIG: Record<AdminRole, AdminRoleConfig> = {
  super_admin: {
    role: 'super_admin',
    titleAr: 'المشرف العام (المدير العام)',
    descriptionAr: 'تحكم كامل وتام بجميع قطاعات التطبيق، توثيق الحسابات، وإدارة المشرفين والمساعدين.',
    badgeColor: '#973c00',
    badgeBg: '#FFF7ED',
    allowedSections: ['all'],
  },
  admin: {
    role: 'admin',
    titleAr: 'المشرف الميداني',
    descriptionAr: 'متابعة وإشراف على المساعدين الأربعة، مراجعة وتدقيق المحتوى، وحل مشاكل وشكاوى القرية.',
    badgeColor: '#0284C7',
    badgeBg: '#E0F2FE',
    allowedSections: ['news', 'events', 'health', 'humanitarian', 'utilities', 'services', 'commerce', 'reports'],
  },
  media_events_assistant: {
    role: 'media_events_assistant',
    titleAr: 'مساعد الإعلام والمناسبات',
    descriptionAr: 'إدارة ونشر أخبار وبثوث القرية، المناسبات الاجتماعية (أفراح وعزاء)، وشؤون المساجد.',
    badgeColor: '#2563EB',
    badgeBg: '#EFF6FF',
    allowedSections: ['news', 'events', 'mosques'],
  },
  health_humanitarian_assistant: {
    role: 'health_humanitarian_assistant',
    titleAr: 'مساعد الصحة والإنسانية',
    descriptionAr: 'إدارة مواعيد أطباء الوحدة الصحية، صيدليات الحراسة، القوافل الطبية، وحالات التكافل والتبرع.',
    badgeColor: '#DC2626',
    badgeBg: '#FEF2F2',
    allowedSections: ['health', 'humanitarian'],
  },
  public_utilities_assistant: {
    role: 'public_utilities_assistant',
    titleAr: 'مساعد المرافق ومشاكل القرية',
    descriptionAr: 'متابعة شكاوى وأعطال المرافق (كهرباء ومياه وصرف)، المصالح والبريد، ودليل الصنايعية.',
    badgeColor: '#D97706',
    badgeBg: '#FEF3C7',
    allowedSections: ['utilities', 'reports', 'gov_offices', 'craftsmen'],
  },
  commerce_mobility_assistant: {
    role: 'commerce_mobility_assistant',
    titleAr: 'مساعد التجارة والتعليم والمواصلات',
    descriptionAr: 'إدارة مواقف سيارات المنشية وتعريفة الركوب، دليل المحلات والأسواق والمخابز، والمدارس.',
    badgeColor: '#7C3AED',
    badgeBg: '#F5F3FF',
    allowedSections: ['transportation', 'shops', 'education'],
  },
};

export function canAccessSection(userRole: string | undefined, sectionKey: string): boolean {
  if (!userRole) return false;
  if (userRole === 'super_admin') return true;
  const config = ADMIN_ROLES_CONFIG[userRole as AdminRole];
  if (!config) return false;
  return config.allowedSections.includes('all') || config.allowedSections.includes(sectionKey);
}
