-- Политики Storage для нового проекта (без них загрузка фото/документов
-- из приложения падает: бакеты есть, а прав на запись у залогиненных нет).
-- Чтение публичное (бакеты public), запись/удаление — залогиненным.
-- Выполнить в SQL Editor нового проекта.

DROP POLICY IF EXISTS "public read" ON storage.objects;
CREATE POLICY "public read"
ON storage.objects FOR SELECT
USING (bucket_id IN ('property-images', 'deal-documents', 'attachments'));

DROP POLICY IF EXISTS "auth insert" ON storage.objects;
CREATE POLICY "auth insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('property-images', 'deal-documents', 'attachments'));

DROP POLICY IF EXISTS "auth update" ON storage.objects;
CREATE POLICY "auth update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('property-images', 'deal-documents', 'attachments'));

DROP POLICY IF EXISTS "auth delete" ON storage.objects;
CREATE POLICY "auth delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('property-images', 'deal-documents', 'attachments'));
