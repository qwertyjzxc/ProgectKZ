-- Таблица профилей сотрудников
CREATE TABLE IF NOT EXISTS profiles (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user',
  pin TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  avatar_color TEXT DEFAULT 'blue',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Allow insert profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update profiles" ON profiles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete profiles" ON profiles FOR DELETE USING (true);

-- Первый админ
INSERT INTO profiles (full_name, role, pin) VALUES ('Иван Романов', 'admin', '1234');