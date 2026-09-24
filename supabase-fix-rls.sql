-- Починить запись в clients_prodaja (SELECT работает, INSERT/UPDATE/DELETE отклоняются RLS).
-- Выполнить в Supabase Dashboard → SQL Editor → Run (можно вместе с остальным).

ALTER TABLE clients_prodaja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all clients_prodaja" ON clients_prodaja;
CREATE POLICY "Allow all clients_prodaja" ON clients_prodaja FOR ALL USING (true) WITH CHECK (true);

-- На всякий случай то же для arenda (если политики нет — создастся, если есть — пересоздастся без изменений поведения).
ALTER TABLE clients_arenda ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all clients_arenda" ON clients_arenda;
CREATE POLICY "Allow all clients_arenda" ON clients_arenda FOR ALL USING (true) WITH CHECK (true);

-- Удаление уведомлений (крестики + «удалить все»): SELECT/INSERT/UPDATE уже разрешены.
DROP POLICY IF EXISTS "Allow delete notifications" ON notifications;
CREATE POLICY "Allow delete notifications" ON notifications FOR DELETE USING (true);
