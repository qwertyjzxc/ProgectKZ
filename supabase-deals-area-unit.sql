-- Добавляет колонку area_unit (единицы площади: сот/га) во все таблицы сделок
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['deals_kvartiry','deals_pomescheniya','deals_zemlya'])
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS area_unit TEXT DEFAULT ''сот'';', t);
  END LOOP;
END $$;
