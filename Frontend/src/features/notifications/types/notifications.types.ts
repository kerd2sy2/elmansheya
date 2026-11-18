export type NotificationSectionKey =
  | 'all'
  | 'news'
  | 'reports'
  | 'craftsmen'
  | 'services'
  | 'general';

export interface VillageNotificationItem {
  id: string;
  section: Exclude<NotificationSectionKey, 'all'>;
  section_ar: string;
  title: string;
  body: string;
  time_ar: string;
  target_id?: string;
  created_at?: string;
  timestamp: number;
}
