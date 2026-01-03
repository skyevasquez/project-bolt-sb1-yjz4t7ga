/*
  # Compliance Hub Database Schema

  1. New Tables
    - `stores` - Store locations for Metro by T-Mobile
      - `id` (uuid, primary key)
      - `store_number` (text, unique store identifier like "MTX-001")
      - `name` (text, store name)
      - `address` (text)
      - `region` (text, regional grouping)
      - `created_at` (timestamptz)

    - `profiles` - Extended user profiles
      - `id` (uuid, primary key, references auth.users)
      - `email` (text)
      - `full_name` (text)
      - `role` (text, either 'rsm' or 'employee')
      - `assigned_region` (text, for RSMs)
      - `created_at` (timestamptz)

    - `employee_actions` - Staff incidents, kudos, attendance notes
      - `id` (uuid, primary key)
      - `store_id` (uuid, references stores)
      - `submitted_by` (uuid, references profiles)
      - `employee_name` (text)
      - `action_type` (text: incident, kudos, attendance)
      - `severity` (text: low, medium, high)
      - `description` (text)
      - `action_date` (date)
      - `synced` (boolean)
      - `created_at` (timestamptz)

    - `inventory_actions` - Stock audits and inventory problems
      - `id` (uuid, primary key)
      - `store_id` (uuid, references stores)
      - `submitted_by` (uuid, references profiles)
      - `action_type` (text: audit, problem)
      - `item_name` (text)
      - `item_sku` (text)
      - `quantity` (integer)
      - `issue_type` (text: damaged, missing, discrepancy)
      - `description` (text)
      - `photo_url` (text)
      - `synced` (boolean)
      - `created_at` (timestamptz)

    - `cash_actions` - Cash drawer reconciliation and shortage reports
      - `id` (uuid, primary key)
      - `store_id` (uuid, references stores)
      - `submitted_by` (uuid, references profiles)
      - `action_type` (text: reconciliation, shortage)
      - `drawer_id` (text)
      - `expected_amount` (decimal)
      - `actual_amount` (decimal)
      - `variance` (decimal)
      - `severity` (text: low, medium, high, critical)
      - `description` (text)
      - `shift` (text: opening, midday, closing)
      - `synced` (boolean)
      - `created_at` (timestamptz)

    - `store_actions` - Checklists and maintenance requests
      - `id` (uuid, primary key)
      - `store_id` (uuid, references stores)
      - `submitted_by` (uuid, references profiles)
      - `action_type` (text: opening_checklist, closing_checklist, maintenance)
      - `checklist_items` (jsonb, array of checklist items with completion status)
      - `priority` (text: low, medium, high, urgent)
      - `description` (text)
      - `photo_url` (text)
      - `completed_at` (timestamptz)
      - `synced` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - RSMs can view all data in their region
    - Employees can only view/create data for their selected store
*/

-- Create stores table
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_number text UNIQUE NOT NULL,
  name text NOT NULL,
  address text,
  region text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('rsm', 'employee')),
  assigned_region text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create employee_actions table
CREATE TABLE IF NOT EXISTS employee_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('incident', 'kudos', 'attendance')),
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
  description text NOT NULL,
  action_date date NOT NULL DEFAULT CURRENT_DATE,
  synced boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employee_actions ENABLE ROW LEVEL SECURITY;

-- Create inventory_actions table
CREATE TABLE IF NOT EXISTS inventory_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('audit', 'problem')),
  item_name text NOT NULL,
  item_sku text,
  quantity integer NOT NULL DEFAULT 0,
  issue_type text CHECK (issue_type IN ('damaged', 'missing', 'discrepancy')),
  description text,
  photo_url text,
  synced boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_actions ENABLE ROW LEVEL SECURITY;

-- Create cash_actions table
CREATE TABLE IF NOT EXISTS cash_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('reconciliation', 'shortage')),
  drawer_id text NOT NULL,
  expected_amount decimal(10,2) NOT NULL DEFAULT 0,
  actual_amount decimal(10,2) NOT NULL DEFAULT 0,
  variance decimal(10,2) NOT NULL DEFAULT 0,
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description text,
  shift text NOT NULL CHECK (shift IN ('opening', 'midday', 'closing')),
  synced boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cash_actions ENABLE ROW LEVEL SECURITY;

-- Create store_actions table
CREATE TABLE IF NOT EXISTS store_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('opening_checklist', 'closing_checklist', 'maintenance')),
  checklist_items jsonb DEFAULT '[]'::jsonb,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  description text,
  photo_url text,
  completed_at timestamptz,
  synced boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE store_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stores
CREATE POLICY "Authenticated users can view all stores"
  ON stores FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "RSMs can view profiles in their region"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'rsm'
    )
  );

-- RLS Policies for employee_actions (RSM only)
CREATE POLICY "RSMs can view all employee actions in their region"
  ON employee_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN stores s ON s.region = p.assigned_region
      WHERE p.id = auth.uid()
      AND p.role = 'rsm'
      AND s.id = employee_actions.store_id
    )
  );

CREATE POLICY "RSMs can insert employee actions"
  ON employee_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'rsm'
    )
    AND submitted_by = auth.uid()
  );

-- RLS Policies for inventory_actions
CREATE POLICY "Users can view inventory actions for their store"
  ON inventory_actions FOR SELECT
  TO authenticated
  USING (
    submitted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN stores s ON s.region = p.assigned_region
      WHERE p.id = auth.uid()
      AND p.role = 'rsm'
      AND s.id = inventory_actions.store_id
    )
  );

CREATE POLICY "Users can insert inventory actions"
  ON inventory_actions FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid());

-- RLS Policies for cash_actions
CREATE POLICY "Users can view cash actions they submitted or RSMs in region"
  ON cash_actions FOR SELECT
  TO authenticated
  USING (
    submitted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN stores s ON s.region = p.assigned_region
      WHERE p.id = auth.uid()
      AND p.role = 'rsm'
      AND s.id = cash_actions.store_id
    )
  );

CREATE POLICY "Users can insert cash actions"
  ON cash_actions FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid());

-- RLS Policies for store_actions
CREATE POLICY "Users can view store actions they submitted or RSMs in region"
  ON store_actions FOR SELECT
  TO authenticated
  USING (
    submitted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN stores s ON s.region = p.assigned_region
      WHERE p.id = auth.uid()
      AND p.role = 'rsm'
      AND s.id = store_actions.store_id
    )
  );

CREATE POLICY "Users can insert store actions"
  ON store_actions FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_actions_store ON employee_actions(store_id);
CREATE INDEX IF NOT EXISTS idx_employee_actions_submitted_by ON employee_actions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_inventory_actions_store ON inventory_actions(store_id);
CREATE INDEX IF NOT EXISTS idx_cash_actions_store ON cash_actions(store_id);
CREATE INDEX IF NOT EXISTS idx_store_actions_store ON store_actions(store_id);
CREATE INDEX IF NOT EXISTS idx_stores_region ON stores(region);

-- Insert sample stores
INSERT INTO stores (store_number, name, address, region) VALUES
  ('MTX-001', 'Metro Downtown', '123 Main St, Dallas, TX 75201', 'Texas South'),
  ('MTX-002', 'Metro Uptown', '456 Oak Ave, Dallas, TX 75205', 'Texas South'),
  ('MTX-003', 'Metro Galleria', '789 Elm Blvd, Houston, TX 77056', 'Texas South'),
  ('MTX-004', 'Metro Midtown', '321 Pine St, Atlanta, GA 30308', 'Georgia'),
  ('MTX-005', 'Metro Buckhead', '654 Peachtree Rd, Atlanta, GA 30326', 'Georgia'),
  ('MTX-006', 'Metro Miami Beach', '987 Collins Ave, Miami, FL 33139', 'Florida'),
  ('MTX-007', 'Metro Brickell', '246 Brickell Ave, Miami, FL 33131', 'Florida')
ON CONFLICT (store_number) DO NOTHING;
