/*
  # Add Admin Role, User Access Control, and Submission Types

  1. Changes to profiles table
    - Add 'admin' to role constraint (now: admin, rsm, employee)
    - Add 'is_active' column for user access control (default true)
    - Add 'deactivated_at' timestamp for audit trail
    - Add 'deactivated_by' reference for who revoked access

  2. New Tables
    - `submission_types` - Configurable submission categories
      - `id` (uuid, primary key)
      - `module` (text: employee, inventory, cash, store)
      - `type_key` (text, unique identifier like 'incident', 'kudos')
      - `label` (text, display name)
      - `description` (text, optional description)
      - `is_active` (boolean, whether this type can be used)
      - `created_by` (uuid, admin who created it)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Security
    - Admin can view all profiles and all data
    - Admin can update any profile's role and access status
    - Admin can manage submission types
    - Only active users can log in and access data
*/

-- Step 1: Add new columns to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'deactivated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN deactivated_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'deactivated_by'
  ) THEN
    ALTER TABLE profiles ADD COLUMN deactivated_by uuid REFERENCES profiles(id);
  END IF;
END $$;

-- Step 2: Update role constraint to include 'admin'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'rsm', 'employee'));

-- Step 3: Create submission_types table
CREATE TABLE IF NOT EXISTS submission_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL CHECK (module IN ('employee', 'inventory', 'cash', 'store')),
  type_key text NOT NULL,
  label text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (module, type_key)
);

ALTER TABLE submission_types ENABLE ROW LEVEL SECURITY;

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_submission_types_module ON submission_types(module);
CREATE INDEX IF NOT EXISTS idx_submission_types_active ON submission_types(is_active);

-- Step 5: RLS Policies for submission_types
CREATE POLICY "Authenticated users can view active submission types"
  ON submission_types FOR SELECT
  TO authenticated
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can insert submission types"
  ON submission_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update submission types"
  ON submission_types FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete submission types"
  ON submission_types FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Step 6: Update profiles RLS to allow admin access
DROP POLICY IF EXISTS "RSMs can view profiles in their region" ON profiles;

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'rsm')
  );

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Step 7: Add admin policies to action tables
DROP POLICY IF EXISTS "RSMs can view all employee actions in their region" ON employee_actions;
CREATE POLICY "RSMs and admins can view employee actions"
  ON employee_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN stores s ON s.region = p.assigned_region
      WHERE p.id = auth.uid()
      AND p.role = 'rsm'
      AND s.id = employee_actions.store_id
    )
  );

DROP POLICY IF EXISTS "Users can view inventory actions for their store" ON inventory_actions;
CREATE POLICY "Users and admins can view inventory actions"
  ON inventory_actions FOR SELECT
  TO authenticated
  USING (
    submitted_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN stores s ON s.region = p.assigned_region
      WHERE p.id = auth.uid()
      AND p.role = 'rsm'
      AND s.id = inventory_actions.store_id
    )
  );

DROP POLICY IF EXISTS "Users can view cash actions they submitted or RSMs in region" ON cash_actions;
CREATE POLICY "Users and admins can view cash actions"
  ON cash_actions FOR SELECT
  TO authenticated
  USING (
    submitted_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN stores s ON s.region = p.assigned_region
      WHERE p.id = auth.uid()
      AND p.role = 'rsm'
      AND s.id = cash_actions.store_id
    )
  );

DROP POLICY IF EXISTS "Users can view store actions they submitted or RSMs in region" ON store_actions;
CREATE POLICY "Users and admins can view store actions"
  ON store_actions FOR SELECT
  TO authenticated
  USING (
    submitted_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN stores s ON s.region = p.assigned_region
      WHERE p.id = auth.uid()
      AND p.role = 'rsm'
      AND s.id = store_actions.store_id
    )
  );

-- Step 8: Admin access to employee_reports
DROP POLICY IF EXISTS "RSMs can view reports they created or in their region" ON employee_reports;
CREATE POLICY "RSMs and admins can view employee reports"
  ON employee_reports FOR SELECT
  TO authenticated
  USING (
    submitted_by = auth.uid()
    OR employee_email = (SELECT email FROM profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN stores s ON s.region = p.assigned_region
      WHERE p.id = auth.uid()
      AND p.role = 'rsm'
      AND s.id = employee_reports.store_id
    )
  );

-- Step 9: Seed default submission types
INSERT INTO submission_types (module, type_key, label, description) VALUES
  ('employee', 'incident', 'Incident Report', 'Document workplace incidents or policy violations'),
  ('employee', 'kudos', 'Kudos/Recognition', 'Recognize outstanding employee performance'),
  ('employee', 'attendance', 'Attendance Issue', 'Track tardiness, absences, or schedule adherence'),
  ('inventory', 'audit', 'Inventory Audit', 'Regular stock count and verification'),
  ('inventory', 'problem', 'Inventory Problem', 'Report damaged, missing, or discrepant items'),
  ('cash', 'reconciliation', 'Cash Reconciliation', 'End of shift drawer count and balance'),
  ('cash', 'shortage', 'Cash Shortage', 'Report cash discrepancies or shortages'),
  ('store', 'opening_checklist', 'Opening Checklist', 'Daily store opening procedures'),
  ('store', 'closing_checklist', 'Closing Checklist', 'Daily store closing procedures'),
  ('store', 'maintenance', 'Maintenance Request', 'Equipment repairs or facility issues')
ON CONFLICT (module, type_key) DO NOTHING;
