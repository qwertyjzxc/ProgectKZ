-- Клиенты: «Дома» → «Земля» + земельные поля как в сделках
-- Выполнить в SQL Editor Supabase

-- 1. Переименование типа «Дома» → «Земля» у существующих клиентов
UPDATE clients_arenda SET type = 'Земля' WHERE type = 'Дома';
UPDATE clients_prodaja SET type = 'Земля' WHERE type = 'Дома';
UPDATE clients_pokupka SET type = 'Земля' WHERE type = 'Дома';

-- 2. Земельные поля клиентов (аналог полей deals_zemlya)
ALTER TABLE clients_arenda ADD COLUMN IF NOT EXISTS area_unit TEXT DEFAULT 'сот';
ALTER TABLE clients_arenda ADD COLUMN IF NOT EXISTS plot_type TEXT DEFAULT '';
ALTER TABLE clients_arenda ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT '';
ALTER TABLE clients_arenda ADD COLUMN IF NOT EXISTS communications TEXT DEFAULT '';
ALTER TABLE clients_arenda ADD COLUMN IF NOT EXISTS access TEXT DEFAULT '';
ALTER TABLE clients_arenda ADD COLUMN IF NOT EXISTS plot_shape TEXT DEFAULT '';
ALTER TABLE clients_arenda ADD COLUMN IF NOT EXISTS relief TEXT DEFAULT '';
ALTER TABLE clients_arenda ADD COLUMN IF NOT EXISTS restrictions TEXT DEFAULT '';

ALTER TABLE clients_prodaja ADD COLUMN IF NOT EXISTS area_unit TEXT DEFAULT 'сот';
ALTER TABLE clients_prodaja ADD COLUMN IF NOT EXISTS plot_type TEXT DEFAULT '';
ALTER TABLE clients_prodaja ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT '';
ALTER TABLE clients_prodaja ADD COLUMN IF NOT EXISTS communications TEXT DEFAULT '';
ALTER TABLE clients_prodaja ADD COLUMN IF NOT EXISTS access TEXT DEFAULT '';
ALTER TABLE clients_prodaja ADD COLUMN IF NOT EXISTS plot_shape TEXT DEFAULT '';
ALTER TABLE clients_prodaja ADD COLUMN IF NOT EXISTS relief TEXT DEFAULT '';
ALTER TABLE clients_prodaja ADD COLUMN IF NOT EXISTS restrictions TEXT DEFAULT '';

ALTER TABLE clients_pokupka ADD COLUMN IF NOT EXISTS area_unit TEXT DEFAULT 'сот';
ALTER TABLE clients_pokupka ADD COLUMN IF NOT EXISTS plot_type TEXT DEFAULT '';
ALTER TABLE clients_pokupka ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT '';
ALTER TABLE clients_pokupka ADD COLUMN IF NOT EXISTS communications TEXT DEFAULT '';
ALTER TABLE clients_pokupka ADD COLUMN IF NOT EXISTS access TEXT DEFAULT '';
ALTER TABLE clients_pokupka ADD COLUMN IF NOT EXISTS plot_shape TEXT DEFAULT '';
ALTER TABLE clients_pokupka ADD COLUMN IF NOT EXISTS relief TEXT DEFAULT '';
ALTER TABLE clients_pokupka ADD COLUMN IF NOT EXISTS restrictions TEXT DEFAULT '';