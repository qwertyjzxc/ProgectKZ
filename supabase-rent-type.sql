-- Выполнить в SQL Editor Supabase
-- Добавляет колонку "тип недвижимости" в таблицы клиентов
-- Значения: 'Дома' | 'Помещения' | 'Квартиры' (или пустая строка)

ALTER TABLE clients_arenda ADD COLUMN IF NOT EXISTS type TEXT DEFAULT '';
ALTER TABLE clients_pokupka ADD COLUMN IF NOT EXISTS type TEXT DEFAULT '';
ALTER TABLE clients_prodaja ADD COLUMN IF NOT EXISTS type TEXT DEFAULT '';
