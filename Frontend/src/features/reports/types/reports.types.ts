export type ReportStatusCode =
  | 'new'
  | 'under_review'
  | 'in_progress'
  | 'resolved'
  | 'rejected';

export interface PublicReportItem {
  id: string;
  report_number: number;
  report_type_ar: string;
  title: string;
  description: string;
  manual_address: string;
  image_url?: string;
  status: ReportStatusCode;
  status_ar: string;
  resolution_summary?: string;
  created_at_ar: string;
}
