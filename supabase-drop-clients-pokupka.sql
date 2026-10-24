-- Удаление мёртвой легаси-таблицы clients_pokupka.
-- В коде она не используется с самого начала (рабочая таблица покупки —
-- clients_prodaja); на неё остались RLS-политики и один запрос в аналитике
-- (убран). Выполнить в Supabase → SQL Editor → Run.
--
-- Сначала убедитесь, что в таблице нет ценных данных:
--   select count(*) from public.clients_pokupka;
-- Ожидание: 0. Если строк нет — удаляйте смело. Если unexpectedly много —
-- сначала сверьте их с clients_prodaja (могут быть данные старого импорта).

DROP TABLE IF EXISTS public.clients_pokupka;

-- Проверка: строка ниже не должна вернуть таблицу
select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'clients_pokupka';
