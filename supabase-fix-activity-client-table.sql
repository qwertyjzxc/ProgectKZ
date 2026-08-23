-- Миграция: исправить client_table для старых записей активности сделок
-- Старые записи имеют client_table = 'deals', нужно определить к какой таблице они относятся

-- 1. Квартиры: обновляем записи где client_id совпадает с id в deals_kvartiry
UPDATE client_activity
SET client_table = 'deals_kvartiry'
WHERE client_table = 'deals'
  AND client_id IN (SELECT id FROM deals_kvartiry);

-- 2. Помещения: обновляем записи где client_id совпадает с id в deals_pomescheniya
-- (но не те что уже обновлены до deals_kvartiry)
UPDATE client_activity
SET client_table = 'deals_pomescheniya'
WHERE client_table = 'deals'
  AND client_id IN (SELECT id FROM deals_pomescheniya);

-- 3. Земля: обновляем записи где client_id совпадает с id в deals_zemlya
UPDATE client_activity
SET client_table = 'deals_zemlya'
WHERE client_table = 'deals'
  AND client_id IN (SELECT id FROM deals_zemlya);

-- Остальные записи с client_table = 'deals' (если есть) оставляем как есть
-- или можно удалить если сделки удалены:
-- DELETE FROM client_activity WHERE client_table = 'deals';
