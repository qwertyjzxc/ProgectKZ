-- Выполнить в SQL Editor Supabase
-- Добавляет колонки "площадь", "адрес", "ЖК", "номер договора" в таблицы клиентов

ALTER TABLE clients_arenda ADD COLUMN IF NOT EXISTS area TEXT DEFAULT '';
ALTER TABLE clients_arenda ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE clients_arenda ADD COLUMN IF NOT EXISTS jk TEXT DEFAULT '';
ALTER TABLE clients_arenda ADD COLUMN IF NOT EXISTS contract TEXT DEFAULT '';

ALTER TABLE clients_pokupka ADD COLUMN IF NOT EXISTS area TEXT DEFAULT '';
ALTER TABLE clients_pokupka ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE clients_pokupka ADD COLUMN IF NOT EXISTS jk TEXT DEFAULT '';
ALTER TABLE clients_pokupka ADD COLUMN IF NOT EXISTS contract TEXT DEFAULT '';

ALTER TABLE clients_prodaja ADD COLUMN IF NOT EXISTS area TEXT DEFAULT '';
ALTER TABLE clients_prodaja ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE clients_prodaja ADD COLUMN IF NOT EXISTS jk TEXT DEFAULT '';
ALTER TABLE clients_prodaja ADD COLUMN IF NOT EXISTS contract TEXT DEFAULT '';
