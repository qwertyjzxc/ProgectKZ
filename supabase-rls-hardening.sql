-- Выполнить в SQL Editor Supabase
-- Затягивание RLS: раньше почти везде стояли заглушки Allow-all (USING(true)),
-- и любой, у кого есть ANON-ключ (он публичный, NEXT_PUBLIC_*), мог читать и
-- писать в PostgREST/Storage мимо всех проверок приложения (включая маски
-- телефонов и isAdmin). После этой миграции:
--   - anon (без сессии): только чтение активных объявлений properties
--     (для публичной страницы /p/[id]) и чтение картинок из бакетов;
--   - authenticated (залогинен): CRUD как раньше — авторизация по ролям
--     остаётся на уровне API-роутов приложения;
--   - service_role: полный доступ, без изменений (через него пишут
--     уведомления, журнал, RPC и крон).
-- Безопасно перезапускать (идемпотентно через DROP IF EXISTS / DO-блок).

-- 0. Сносим все существующие политики на таблицах CRM (имена различаются
-- между окружениями, поэтому удаляем динамически).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'clients_arenda', 'clients_prodaja', 'clients_pokupka',
        'deals_kvartiry', 'deals_pomescheniya', 'deals_zemlya',
        'owners_kvartiry', 'owners_pomescheniya', 'owners_zemlya', 'owners_doma',
        'tasks', 'task_assignees',
        'properties', 'objects',
        'notifications', 'client_activity',
        'profiles', 'profile_links',
        'districts', 'residential_complexes', 'lists'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 1. Включаем RLS везде.
ALTER TABLE clients_arenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients_prodaja ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients_pokupka ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals_kvartiry ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals_pomescheniya ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals_zemlya ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners_kvartiry ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners_pomescheniya ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners_zemlya ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners_doma ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE residential_complexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;

-- 2. Рабочие таблицы: полный доступ только залогиненным.
-- (Разграничение admin/сотрудник — в API-роутах приложения.)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clients_arenda', 'clients_prodaja', 'clients_pokupka',
    'deals_kvartiry', 'deals_pomescheniya', 'deals_zemlya',
    'owners_kvartiry', 'owners_pomescheniya', 'owners_zemlya', 'owners_doma',
    'tasks', 'task_assignees',
    'notifications',
    'profile_links', 'districts', 'residential_complexes', 'lists'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY crm_authenticated_all ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;

-- 3. properties: гостям — только активные объявления (публичная /p/[id]),
-- залогиненным — всё; запись — только залогиненным.
CREATE POLICY crm_properties_public_read ON properties
  FOR SELECT TO anon USING (status = 'Активно');
CREATE POLICY crm_properties_auth_read ON properties
  FOR SELECT TO authenticated USING (true);
CREATE POLICY crm_properties_auth_write ON properties
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY crm_properties_auth_update ON properties
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY crm_properties_auth_delete ON properties
  FOR DELETE TO authenticated USING (true);

-- 4. profiles: чтение — залогиненным (имена нужны по всему UI),
-- запись — только через service_role (server actions и API используют его).
CREATE POLICY crm_profiles_auth_read ON profiles
  FOR SELECT TO authenticated USING (true);

-- 5. client_activity и objects: чтение — залогиненным,
-- запись — только через service_role.
CREATE POLICY crm_activity_auth_read ON client_activity
  FOR SELECT TO authenticated USING (true);
CREATE POLICY crm_objects_auth_read ON objects
  FOR SELECT TO authenticated USING (true);

-- 6. Storage: публичное чтение картинок (нужно для /p/[id]),
-- запись/удаление — только залогиненным. Старые попакетные политики
-- сносим динамически, чтобы не плодить дубли.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

CREATE POLICY crm_storage_public_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id IN ('property-images', 'deal-documents', 'attachments'));
CREATE POLICY crm_storage_auth_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('property-images', 'deal-documents', 'attachments'));
CREATE POLICY crm_storage_auth_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id IN ('property-images', 'deal-documents', 'attachments'))
  WITH CHECK (bucket_id IN ('property-images', 'deal-documents', 'attachments'));
CREATE POLICY crm_storage_auth_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id IN ('property-images', 'deal-documents', 'attachments'));
