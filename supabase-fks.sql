-- Внешний ключ связки исполнителей (его не было в автогенерации схемы:
-- PostgREST-схема не показывает FK). Без него падали tasks/overview (embed),
-- код уже переписан без embed-зависимости — ключ нужен для целостности:
-- удаление задачи само чистит её назначения, как было в старом проекте.
-- Выполнить в SQL Editor нового проекта.

ALTER TABLE task_assignees
  DROP CONSTRAINT IF EXISTS task_assignees_task_id_fkey;

ALTER TABLE task_assignees
  ADD CONSTRAINT task_assignees_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE;
