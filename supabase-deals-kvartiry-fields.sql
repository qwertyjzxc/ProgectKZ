-- Добавляет поля клиентов в deals_kvartiry (как в clients_arenda)
ALTER TABLE deals_kvartiry ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Квартира';
ALTER TABLE deals_kvartiry ADD COLUMN IF NOT EXISTS area TEXT DEFAULT '';
ALTER TABLE deals_kvartiry ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE deals_kvartiry ADD COLUMN IF NOT EXISTS jk TEXT DEFAULT '';
ALTER TABLE deals_kvartiry ADD COLUMN IF NOT EXISTS contract TEXT DEFAULT '';
ALTER TABLE deals_kvartiry ADD COLUMN IF NOT EXISTS rooms TEXT DEFAULT '';
ALTER TABLE deals_kvartiry ADD COLUMN IF NOT EXISTS district TEXT DEFAULT '';
ALTER TABLE deals_kvartiry ADD COLUMN IF NOT EXISTS furniture TEXT DEFAULT '';
ALTER TABLE deals_kvartiry ADD COLUMN IF NOT EXISTS rental_period TEXT DEFAULT '';
ALTER TABLE deals_kvartiry ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE deals_kvartiry ADD COLUMN IF NOT EXISTS who_lives TEXT DEFAULT '';
ALTER TABLE deals_kvartiry ADD COLUMN IF NOT EXISTS people_count INT DEFAULT 1;
ALTER TABLE deals_kvartiry ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE deals_kvartiry ADD COLUMN IF NOT EXISTS completed TEXT DEFAULT 'В процессе';
ALTER TABLE deals_kvartiry ADD COLUMN IF NOT EXISTS broker TEXT DEFAULT '';
