export type UserRole = 'STUDENT' | 'STAFF' | 'ADMIN' | 'SUPER_ADMIN';

export type ComplaintStatus = 'SUBMITTED' | 'VERIFIED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  student_id: string | null;
  department_id: number | null;
  department_name?: string;
  is_active?: number;
  created_at?: string;
  last_login_at?: string;
  complaint_count?: number;
  active_assignments_count?: number;
  resolved_count?: number;
}

export interface Department {
  id: number;
  name: string;
  description: string | null;
  is_active: number;
  complaint_count?: number;
  staff_count?: number;
  created_at?: string;
}

export interface StatusHistoryItem {
  id: number;
  complaint_id: number;
  old_status: ComplaintStatus | null;
  new_status: ComplaintStatus;
  changed_by: number;
  changed_by_name: string;
  changed_by_role: UserRole;
  reason: string | null;
  created_at: string;
}

export interface AssignmentItem {
  id: number;
  complaint_id: number;
  staff_id: number;
  staff_name: string;
  staff_email: string;
  assigned_by: number;
  assigned_by_name: string;
  assigned_date: string;
  notes: string | null;
}

export interface FeedbackItem {
  id: number;
  complaint_id: number;
  user_id: number;
  user_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Complaint {
  id: number;
  complaint_number: string;
  student_id: number;
  student_name?: string;
  student_email?: string;
  student_roll_id?: string;
  title: string;
  description: string;
  category: string;
  location: string;
  department_id: number | null;
  department_name?: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  image_path: string | null;
  created_at: string;
  updated_at: string;
  verified_at: string | null;
  assigned_at: string | null;
  resolved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  assigned_staff_name?: string;
  assigned_staff_id?: number;
  feedback_rating?: number;
  history?: StatusHistoryItem[];
  assignments?: AssignmentItem[];
  feedback?: FeedbackItem | null;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  complaint_id: number | null;
  type: string;
  message: string;
  is_read: number;
  created_at: string;
}

export interface AuditLogItem {
  id: number;
  user_id: number | null;
  user_name?: string;
  user_email?: string;
  user_role?: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  ip_address: string | null;
  created_at: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
