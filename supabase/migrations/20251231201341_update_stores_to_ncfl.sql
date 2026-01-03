/*
  # Update Stores to NCFL (North Central Florida)

  1. Changes
    - Remove all sample stores
    - Add 6 new stores for North Central Florida region
    
  2. New Stores
    - NCF-001: Archer
    - NCF-002: Newberry
    - NCF-003: Chiefland
    - NCF-004: Inverness
    - NCF-005: Homosassa
    - NCF-006: Crystal River
    
  3. Region
    - All stores assigned to "NCFL" market
*/

DELETE FROM stores WHERE true;

INSERT INTO stores (store_number, name, region) VALUES
  ('NCF-001', 'Archer', 'NCFL'),
  ('NCF-002', 'Newberry', 'NCFL'),
  ('NCF-003', 'Chiefland', 'NCFL'),
  ('NCF-004', 'Inverness', 'NCFL'),
  ('NCF-005', 'Homosassa', 'NCFL'),
  ('NCF-006', 'Crystal River', 'NCFL');
