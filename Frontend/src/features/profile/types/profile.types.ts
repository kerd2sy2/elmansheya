export type VerificationStateCode =
  | 'unverified'
  | 'pending_review'
  | 'verified'
  | 'rejected'
  | 'reupload_required';

export interface UserProfileSummary {
  full_name: string;
  phone: string;
  area: string;
  registered_at: string;
  reports_count: number;
  ratings_count: number;
  biometric_enabled: boolean;
  verification_status: VerificationStateCode;
  verification_label: string;
}
