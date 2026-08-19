-- Добавляет все поля во все таблицы сделок (superset)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['deals_kvartiry','deals_pomescheniya','deals_zemlya'])
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS type TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS area TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS jk TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS contract TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS rooms TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS district TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS furniture TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS rental_period TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS who_lives TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS people_count INT DEFAULT 1;', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS completed TEXT DEFAULT ''В процессе'';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS broker TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS layout TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS renter_type TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS payment TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS finishing TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS premise_type TEXT DEFAULT ''Отдельно стоящее здание'';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS plot_type TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS communications TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS area_unit TEXT DEFAULT ''сот'';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS access TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS plot_shape TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS relief TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS documents TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS restrictions TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS time TEXT DEFAULT '''';', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS number TEXT DEFAULT '''';', t);
  END LOOP;
END $$;
