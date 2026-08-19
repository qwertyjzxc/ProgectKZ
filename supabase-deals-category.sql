-- Выполнить в SQL Editor Supabase
-- Добавляет колонку "категория сделки" (Аренда / Покупка) в таблицы сделок
-- Значения: 'arenda' | 'pokupka'

ALTER TABLE deals_kvartiry ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'arenda';
ALTER TABLE deals_pomescheniya ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'arenda';
ALTER TABLE deals_zemlya ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'arenda';
