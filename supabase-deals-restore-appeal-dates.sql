-- Выполнить в SQL Editor Supabase
-- Восстанавливает «Дату обращения» сделок, затёртую днём закрытия
-- (старый код писал date = completion_date при завершении).
-- Чинит только строки, где date = completion_date (след затирания),
-- дату берёт из карточки клиента: сначала по договору, затем по телефону,
-- затем по имени. Остальные строки не трогает.
-- Сделки из собственников (без клиента) не чинятся — их даты править вручную.
-- Безопасно перезапускать (идемпотентно): повторный прогон ничего не меняет.

-- 0. СЧЁТЧИКИ ДО: сколько битых строк в каждой таблице
SELECT 'deals_kvartiry' AS tbl, count(*) AS broken
FROM deals_kvartiry WHERE date = completion_date AND date <> ''
UNION ALL
SELECT 'deals_pomescheniya', count(*)
FROM deals_pomescheniya WHERE date = completion_date AND date <> ''
UNION ALL
SELECT 'deals_zemlya', count(*)
FROM deals_zemlya WHERE date = completion_date AND date <> '';

-- 1. ПРЕДПРОСМОТР: битые сделки + найденная дата клиента (первые 100)
SELECT d.id, d.category, d.client, d.contract, d.phone,
       d.date AS broken_date, c.date AS client_date, c.id AS client_id
FROM deals_kvartiry d
JOIN clients_arenda c
  ON d.category = 'arenda'
 AND d.date = d.completion_date AND d.date <> ''
 AND (
   (NULLIF(d.contract, '') IS NOT NULL AND d.contract = c.contract)
   OR (NULLIF(d.phone, '') IS NOT NULL AND d.phone = c.phone)
   OR d.client = c.name
 )
LIMIT 100;

-- 2. ЛЕЧЕНИЕ: прогон по всем таблицам сделок.
-- Порядок совпадений: договор → телефон → имя; каждый следующий шаг чинит
-- только то, что осталось битым. Покупка ищется сначала в clients_prodaja,
-- затем в clients_pokupka.
DO $$
DECLARE
  dt text;
BEGIN
  FOREACH dt IN ARRAY ARRAY['deals_kvartiry', 'deals_pomescheniya', 'deals_zemlya'] LOOP
    -- аренда <- clients_arenda: договор
    EXECUTE format(
      'UPDATE %I d SET date = c.date FROM clients_arenda c
        WHERE d.category = ''arenda'' AND d.date = d.completion_date AND d.date <> ''''
          AND NULLIF(d.contract, '''') IS NOT NULL AND d.contract = c.contract
          AND NULLIF(c.date, '''') IS NOT NULL', dt);
    -- аренда <- clients_arenda: телефон
    EXECUTE format(
      'UPDATE %I d SET date = c.date FROM clients_arenda c
        WHERE d.category = ''arenda'' AND d.date = d.completion_date AND d.date <> ''''
          AND NULLIF(d.phone, '''') IS NOT NULL AND d.phone = c.phone
          AND NULLIF(c.date, '''') IS NOT NULL', dt);
    -- аренда <- clients_arenda: имя
    EXECUTE format(
      'UPDATE %I d SET date = c.date FROM clients_arenda c
        WHERE d.category = ''arenda'' AND d.date = d.completion_date AND d.date <> ''''
          AND d.client = c.name
          AND NULLIF(c.date, '''') IS NOT NULL', dt);
    -- покупка <- clients_prodaja: договор, телефон, имя
    EXECUTE format(
      'UPDATE %I d SET date = c.date FROM clients_prodaja c
        WHERE d.category IN (''pokupka'', ''prodaja'') AND d.date = d.completion_date AND d.date <> ''''
          AND NULLIF(d.contract, '''') IS NOT NULL AND d.contract = c.contract
          AND NULLIF(c.date, '''') IS NOT NULL', dt);
    EXECUTE format(
      'UPDATE %I d SET date = c.date FROM clients_prodaja c
        WHERE d.category IN (''pokupka'', ''prodaja'') AND d.date = d.completion_date AND d.date <> ''''
          AND NULLIF(d.phone, '''') IS NOT NULL AND d.phone = c.phone
          AND NULLIF(c.date, '''') IS NOT NULL', dt);
    EXECUTE format(
      'UPDATE %I d SET date = c.date FROM clients_prodaja c
        WHERE d.category IN (''pokupka'', ''prodaja'') AND d.date = d.completion_date AND d.date <> ''''
          AND d.client = c.name
          AND NULLIF(c.date, '''') IS NOT NULL', dt);
    -- покупка <- clients_pokupka: договор, телефон, имя
    EXECUTE format(
      'UPDATE %I d SET date = c.date FROM clients_pokupka c
        WHERE d.category IN (''pokupka'', ''prodaja'') AND d.date = d.completion_date AND d.date <> ''''
          AND NULLIF(d.contract, '''') IS NOT NULL AND d.contract = c.contract
          AND NULLIF(c.date, '''') IS NOT NULL', dt);
    EXECUTE format(
      'UPDATE %I d SET date = c.date FROM clients_pokupka c
        WHERE d.category IN (''pokupka'', ''prodaja'') AND d.date = d.completion_date AND d.date <> ''''
          AND NULLIF(d.phone, '''') IS NOT NULL AND d.phone = c.phone
          AND NULLIF(c.date, '''') IS NOT NULL', dt);
    EXECUTE format(
      'UPDATE %I d SET date = c.date FROM clients_pokupka c
        WHERE d.category IN (''pokupka'', ''prodaja'') AND d.date = d.completion_date AND d.date <> ''''
          AND d.client = c.name
          AND NULLIF(c.date, '''') IS NOT NULL', dt);
  END LOOP;
END $$;

-- 3. СЧЁТЧИКИ ПОСЛЕ: остаток битых (без найденного клиента — править вручную)
SELECT 'deals_kvartiry' AS tbl, count(*) AS still_broken
FROM deals_kvartiry WHERE date = completion_date AND date <> ''
UNION ALL
SELECT 'deals_pomescheniya', count(*)
FROM deals_pomescheniya WHERE date = completion_date AND date <> ''
UNION ALL
SELECT 'deals_zemlya', count(*)
FROM deals_zemlya WHERE date = completion_date AND date <> '';
