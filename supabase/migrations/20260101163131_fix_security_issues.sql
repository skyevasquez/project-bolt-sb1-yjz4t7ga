/*
  # Fix Security Issues

  This migration addresses several security and performance issues:

  ## Changes

  1. **Remove Unused Indexes**
     - Drops 19 unused indexes across multiple tables to improve write performance
     - These indexes were consuming storage and slowing down inserts/updates without providing query benefits

  2. **Consolidate RLS Policies on Profiles Table**
     - Combines multiple permissive SELECT policies into a single policy with OR conditions
     - Combines multiple permissive UPDATE policies into a single policy
     - This makes security logic easier to understand and maintain

  ## Security Notes
  
  - All existing access patterns remain functional after consolidation
  - RLS continues to enforce role-based access control
  - No data access changes, only policy simplification
*/

-- Drop unused indexes
DROP INDEX IF EXISTS idx_cash_actions_submitted_by;
DROP INDEX IF EXISTS idx_employee_reports_verified_by;
DROP INDEX IF EXISTS idx_inventory_actions_submitted_by;
DROP INDEX IF EXISTS idx_profiles_deactivated_by;
DROP INDEX IF EXISTS idx_report_follow_ups_created_by;
DROP INDEX IF EXISTS idx_store_actions_submitted_by;
DROP INDEX IF EXISTS idx_submission_types_created_by;
DROP INDEX IF EXISTS idx_stores_region;
DROP INDEX IF EXISTS idx_employee_reports_store;
DROP INDEX IF EXISTS idx_employee_reports_employee_email;
DROP INDEX IF EXISTS idx_employee_reports_status;
DROP INDEX IF EXISTS idx_employee_reports_follow_up_date;
DROP INDEX IF EXISTS idx_employee_reports_due_date;
DROP INDEX IF EXISTS idx_employee_reports_report_type;
DROP INDEX IF EXISTS idx_report_follow_ups_report;
DROP INDEX IF EXISTS idx_profiles_is_active;
DROP INDEX IF EXISTS idx_profiles_role;
DROP INDEX IF EXISTS idx_submission_types_module;
DROP INDEX IF EXISTS idx_submission_types_active;

-- Consolidate profiles table RLS policies
-- First, drop the existing multiple permissive policies for SELECT
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "RSMs can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Create a single consolidated SELECT policy
CREATE POLICY "Users can view profiles based on role"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Users can always view their own profile
    auth.uid() = id
    OR
    -- Admins can view all profiles
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR
    -- RSMs can view all profiles (for store management)
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'rsm'
    )
  );

-- Consolidate profiles table UPDATE policies
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create a single consolidated UPDATE policy
CREATE POLICY "Users can update profiles based on role"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Users can update their own profile
    auth.uid() = id
    OR
    -- Admins can update any profile
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    -- Users can update their own profile
    auth.uid() = id
    OR
    -- Admins can update any profile
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
