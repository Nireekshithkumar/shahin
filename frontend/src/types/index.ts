export interface User {
  id: number;
  email: string;
  username: string;
  role: 'CITIZEN' | 'REVIEWER' | 'MANAGER' | 'ADMIN';
  is_email_verified: boolean;
  avatar_url?: string;
  phone_number?: string;
  created_at: string;
}

export interface UserProfile {
  id: number;
  full_name: string;
  date_of_birth?: string;
  age?: number;
  gender: string;
  state_or_ut: string;
  district: string;
  pincode: string;
  citizenship: string;
  domicile_state: string;
  marital_status: string;
  is_orphan: boolean;
  religion: string;
  current_education_level: string;
  course_name: string;
  course_stream: string;
  institution_name: string;
  institution_type: string;
  current_year_or_semester: string;
  academic_percentage?: number;
  cgpa?: number;
  previous_qualification: string;
  previous_percentage?: number;
  annual_family_income?: number;
  income_certificate_available: boolean;
  bpl_card_holder: boolean;
  ration_card_type: string;
  parent_occupation: string;
  category: string;
  caste_certificate_available: boolean;
  is_minority: boolean;
  minority_community: string;
  is_disabled: boolean;
  disability_percentage?: number;
  disability_type: string;
  disability_certificate_available: boolean;
  single_girl_child: boolean;
  sports_achievements: string;
  employment_status: string;
  is_rural: boolean;
  profile_completion_percentage: number;
  missing_fields: string[];
  updated_at: string;
}

export interface Opportunity {
  id: number;
  title: string;
  slug: string;
  opportunity_type: string;
  short_description: string;
  detailed_description?: string;
  provider: string;
  government_level: string;
  applicable_state: string;
  eligible_states: string[];
  education_levels: string[];
  eligible_courses: string[];
  institution_requirements?: string;
  min_age?: number;
  max_age?: number;
  min_academic_percentage?: number;
  min_cgpa?: number;
  max_annual_income?: number;
  eligible_genders: string[];
  eligible_categories: string[];
  disability_eligible_only: boolean;
  min_disability_percentage?: number;
  minority_only: boolean;
  citizenship_residency_requirement?: string;
  eligible_occupations?: string[];
  required_documents?: string[];
  benefit_amount?: number;
  benefit_frequency: string;
  benefit_description: string;
  application_opening_date?: string;
  application_closing_date?: string;
  application_status: string;
  application_method: string;
  official_application_url: string;
  official_information_url: string;
  source_name: string;
  source_organization?: string;
  verification_status: string;
  reliability_status: string;
  is_featured: boolean;
}

export interface EligibilityResult {
  status: 'ELIGIBLE' | 'POTENTIALLY_ELIGIBLE' | 'INELIGIBLE' | 'INSUFFICIENT_INFORMATION' | 'NEEDS_MANUAL_VERIFICATION';
  confidence_score: number;
  matched_conditions: string[];
  failed_conditions: string[];
  unconfirmed_conditions: string[];
  missing_profile_fields: string[];
  explanation: string;
  next_actions: string[];
  opportunity_id?: number;
  opportunity_title?: string;
  provider?: string;
  official_url?: string;
  last_verified_date?: string;
}

export interface RecommendationItem {
  opportunity: Opportunity;
  composite_score: number;
  factors: Record<string, number>;
  badges: string[];
  eligibility: EligibilityResult;
}

export interface ApplicationTrackerItem {
  id: number;
  opportunity: number;
  opportunity_details: Opportunity;
  status: string;
  submission_date?: string;
  application_reference_number?: string;
  personal_notes: string;
  documents_checklist: { name: string; status: string }[];
  reminder_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavedOpportunityItem {
  id: number;
  opportunity: number;
  opportunity_details: Opportunity;
  notes: string;
  saved_at: string;
}

export interface NotificationItem {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  related_opportunity?: number;
  opportunity_title?: string;
  action_url?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface UserNotificationPreference {
  id?: number;
  email_notifications_enabled: boolean;
  new_scholarships_enabled: boolean;
  new_schemes_enabled: boolean;
  personalized_matches_enabled: boolean;
  include_potentially_eligible: boolean;
  deadline_reminders_enabled: boolean;
  saved_opportunity_alerts_enabled: boolean;
  deadline_extension_alerts_enabled: boolean;
  changes_alerts_enabled: boolean;
  application_tracker_reminders_enabled: boolean;
  weekly_digest_enabled: boolean;
  renewal_reminders_enabled: boolean;
  reminder_days_before: number[];
  deadline_day_reminder_enabled: boolean;
  preferred_language: string;
  preferred_delivery_hour: number;
  preferred_timezone: string;
  max_emails_per_day: number;
  unsubscribe_token?: string;
  unsubscribed_at?: string | null;
  updated_at?: string;
}

export interface EmailDeliveryLogItem {
  id: number;
  recipient_email: string;
  subject: string;
  notification_type: string;
  status: 'QUEUED' | 'ACCEPTED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'RETRYING' | 'CANCELLED' | 'SUPPRESSED_DUPLICATE';
  error_category: string;
  error_message: string;
  retry_count: number;
  max_retries: number;
  scheduled_send_time: string;
  sent_at?: string | null;
  deadline_version: string;
  idempotency_key?: string;
  related_opportunity?: number;
  opportunity_title?: string;
  created_at: string;
}

export interface OpportunitySubscriptionItem {
  id?: number;
  opportunity: number;
  notify_deadline: boolean;
  notify_changes: boolean;
  is_saved?: boolean;
  is_tracked?: boolean;
}


export interface RAGCitation {
  title: string;
  provider: string;
  state: string;
  source_url: string;
  verification_date: string;
}

export interface ChatMessageItem {
  id?: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: RAGCitation[];
  created_at?: string;
}

export interface WorkflowItem {
  id: number;
  title: string;
  description: string;
  nodes: any[];
  edges: any[];
  is_template: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
