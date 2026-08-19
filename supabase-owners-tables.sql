-- Таблицы собственников по типам
CREATE TABLE IF NOT EXISTS owners_kvartiry (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  district TEXT DEFAULT '',
  address TEXT DEFAULT '',
  jk TEXT DEFAULT '',
  rooms TEXT DEFAULT '',
  area TEXT DEFAULT '',
  price NUMERIC DEFAULT 0,
  contract_type TEXT DEFAULT '',
  status TEXT DEFAULT 'Новый собственник',
  notes TEXT DEFAULT '',
  broker TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS owners_pomescheniya (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  district TEXT DEFAULT '',
  address TEXT DEFAULT '',
  area TEXT DEFAULT '',
  price NUMERIC DEFAULT 0,
  contract_type TEXT DEFAULT '',
  status TEXT DEFAULT 'Новый собственник',
  notes TEXT DEFAULT '',
  broker TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS owners_zemlya (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  district TEXT DEFAULT '',
  address TEXT DEFAULT '',
  area TEXT DEFAULT '',
  area_unit TEXT DEFAULT 'сот',
  price NUMERIC DEFAULT 0,
  contract_type TEXT DEFAULT '',
  status TEXT DEFAULT 'Новый собственник',
  notes TEXT DEFAULT '',
  broker TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE owners_kvartiry ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners_pomescheniya ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners_zemlya ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all owners_kvartiry" ON owners_kvartiry FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all owners_pomescheniya" ON owners_pomescheniya FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all owners_zemlya" ON owners_zemlya FOR ALL USING (true) WITH CHECK (true);
