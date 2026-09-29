-- Чистка «type» у сделок: при редактировании в колонку type попадал ключ
-- таблицы (kvartiry/pomescheniya/zemlya) вместо человеческого названия —
-- из-за этого select «Тип недвижимости» в форме редактирования пустел.
-- Код починен отдельно; миграция чинит уже испорченные строки.

UPDATE deals_kvartiry    SET type = 'Квартира'  WHERE type = 'kvartiry';
UPDATE deals_pomescheniya SET type = 'Помещение' WHERE type = 'pomescheniya';
UPDATE deals_zemlya       SET type = 'Земля'     WHERE type = 'zemlya';

-- На всякий случай — перекрёстно загрязнённые ключи в чужих таблицах
UPDATE deals_kvartiry     SET type = 'Помещение' WHERE type = 'pomescheniya';
UPDATE deals_kvartiry     SET type = 'Земля'     WHERE type = 'zemlya';
UPDATE deals_pomescheniya SET type = 'Квартира'  WHERE type = 'kvartiry';
UPDATE deals_pomescheniya SET type = 'Земля'     WHERE type = 'zemlya';
UPDATE deals_zemlya        SET type = 'Квартира'  WHERE type = 'kvartiry';
UPDATE deals_zemlya        SET type = 'Помещение' WHERE type = 'pomescheniya';

-- Проверка: не должно остаться ни одной строки с ключом вместо названия
SELECT 'deals_kvartiry' AS tbl, count(*) AS bad FROM deals_kvartiry     WHERE type IN ('kvartiry','pomescheniya','zemlya')
UNION ALL
SELECT 'deals_pomescheniya', count(*) FROM deals_pomescheniya WHERE type IN ('kvartiry','pomescheniya','zemlya')
UNION ALL
SELECT 'deals_zemlya', count(*) FROM deals_zemlya        WHERE type IN ('kvartiry','pomescheniya','zemlya');
