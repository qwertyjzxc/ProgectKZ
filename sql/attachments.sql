-- Вложения для клиентов, собственников и задач
-- Выполнить в Supabase SQL Editor

-- 1. Бакет для файлов
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments','attachments',true) ON CONFLICT DO NOTHING;
CREATE POLICY "Public read attachments" ON storage.objects FOR SELECT USING (bucket_id='attachments');
CREATE POLICY "Auth upload attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id='attachments' AND auth.role()='authenticated');
CREATE POLICY "Auth delete attachments" ON storage.objects FOR DELETE USING (bucket_id='attachments' AND auth.role()='authenticated');

-- 2. Колонка documents (JSON-список вложений) для всех клиентских таблиц
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename LIKE 'clients\_%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS documents TEXT DEFAULT ''{}'';', t);
  END LOOP;
END $$;

-- 3. Для таблиц собственников
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename LIKE 'owners\_%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS documents TEXT DEFAULT ''{}'';', t);
  END LOOP;
END $$;

-- 4. Для задач
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS documents TEXT DEFAULT '{}';