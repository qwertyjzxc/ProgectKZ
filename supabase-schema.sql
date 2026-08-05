-- Выполнить в SQL Editor Supabase
-- Таблица клиентов
CREATE TABLE IF NOT EXISTS clients (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  status TEXT DEFAULT 'Активен',
  deals_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица задач
CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL DEFAULT '',
  client TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_date TEXT DEFAULT '',
  due_date TEXT DEFAULT '',
  priority TEXT DEFAULT 'Средний',
  status TEXT DEFAULT 'В работе',
  assignee_id BIGINT REFERENCES profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица сделок
CREATE TABLE IF NOT EXISTS deals (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL DEFAULT '',
  client TEXT DEFAULT '',
  amount BIGINT DEFAULT 0,
  stage TEXT DEFAULT 'Первичный контакт',
  date TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all clients" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all deals" ON deals FOR ALL USING (true) WITH CHECK (true);
