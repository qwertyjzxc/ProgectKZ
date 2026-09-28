-- Выполнить в SQL Editor Supabase
-- Чинит единицы площади в сделках: сотки остаются только у участков
-- на продаже; квартиры, помещения и дома (аренда) — м².
-- Безопасно перезапускать (идемпотентно).

-- 0. СЧЁТЧИКИ ДО
SELECT 'kvartiry' AS tbl, count(*) AS cnt FROM deals_kvartiry WHERE area_unit IS DISTINCT FROM 'м²'
UNION ALL
SELECT 'pomescheniya', count(*) FROM deals_pomescheniya WHERE area_unit IS DISTINCT FROM 'м²'
UNION ALL
SELECT 'zemlya_arenda', count(*) FROM deals_zemlya WHERE category = 'arenda' AND area_unit IS DISTINCT FROM 'м²';

-- 1. ЛЕЧЕНИЕ
UPDATE deals_kvartiry SET area_unit = 'м²' WHERE area_unit IS DISTINCT FROM 'м²';
UPDATE deals_pomescheniya SET area_unit = 'м²' WHERE area_unit IS DISTINCT FROM 'м²';
UPDATE deals_zemlya SET area_unit = 'м²' WHERE category = 'arenda' AND area_unit IS DISTINCT FROM 'м²';

-- 2. СЧЁТЧИКИ ПОСЛЕ (должны быть нули)
SELECT 'kvartiry' AS tbl, count(*) AS still_bad FROM deals_kvartiry WHERE area_unit IS DISTINCT FROM 'м²'
UNION ALL
SELECT 'pomescheniya', count(*) FROM deals_pomescheniya WHERE area_unit IS DISTINCT FROM 'м²'
UNION ALL
SELECT 'zemlya_arenda', count(*) FROM deals_zemlya WHERE category = 'arenda' AND area_unit IS DISTINCT FROM 'м²';
