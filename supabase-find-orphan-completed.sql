-- Выполнить в SQL Editor Supabase (только чтение, ничего не меняет)
-- Сверка: завершённые клиенты vs сделки. Показывает, у каких завершённых
-- клиентов нет сделки (сироты: ручной статус или падение создания до фикса).

-- 1. Счётчики: завершённые клиенты аренды-квартир ...
SELECT count(*) AS completed_clients
FROM clients_arenda
WHERE completed = 'Сделка завершена'
  AND type IN ('Квартира', 'Квартиры');

-- ... и сделки по категориям (смотреть строку arenda)
SELECT category, count(*) AS deals
FROM deals_kvartiry
GROUP BY category;

-- 2. Список сирот: завершённые клиенты, к которым не нашлось сделки
-- (сверка по договору, затем по телефону, затем по имени клиента)
SELECT c.id, c.date, c.name, c.phone, c.contract, c.broker, c.amount
FROM clients_arenda c
WHERE c.completed = 'Сделка завершена'
  AND c.type IN ('Квартира', 'Квартиры')
  AND NOT EXISTS (
    SELECT 1 FROM deals_kvartiry d
    WHERE d.category = 'arenda'
      AND (
        (NULLIF(c.contract, '') IS NOT NULL AND d.contract = c.contract)
        OR (NULLIF(c.phone, '') IS NOT NULL AND d.phone = c.phone)
        OR d.client = c.name
      )
  )
ORDER BY c.id;

-- 3. Тот же список для других вкладок — поменяйте таблицу/тип/категорию:
--    clients_prodaja + deals_kvartiry/pomescheniya/zemlya, category = 'pokupka'
--    (старые сделки могут лежать с category = 'prodaja' — прогоните
--    supabase-deals-category-unify.sql, чтобы сверка их видела).
