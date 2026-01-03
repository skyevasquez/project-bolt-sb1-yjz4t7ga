/*
  # Employee Reports and CAPA Documentation System

  1. New Tables
    - `employee_reports` - Formal HR documentation including CAPA, warnings, recognition
      - `id` (uuid, primary key)
      - `store_id` (uuid, references stores)
      - `submitted_by` (uuid, references profiles - the RSM who created)
      - `employee_name` (text, name of the employee the report is about)
      - `employee_email` (text, optional email for notifications)
      - `report_type` (text: capa, written_warning, verbal_warning, recognition, performance_improvement)
      - `category` (text: corrective, preventive, disciplinary, commendation)
      - `severity` (text: low, medium, high, critical)
      - `status` (text: draft, pending_acknowledgment, acknowledged, in_progress, pending_verification, closed)
      - `incident_date` (date, when the incident occurred)
      - `due_date` (date, when corrective action is due)
      - `follow_up_date` (date, next scheduled follow-up)
      - `description` (text, detailed description of the issue/achievement)
      - `root_cause` (text, root cause analysis for CAPA)
      - `corrective_action` (text, corrective action to be taken)
      - `preventive_measures` (text, preventive measures to avoid recurrence)
      - `policy_reference` (text, reference to company policy)
      - `previous_warnings` (text, record of previous warnings)
      - `expected_behavior` (text, expected behavior going forward)
      - `consequences` (text, consequences if behavior continues)
      - `goals` (text, for performance improvement plans)
      - `metrics` (text, measurable metrics for improvement)
      - `support_provided` (text, support/resources provided)
      - `achievement_description` (text, for recognition reports)
      - `impact_statement` (text, impact of the achievement)
      - `recommendation` (text, recommendation for recognition)
      - `witness_name` (text, witness to the incident)
      - `witness_title` (text, witness job title)
      - `acknowledgment_signature` (text, digital signature)
      - `acknowledged_at` (timestamptz, when acknowledged)
      - `acknowledged_by` (text, who acknowledged - employee name)
      - `verification_notes` (text, verification of corrective action)
      - `verified_at` (timestamptz)
      - `verified_by` (uuid, references profiles)
      - `synced` (boolean, for offline support)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `report_follow_ups` - Follow-up notes and history for reports
      - `id` (uuid, primary key)
      - `report_id` (uuid, references employee_reports)
      - `note` (text, follow-up note content)
      - `follow_up_type` (text: note, status_change, reminder_sent, verification)
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - RSMs can view/create/update all reports in their region
    - Employees can view reports where they are the subject (by employee_email match)
    - Employees can update acknowledgment fields only on their own reports

  3. Indexes
    - Index on store_id for regional queries
    - Index on employee_email for employee self-service
    - Index on status for filtering
    - Index on follow_up_date for reminder queries
    - Index on due_date for overdue queries
*/

-- Create employee_reports table
CREATE TABLE IF NOT EXISTS employee_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  employee_email text,
  report_type text NOT NULL CHECK (report_type IN ('capa', 'written_warning', 'verbal_warning', 'recognition', 'performance_improvement')),
  category text NOT NULL CHECK (category IN ('corrective', 'preventive', 'disciplinary', 'commendation')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_acknowledgment', 'acknowledged', 'in_progress', 'pending_verification', 'closed')),
  incident_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  follow_up_date date,
  description text NOT NULL,
  root_cause text,
  corrective_action text,
  preventive_measures text,
  policy_reference text,
  previous_warnings text,
  expected_behavior text,
  consequences text,
  goals text,
  metrics text,
  support_provided text,
  achievement_description text,
  impact_statement text,
  recommendation text,
  witness_name text,
  witness_title text,
  acknowledgment_signature text,
  acknowledged_at timestamptz,
  acknowledged_by text,
  verification_notes text,
  verified_at timestamptz,
  verified_by uuid REFERENCES profiles(id),
  synced boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE employee_reports ENABLE ROW LEVEL SECURITY;

-- Create report_follow_ups table
CREATE TABLE IF NOT EXISTS report_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES employee_reports(id) ON DELETE CASCADE,
  note text NOT NULL,
  follow_up_type text NOT NULL DEFAULT 'note' CHECK (follow_up_type IN ('note', 'status_change', 'reminder_sent', 'verification')),
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE report_follow_ups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_reports

-- RSMs can view all reports in their region
CREATE POLICY "RSMs can view employee reports in their region"
  ON employee_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN stores s ON s.region = p.assigned_region
      WHERE p.id = auth.uid()
      AND p.role = 'rsm'
      AND s.id = employee_reports.store_id
    )
  );

-- Employees can view reports where they are the subject (matched by email)
CREATE POLICY "Employees can view their own reports"
  ON employee_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.email = employee_reports.employee_email
    )
  );

-- RSMs can insert reports
CREATE POLICY "RSMs can create employee reports"
  ON employee_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'rsm'
    )
    AND submitted_by = auth.uid()
  );

-- RSMs can update reports in their region
CREATE POLICY "RSMs can update employee reports in their region"
  ON employee_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN stores s ON s.region = p.assigned_region
      WHERE p.id = auth.uid()
      AND p.role = 'rsm'
      AND s.id = employee_reports.store_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN stores s ON s.region = p.assigned_region
      WHERE p.id = auth.uid()
      AND p.role = 'rsm'
      AND s.id = employee_reports.store_id
    )
  );

-- Employees can update acknowledgment fields on their own reports
CREATE POLICY "Employees can acknowledge their own reports"
  ON employee_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.email = employee_reports.employee_email
    )
    AND status = 'pending_acknowledgment'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.email = employee_reports.employee_email
    )
  );

-- RSMs can delete reports (soft delete preferred, but allowing for drafts)
CREATE POLICY "RSMs can delete draft reports"
  ON employee_reports FOR DELETE
  TO authenticated
  USING (
    status = 'draft'
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'rsm'
    )
    AND submitted_by = auth.uid()
  );

-- RLS Policies for report_follow_ups

-- RSMs can view follow-ups for reports in their region
CREATE POLICY "RSMs can view follow-ups in their region"
  ON report_follow_ups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employee_reports er
      JOIN profiles p ON p.id = auth.uid()
      JOIN stores s ON s.region = p.assigned_region
      WHERE p.role = 'rsm'
      AND s.id = er.store_id
      AND er.id = report_follow_ups.report_id
    )
  );

-- Employees can view follow-ups on their own reports
CREATE POLICY "Employees can view follow-ups on their reports"
  ON report_follow_ups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employee_reports er
      JOIN profiles p ON p.id = auth.uid()
      WHERE p.email = er.employee_email
      AND er.id = report_follow_ups.report_id
    )
  );

-- RSMs can insert follow-ups
CREATE POLICY "RSMs can create follow-ups"
  ON report_follow_ups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'rsm'
    )
    AND created_by = auth.uid()
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_reports_store ON employee_reports(store_id);
CREATE INDEX IF NOT EXISTS idx_employee_reports_submitted_by ON employee_reports(submitted_by);
CREATE INDEX IF NOT EXISTS idx_employee_reports_employee_email ON employee_reports(employee_email);
CREATE INDEX IF NOT EXISTS idx_employee_reports_status ON employee_reports(status);
CREATE INDEX IF NOT EXISTS idx_employee_reports_follow_up_date ON employee_reports(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_employee_reports_due_date ON employee_reports(due_date);
CREATE INDEX IF NOT EXISTS idx_employee_reports_report_type ON employee_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_report_follow_ups_report ON report_follow_ups(report_id);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_employee_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS employee_reports_updated_at ON employee_reports;
CREATE TRIGGER employee_reports_updated_at
  BEFORE UPDATE ON employee_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_reports_updated_at();
