-- Таблицы сделок по типам
CREATE TABLE IF NOT EXISTS deals_kvartiry (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL DEFAULT '',
  client TEXT DEFAULT '',
  amount NUMERIC DEFAULT 0,
  stage TEXT DEFAULT 'Первичный контакт',
  date TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deals_pomescheniya (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL DEFAULT '',
  client TEXT DEFAULT '',
  amount NUMERIC DEFAULT 0,
  stage TEXT DEFAULT 'Первичный контакт',
  date TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deals_zemlya (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL DEFAULT '',
  client TEXT DEFAULT '',
  amount NUMERIC DEFAULT 0,
  stage TEXT DEFAULT 'Первичный контакт',
  date TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE deals_kvartiry ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals_pomescheniya ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals_zemlya ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all deals_kvartiry" ON deals_kvartiry FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all deals_pomescheniya" ON deals_pomescheniya FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all deals_zemlya" ON deals_zemlya FOR ALL USING (true) WITH CHECK (true);
