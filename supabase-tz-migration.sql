-- Миграция ТЗ: новые поля клиентов, сделок, собственников + таблица owners_doma
-- Выполнить в Supabase Dashboard → SQL Editor → Run

-- ===== КЛИЕНТЫ =====
ALTER TABLE clients_arenda ADD COLUMN IF NOT EXISTS preferences TEXT DEFAULT '';
ALTER TABLE clients_arenda ADD COLUMN IF NOT EXISTS client_category TEXT DEFAULT '';
ALTER TABLE clients_arenda ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT '[]';
ALTER TABLE clients_arenda ADD COLUMN IF NOT EXISTS premise_type TEXT DEFAULT '';
ALTER TABLE clients_arenda ADD COLUMN IF NOT EXISTS finishing TEXT DEFAULT '';
ALTER TABLE clients_arenda ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT '';
ALTER TABLE clients_arenda ADD COLUMN IF NOT EXISTS contract_kind TEXT DEFAULT '';

ALTER TABLE clients_prodaja ADD COLUMN IF NOT EXISTS preferences TEXT DEFAULT '';
ALTER TABLE clients_prodaja ADD COLUMN IF NOT EXISTS client_category TEXT DEFAULT '';
ALTER TABLE clients_prodaja ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT '[]';
ALTER TABLE clients_prodaja ADD COLUMN IF NOT EXISTS premise_type TEXT DEFAULT '';
ALTER TABLE clients_prodaja ADD COLUMN IF NOT EXISTS finishing TEXT DEFAULT '';
ALTER TABLE clients_prodaja ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT '';
ALTER TABLE clients_prodaja ADD COLUMN IF NOT EXISTS contract_kind TEXT DEFAULT '';

-- ===== СДЕЛКИ =====
ALTER TABLE deals_kvartiry ADD COLUMN IF NOT EXISTS commission NUMERIC DEFAULT 0;
ALTER TABLE deals_kvartiry ADD COLUMN IF NOT EXISTS owner_name TEXT DEFAULT '';
ALTER TABLE deals_pomescheniya ADD COLUMN IF NOT EXISTS commission NUMERIC DEFAULT 0;
ALTER TABLE deals_pomescheniya ADD COLUMN IF NOT EXISTS owner_name TEXT DEFAULT '';
ALTER TABLE deals_zemlya ADD COLUMN IF NOT EXISTS commission NUMERIC DEFAULT 0;
ALTER TABLE deals_zemlya ADD COLUMN IF NOT EXISTS owner_name TEXT DEFAULT '';

-- ===== СОБСТВЕННИКИ: новые поля =====
ALTER TABLE owners_kvartiry ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT '';
ALTER TABLE owners_kvartiry ADD COLUMN IF NOT EXISTS location_line TEXT DEFAULT '';
ALTER TABLE owners_kvartiry ADD COLUMN IF NOT EXISTS contract_kind TEXT DEFAULT '';
ALTER TABLE owners_pomescheniya ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT '';
ALTER TABLE owners_pomescheniya ADD COLUMN IF NOT EXISTS location_line TEXT DEFAULT '';
ALTER TABLE owners_pomescheniya ADD COLUMN IF NOT EXISTS contract_kind TEXT DEFAULT '';
ALTER TABLE owners_zemlya ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT '';
ALTER TABLE owners_zemlya ADD COLUMN IF NOT EXISTS location_line TEXT DEFAULT '';
ALTER TABLE owners_zemlya ADD COLUMN IF NOT EXISTS contract_kind TEXT DEFAULT '';

-- ===== СОБСТВЕННИКИ: дома =====
CREATE TABLE IF NOT EXISTS owners_doma (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  district TEXT DEFAULT '',
  address TEXT DEFAULT '',
  rooms TEXT DEFAULT '',
  house_area TEXT DEFAULT '',
  land_area TEXT DEFAULT '',
  price NUMERIC DEFAULT 0,
  contract_type TEXT DEFAULT '',
  contract_kind TEXT DEFAULT '',
  status TEXT DEFAULT 'Новый собственник',
  condition TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  broker TEXT DEFAULT '',
  documents TEXT DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE owners_doma ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all owners_doma" ON owners_doma;
CREATE POLICY "Allow all owners_doma" ON owners_doma FOR ALL USING (true) WITH CHECK (true);
