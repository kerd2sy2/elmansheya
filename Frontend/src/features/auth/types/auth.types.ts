export type VerificationStatusType =
  | 'unverified'
  | 'pending_review'
  | 'verified'
  | 'rejected'
  | 'reupload_required';

export interface AuthenticatedUser {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  area: string;
  role: string;
  role_name_ar: string;
  verification_status: VerificationStatusType;
  biometric_enabled: boolean;
  reports_count: number;
  ratings_count: number;
  registered_at_ar: string;
  avatar_url?: string;
}

export interface LoginPayload {
  phone: string;
  password: string;
  enable_biometric: boolean;
}

export interface RegisterPayload {
  full_name: string;
  phone: string;
  email?: string;
  password: string;
  area: string;
}

export interface AuthSessionResponse {
  access_token: string;
  refresh_token: string;
  session_id: string;
  user: AuthenticatedUser;
}
