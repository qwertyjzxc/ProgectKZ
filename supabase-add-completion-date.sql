-- Добавление колонки completion_date (дата завершения) в таблицы сделок

ALTER TABLE deals_kvartiry ADD COLUMN IF NOT EXISTS completion_date TEXT;
ALTER TABLE deals_pomescheniya ADD COLUMN IF NOT EXISTS completion_date TEXT;
ALTER TABLE deals_zemlya ADD COLUMN IF NOT EXISTS completion_date TEXT;
