-- Приватные вложения: deal-documents (договоры) и attachments (файлы клиентов/
-- задач/собственников) больше не раздаются по публичной ссылке без логина.
-- Фото объектов (property-images) остаются публичными — они нужны открытой
-- странице объявления /p/[id].
-- Выполнить в Supabase → SQL Editor → Run. Идемпотентно.
--
-- После запуска прямые ссылки вида
--   https://<project>.supabase.co/storage/v1/object/public/deal-documents/...
-- перестают открывать файл. Приложение открывает вложения через
-- /api/files/view (проверяет сессию и роль, редиректит на подписанный URL
-- со сроком жизни 1 час) — задеплойте версию кода с этим роутом ДО запуска
-- миграции, иначе старые ссылки в карточках перестанут открываться.

-- 1. Бакеты документов — приватные.
update storage.buckets set public = false
where id in ('deal-documents', 'attachments');

-- 2. Чтение: публично (анонимно) — только фото объектов; вложения — залогиненным.
--    До этого политика "public read" отдавала все три бакета роли public.
DROP POLICY IF EXISTS "public read" ON storage.objects;
DROP POLICY IF EXISTS crm_storage_public_read ON storage.objects;

CREATE POLICY crm_storage_public_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'property-images');

CREATE POLICY crm_storage_private_auth_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('deal-documents', 'attachments'));

-- Диагностика: privatized = true, property_images_public = true
select id, public from storage.buckets
where id in ('property-images', 'deal-documents', 'attachments');
