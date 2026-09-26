-- Выполнить в SQL Editor Supabase
-- Унификация категорий сделок: канон 'arenda' | 'pokupka'.
-- Переводит legacy-значение 'prodaja' (писалось из клиентов продажи) в 'pokupka',
-- чтобы сделки не выпадали из фильтров страницы сделок и аналитики.
-- Безопасно перезапускать (идемпотентно).

UPDATE deals_kvartiry SET category = 'pokupka' WHERE category = 'prodaja';
UPDATE deals_pomescheniya SET category = 'pokupka' WHERE category = 'prodaja';
UPDATE deals_zemlya SET category = 'pokupka' WHERE category = 'prodaja';
