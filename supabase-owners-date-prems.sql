-- Миграция: собственники — дата обращения + доп. поля помещений
-- Выполнить в Supabase Dashboard → SQL Editor → Run

-- ===== ДАТА ОБРАЩЕНИЯ (все таблицы собственников) =====
ALTER TABLE owners_kvartiry ADD COLUMN IF NOT EXISTS date TEXT DEFAULT '';
ALTER TABLE owners_pomescheniya ADD COLUMN IF NOT EXISTS date TEXT DEFAULT '';
ALTER TABLE owners_zemlya ADD COLUMN IF NOT EXISTS date TEXT DEFAULT '';
ALTER TABLE owners_doma ADD COLUMN IF NOT EXISTS date TEXT DEFAULT '';

-- ===== КОММЕРЦИЯ: новые поля =====
ALTER TABLE owners_pomescheniya ADD COLUMN IF NOT EXISTS premise_type TEXT DEFAULT '';
ALTER TABLE owners_pomescheniya ADD COLUMN IF NOT EXISTS finishing TEXT DEFAULT '';