-- ============================================================
-- Настройки уведомлений профилей
-- Таблица: profiles -> notification_settings (JSONB)
-- Ключи: <entity>_<action>, где entity = clients | deals | tasks,
-- action = create | update | delete.
-- Пример: {"clients_create": true, "deals_update": true, ...}
-- Запустить в SQL Editor Supabase один раз.
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{}'::jsonb;
