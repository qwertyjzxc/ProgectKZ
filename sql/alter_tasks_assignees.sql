-- Выполнить в SQL Editor Supabase
-- Несколько исполнителей задачи: вместо колонки tasks.assignee_id
-- создаём связующую таблицу task_assignees (0..* исполнителей).
-- Уже назначенные задачи переносятся автоматически, затем старая колонка удаляется.

-- 1. Таблица связи задач и исполнителей
CREATE TABLE IF NOT EXISTS task_assignees (
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  assignee_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, assignee_id)
);

-- 2. Перенос текущих ответственных
INSERT INTO task_assignees (task_id, assignee_id)
SELECT id, assignee_id FROM tasks WHERE assignee_id IS NOT NULL
ON CONFLICT (task_id, assignee_id) DO NOTHING;

-- 3. Удаляем старую колонку
ALTER TABLE tasks DROP COLUMN IF EXISTS assignee_id;

-- 4. Индекс для быстрой выборки задач по исполнителю
CREATE INDEX IF NOT EXISTS idx_task_assignees_assignee ON task_assignees (assignee_id);

-- 5. RLS
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all task_assignees" ON task_assignees FOR ALL USING (true) WITH CHECK (true);
