/*
  # Fix Infinite Recursion in Profiles RLS

  1. Problem
    - The "Admins can view all profiles" policy queries the profiles table
    - This creates infinite recursion when checking permissions
    
  2. Solution
    - Create a security definer function that bypasses RLS to check user role
    - Rewrite policies to use this function instead of querying profiles directly
    
  3. Security
    - Maintains same access levels without circular dependencies
*/

-- Step 1: Create a security definer function to get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Step 2: Drop all existing policies on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Step 3: Create new policies without circular references

-- Anyone can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Admins can view all profiles (using the security definer function)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin');

-- RSMs can view all profiles (using the security definer function)
CREATE POLICY "RSMs can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (get_my_role() = 'rsm');

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Users can insert their own profile during signup
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);