-- Колонки для функции «Завершить сделку» во всех таблицах сделок
-- Выполнить в Supabase Dashboard → SQL Editor → Run

ALTER TABLE deals_kvartiry ADD COLUMN IF NOT EXISTS commission NUMERIC DEFAULT 0;
ALTER TABLE deals_kvartiry ADD COLUMN IF NOT EXISTS owner_name TEXT DEFAULT '';
ALTER TABLE deals_kvartiry ADD COLUMN IF NOT EXISTS payment TEXT DEFAULT '';

ALTER TABLE deals_pomescheniya ADD COLUMN IF NOT EXISTS commission NUMERIC DEFAULT 0;
ALTER TABLE deals_pomescheniya ADD COLUMN IF NOT EXISTS owner_name TEXT DEFAULT '';
ALTER TABLE deals_pomescheniya ADD COLUMN IF NOT EXISTS payment TEXT DEFAULT '';

ALTER TABLE deals_zemlya ADD COLUMN IF NOT EXISTS commission NUMERIC DEFAULT 0;
ALTER TABLE deals_zemlya ADD COLUMN IF NOT EXISTS owner_name TEXT DEFAULT '';
ALTER TABLE deals_zemlya ADD COLUMN IF NOT EXISTS payment TEXT DEFAULT '';