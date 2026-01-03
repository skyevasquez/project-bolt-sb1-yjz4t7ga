import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'admin' | 'rsm' | 'employee';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  assigned_region: string | null;
  is_active: boolean;
  deactivated_at: string | null;
  deactivated_by: string | null;
  created_at: string;
}

export interface SubmissionType {
  id: string;
  module: 'employee' | 'inventory' | 'cash' | 'store';
  type_key: string;
  label: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  store_number: string;
  name: string;
  address: string | null;
  region: string;
  created_at: string;
}

export interface EmployeeAction {
  id: string;
  store_id: string;
  submitted_by: string;
  employee_name: string;
  action_type: 'incident' | 'kudos' | 'attendance';
  severity: 'low' | 'medium' | 'high';
  description: string;
  action_date: string;
  synced: boolean;
  created_at: string;
}

export interface InventoryAction {
  id: string;
  store_id: string;
  submitted_by: string;
  action_type: 'audit' | 'problem';
  item_name: string;
  item_sku: string | null;
  quantity: number;
  issue_type: 'damaged' | 'missing' | 'discrepancy' | null;
  description: string | null;
  photo_url: string | null;
  synced: boolean;
  created_at: string;
}

export interface CashAction {
  id: string;
  store_id: string;
  submitted_by: string;
  action_type: 'reconciliation' | 'shortage';
  drawer_id: string;
  expected_amount: number;
  actual_amount: number;
  variance: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string | null;
  shift: 'opening' | 'midday' | 'closing';
  synced: boolean;
  created_at: string;
}

export interface StoreAction {
  id: string;
  store_id: string;
  submitted_by: string;
  action_type: 'opening_checklist' | 'closing_checklist' | 'maintenance';
  checklist_items: ChecklistItem[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string | null;
  photo_url: string | null;
  completed_at: string | null;
  synced: boolean;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completed_at: string | null;
}

export type ReportType = 'capa' | 'written_warning' | 'verbal_warning' | 'recognition' | 'performance_improvement';
export type ReportCategory = 'corrective' | 'preventive' | 'disciplinary' | 'commendation';
export type ReportStatus = 'draft' | 'pending_acknowledgment' | 'acknowledged' | 'in_progress' | 'pending_verification' | 'closed';
export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FollowUpType = 'note' | 'status_change' | 'reminder_sent' | 'verification';

export interface EmployeeReport {
  id: string;
  store_id: string;
  submitted_by: string;
  employee_name: string;
  employee_email: string | null;
  report_type: ReportType;
  category: ReportCategory;
  severity: ReportSeverity;
  status: ReportStatus;
  incident_date: string;
  due_date: string | null;
  follow_up_date: string | null;
  description: string;
  root_cause: string | null;
  corrective_action: string | null;
  preventive_measures: string | null;
  policy_reference: string | null;
  previous_warnings: string | null;
  expected_behavior: string | null;
  consequences: string | null;
  goals: string | null;
  metrics: string | null;
  support_provided: string | null;
  achievement_description: string | null;
  impact_statement: string | null;
  recommendation: string | null;
  witness_name: string | null;
  witness_title: string | null;
  acknowledgment_signature: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  verification_notes: string | null;
  verified_at: string | null;
  verified_by: string | null;
  synced: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportFollowUp {
  id: string;
  report_id: string;
  note: string;
  follow_up_type: FollowUpType;
  created_by: string;
  created_at: string;
}
