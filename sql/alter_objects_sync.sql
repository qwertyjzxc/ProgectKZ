-- Выполнить в SQL Editor Supabase
-- Мягкое удаление объявлений: is_active (видно/снято с публикации)
-- и last_seen_at (когда объявление в последний раз видели на krisha.kz).

ALTER TABLE objects ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE objects ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_objects_active ON objects (is_active, last_seen_at);
