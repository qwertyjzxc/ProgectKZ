-- Таблица объектов недвижимости, наполняемая из объявлений krisha.kz
-- Выполнить в SQL Editor Supabase.

CREATE TABLE IF NOT EXISTS objects (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  krisha_id BIGINT UNIQUE NOT NULL,
  deal_type TEXT NOT NULL DEFAULT '',
  prop_type TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  price BIGINT NOT NULL DEFAULT 0,
  price_text TEXT NOT NULL DEFAULT '',
  rooms TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',
  floor TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  krisha_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_objects_created ON objects (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_objects_deal ON objects (deal_type);
CREATE INDEX IF NOT EXISTS idx_objects_prop ON objects (prop_type);

-- RLS: чтение для авторизованных пользователей, запись через service role
ALTER TABLE objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "objects_select_auth" ON objects;
CREATE POLICY "objects_select_auth" ON objects
  FOR SELECT USING (auth.role() = 'authenticated');
