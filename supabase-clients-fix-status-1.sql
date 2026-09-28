-- Выполнить в SQL Editor Supabase
-- Чистит мусорный статус "1" у клиентов (остаток старых импортов):
-- такие строки переводятся в "Без статуса" (пусто), пилюля "1" исчезает.
-- Сначала SELECT покажет, сколько строк затронет чистка.
-- Безопасно перезапускать (идемпотентно).

SELECT 'arenda' AS tbl, count(*) AS cnt FROM clients_arenda WHERE completed = '1'
UNION ALL
SELECT 'prodaja', count(*) FROM clients_prodaja WHERE completed = '1'
UNION ALL
SELECT 'pokupka', count(*) FROM clients_pokupka WHERE completed = '1';

UPDATE clients_arenda SET completed = '' WHERE completed = '1';
UPDATE clients_prodaja SET completed = '' WHERE completed = '1';
UPDATE clients_pokupka SET completed = '' WHERE completed = '1';
