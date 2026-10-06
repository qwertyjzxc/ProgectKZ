-- Добавляет «Вид договора» в таблицы сделок (как в clients_*)
-- Без этой миграции форма сделок молча сбрасывает поле (schema-drift фолбэк)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['deals_kvartiry','deals_pomescheniya','deals_zemlya'])
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS contract_kind TEXT DEFAULT '''';', t);
  END LOOP;
END $$;
