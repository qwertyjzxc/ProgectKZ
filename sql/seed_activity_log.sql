-- ============================================================
-- Журнал действий по клиентам
-- Таблица: client_activity
-- Запустить в SQL Editor Supabase один раз.
-- Запись идёт через service_role (обход RLS), чтение — через
-- API-роуты с аутентифицированным пользователем (SELECT policy).
-- ============================================================

CREATE TABLE IF NOT EXISTS client_activity (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  client_table TEXT NOT NULL DEFAULT '',
  client_id BIGINT NOT NULL DEFAULT 0,
  client_name TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  changes JSONB DEFAULT '[]'::jsonb,
  actor_id TEXT DEFAULT NULL,
  actor_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_activity_client ON client_activity (client_table, client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_activity_created ON client_activity (created_at DESC);

ALTER TABLE client_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read client activity" ON client_activity;
CREATE POLICY "Read client activity" ON client_activity FOR SELECT USING (auth.role() = 'authenticated');
