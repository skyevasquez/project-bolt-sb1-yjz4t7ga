/*
  # Fix Profiles RLS Policies

  1. Changes
    - Drop the redundant "Users can view their own profile" policy
    - The "Admins can view all profiles" policy already includes auth.uid() = id check
    - This prevents potential conflicts between overlapping SELECT policies

  2. Security
    - Maintains same access levels
    - Users can still view their own profile via the existing policy
*/

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;