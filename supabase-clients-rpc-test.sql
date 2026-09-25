-- Тестовая копия для проверки RPC БЕЗ касания продовых таблиц.
-- Выполнить в Supabase Dashboard → SQL Editor → Run ПОСЛЕ supabase-clients-rpc.sql.
-- Создаёт test_clients (структура как clients_arenda + 300 свежих строк).

DROP TABLE IF EXISTS test_clients;

CREATE TABLE test_clients (LIKE clients_arenda INCLUDING ALL);

INSERT INTO test_clients
SELECT * FROM clients_arenda
ORDER BY created_at DESC
LIMIT 300;
