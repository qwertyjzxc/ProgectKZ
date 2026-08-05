-- Выполнить в SQL Editor Supabase
-- Новые колонки таблицы tasks:
--   description  — описание задачи
--   created_date — дата/время создания (введённая пользователем)
--   assignee_id  — ответственный (ссылка на profiles)
--   completed_at — момент перехода в статус «Завершено» (для автоудаления через 10 минут)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_date TEXT DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id BIGINT REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Индекс для быстрого поиска завершённых задач (автоудаление через 10 минут)
CREATE INDEX IF NOT EXISTS idx_tasks_cleanup ON tasks (status, completed_at);
