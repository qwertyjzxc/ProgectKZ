-- Закрытие RPC от анонимного доступа. Запускать ПОСЛЕ supabase-clients-rpc.sql.
--
-- get_clients_page / get_clients_distincts объявлены SECURITY DEFINER (обход RLS),
-- а REVOKE на исполнение не было нигде: по умолчанию Postgres даёт EXECUTE ролям
-- через PUBLIC, поэтому любой с публичным anon-ключом мог вызвать
--   POST /rest/v1/rpc/get_clients_page {"p_table":"clients_arenda",...}
-- и выгрузить клиентов целиком, включая телефоны, минуя API и маскирование.

DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('get_clients_page', 'get_clients_distincts')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
  END LOOP;
END $$;

-- Проверка: anon_execute обязан быть false у обеих функций.
SELECT p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('get_clients_page', 'get_clients_distincts');
