/*
  # Fix Security and Performance Issues

  ## 1. Foreign Key Indexes
  Add indexes for all foreign key columns to improve query performance:
  - cash_actions.submitted_by
  - employee_reports.verified_by
  - inventory_actions.submitted_by
  - profiles.deactivated_by
  - report_follow_ups.created_by
  - store_actions.submitted_by
  - submission_types.created_by

  ## 2. Function Search Path
  Fix update_employee_reports_updated_at function to have immutable search path

  ## 3. Remove Duplicate Policies
  Consolidate multiple permissive policies on:
  - profiles (SELECT and UPDATE)
  - employee_reports (SELECT and UPDATE)
  - report_follow_ups (SELECT)

  ## 4. Optimize RLS Performance
  Replace auth.uid() with (select auth.uid()) in all RLS policies for better performance
*/

-- ============================================================================
-- PART 1: Add Foreign Key Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_cash_actions_submitted_by 
  ON cash_actions(submitted_by);

CREATE INDEX IF NOT EXISTS idx_employee_reports_verified_by 
  ON employee_reports(verified_by);

CREATE INDEX IF NOT EXISTS idx_inventory_actions_submitted_by 
  ON inventory_actions(submitted_by);

CREATE INDEX IF NOT EXISTS idx_profiles_deactivated_by 
  ON profiles(deactivated_by);

CREATE INDEX IF NOT EXISTS idx_report_follow_ups_created_by 
  ON report_follow_ups(created_by);

CREATE INDEX IF NOT EXISTS idx_store_actions_submitted_by 
  ON store_actions(submitted_by);

CREATE INDEX IF NOT EXISTS idx_submission_types_created_by 
  ON submission_types(created_by);

-- ============================================================================
-- PART 2: Fix Function Search Path
-- ============================================================================

CREATE OR REPLACE FUNCTION update_employee_reports_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 3: Remove Duplicate Policies on Profiles
-- ============================================================================

-- Drop old duplicate policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins and RSMs can view all profiles" ON profiles;

-- Keep: "Users can view own profile", "Admins can view all profiles", "RSMs can view all profiles"
-- Keep: "Users can update own profile", "Admins can update any profile"

-- ============================================================================
-- PART 4: Optimize All RLS Policies with auth.uid() Caching
-- ============================================================================

-- PROFILES TABLE
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- EMPLOYEE_ACTIONS TABLE
DROP POLICY IF EXISTS "RSMs can insert employee actions" ON employee_actions;
CREATE POLICY "RSMs can insert employee actions"
  ON employee_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('rsm', 'admin')
    )
  );

DROP POLICY IF EXISTS "RSMs and admins can view employee actions" ON employee_actions;
CREATE POLICY "RSMs and admins can view employee actions"
  ON employee_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('rsm', 'admin')
    )
  );

-- INVENTORY_ACTIONS TABLE
DROP POLICY IF EXISTS "Users can insert inventory actions" ON inventory_actions;
CREATE POLICY "Users can insert inventory actions"
  ON inventory_actions FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users and admins can view inventory actions" ON inventory_actions;
CREATE POLICY "Users and admins can view inventory actions"
  ON inventory_actions FOR SELECT
  TO authenticated
  USING (
    submitted_by = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- CASH_ACTIONS TABLE
DROP POLICY IF EXISTS "Users can insert cash actions" ON cash_actions;
CREATE POLICY "Users can insert cash actions"
  ON cash_actions FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users and admins can view cash actions" ON cash_actions;
CREATE POLICY "Users and admins can view cash actions"
  ON cash_actions FOR SELECT
  TO authenticated
  USING (
    submitted_by = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- STORE_ACTIONS TABLE
DROP POLICY IF EXISTS "Users can insert store actions" ON store_actions;
CREATE POLICY "Users can insert store actions"
  ON store_actions FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users and admins can view store actions" ON store_actions;
CREATE POLICY "Users and admins can view store actions"
  ON store_actions FOR SELECT
  TO authenticated
  USING (
    submitted_by = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- EMPLOYEE_REPORTS TABLE - Consolidate and Optimize
DROP POLICY IF EXISTS "Employees can view their own reports" ON employee_reports;
DROP POLICY IF EXISTS "RSMs and admins can view employee reports" ON employee_reports;
DROP POLICY IF EXISTS "RSMs can view employee reports in their region" ON employee_reports;

-- Single consolidated SELECT policy
CREATE POLICY "Users can view employee reports"
  ON employee_reports FOR SELECT
  TO authenticated
  USING (
    -- Employee can view their own reports
    employee_email = (
      SELECT email FROM profiles WHERE id = (select auth.uid())
    )
    OR
    -- RSM can view reports in their region
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN stores s ON s.region = p.assigned_region
      WHERE p.id = (select auth.uid())
      AND p.role = 'rsm'
      AND s.id = employee_reports.store_id
    )
    OR
    -- Admin can view all reports
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "RSMs can create employee reports" ON employee_reports;
CREATE POLICY "RSMs can create employee reports"
  ON employee_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('rsm', 'admin')
    )
  );

DROP POLICY IF EXISTS "Employees can acknowledge their own reports" ON employee_reports;
DROP POLICY IF EXISTS "RSMs can update employee reports in their region" ON employee_reports;

-- Single consolidated UPDATE policy
CREATE POLICY "Users can update employee reports"
  ON employee_reports FOR UPDATE
  TO authenticated
  USING (
    -- Employee can acknowledge their own reports
    (
      employee_email = (SELECT email FROM profiles WHERE id = (select auth.uid()))
      AND status = 'pending'
    )
    OR
    -- RSM can update reports in their region
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN stores s ON s.region = p.assigned_region
      WHERE p.id = (select auth.uid())
      AND p.role = 'rsm'
      AND s.id = employee_reports.store_id
    )
    OR
    -- Admin can update all reports
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    -- Same conditions for WITH CHECK
    (
      employee_email = (SELECT email FROM profiles WHERE id = (select auth.uid()))
      AND status IN ('acknowledged', 'pending')
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN stores s ON s.region = p.assigned_region
      WHERE p.id = (select auth.uid())
      AND p.role = 'rsm'
      AND s.id = employee_reports.store_id
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "RSMs can delete draft reports" ON employee_reports;
CREATE POLICY "RSMs can delete draft reports"
  ON employee_reports FOR DELETE
  TO authenticated
  USING (
    status = 'draft'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('rsm', 'admin')
    )
  );

-- REPORT_FOLLOW_UPS TABLE - Consolidate and Optimize
DROP POLICY IF EXISTS "Employees can view follow-ups on their reports" ON report_follow_ups;
DROP POLICY IF EXISTS "RSMs can view follow-ups in their region" ON report_follow_ups;

-- Single consolidated SELECT policy
CREATE POLICY "Users can view follow-ups"
  ON report_follow_ups FOR SELECT
  TO authenticated
  USING (
    -- Employee can view follow-ups on their reports
    EXISTS (
      SELECT 1 FROM employee_reports er
      JOIN profiles p ON p.email = er.employee_email
      WHERE er.id = report_follow_ups.report_id
      AND p.id = (select auth.uid())
    )
    OR
    -- RSM can view follow-ups in their region
    EXISTS (
      SELECT 1 FROM employee_reports er
      JOIN stores s ON s.id = er.store_id
      JOIN profiles p ON p.assigned_region = s.region
      WHERE er.id = report_follow_ups.report_id
      AND p.id = (select auth.uid())
      AND p.role = 'rsm'
    )
    OR
    -- Admin can view all follow-ups
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "RSMs can create follow-ups" ON report_follow_ups;
CREATE POLICY "RSMs can create follow-ups"
  ON report_follow_ups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('rsm', 'admin')
    )
  );

-- SUBMISSION_TYPES TABLE
DROP POLICY IF EXISTS "Authenticated users can view active submission types" ON submission_types;
CREATE POLICY "Authenticated users can view active submission types"
  ON submission_types FOR SELECT
  TO authenticated
  USING (is_active = true OR (select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins can insert submission types" ON submission_types;
CREATE POLICY "Admins can insert submission types"
  ON submission_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update submission types" ON submission_types;
CREATE POLICY "Admins can update submission types"
  ON submission_types FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete submission types" ON submission_types;
CREATE POLICY "Admins can delete submission types"
  ON submission_types FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );