-- RLS v2 — границы на уровне БД (закрытие обхода API через прямой PostgREST).
-- Выполнить в Supabase → SQL Editor → Run. Идемпотентно (можно перезапускать).
--
-- До этой миграции всё разграничение прав жило только в API-роутах, а RLS
-- пускала любого залогиненного (anon-ключ публичный, сессия есть у каждого
-- сотрудника) напрямую в PostgREST мимо всех проверок приложения. Теперь:
--   1) сделки (deals_*): полный доступ только у админов — совпадает с requireAdmin;
--   2) clients_arenda / clients_prodaja: колонка phone не читается ролью
--      authenticated напрямую (column-level GRANT без phone) — телефоны
--      отдаёт только API (service-клиент + маскирование phone-visibility);
--   3) profiles: password_enc и pin не читаются ролью authenticated — только
--      service_role (серверные экшены и админские ручки);
--   4) RPC get_clients_page / get_clients_distincts: EXECUTE только у
--      service_role (раньше GRANT authenticated открывал выгрузку строк
--      с телефонами без маски — revoke-rpc.sql закрывал только anon).
-- Побочно: INSERT/UPDATE по clients_* не тронуты — писать phone по-прежнему
-- можно (привилегии SELECT и UPDATE независимы), читать — только через API.

-- 0. Хелпер роли: есть ли у текущего auth-пользователя профиль-админ.
--    SECURITY DEFINER + владелец postgres: таблицу profiles читает как
--    владелец, поэтому не упирается в её RLS (иначе — рекурсия политики).
--    search_path пустой, все имена квалифицированы — точка входа для инъекций.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = (SELECT auth.uid()) AND p.role = 'admin'
  );
$fn$;

-- 1. Сделки: полный доступ — только админам.
--    (SELECT ...) в политике — InitPlan: функция вычисляется один раз на
--    запрос, а не на каждую строку.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['deals_kvartiry', 'deals_pomescheniya', 'deals_zemlya'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS crm_authenticated_all ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS crm_deals_admin_all ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY crm_deals_admin_all ON public.%I FOR ALL TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()))',
      t
    );
  END LOOP;
END $$;

-- 2. Клиенты: table-level SELECT отбирается у anon/authenticated и выдаётся
--    заново по колонкам — всем, кроме phone. Список колонок собирается из
--    information_schema: миграция не ломается от дрейфа схемы (новые колонки
--    просто не будут видны до перезапуска — fail closed).
DO $$
DECLARE
  t text;
  v_cols text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clients_arenda', 'clients_prodaja'] LOOP
    SELECT string_agg(quote_ident(column_name), ', ')
      INTO v_cols
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t
        AND column_name <> 'phone';
    IF v_cols IS NULL THEN
      RAISE EXCEPTION 'таблица % не найдена', t;
    END IF;
    EXECUTE format('REVOKE SELECT ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT (%s) ON public.%I TO authenticated', v_cols, t);
  END LOOP;
END $$;

-- 3. Профили: password_enc и pin — только service_role.
DO $$
DECLARE v_cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO v_cols
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name NOT IN ('password_enc', 'pin');
  IF v_cols IS NULL THEN
    RAISE EXCEPTION 'таблица profiles не найдена';
  END IF;
  REVOKE SELECT ON public.profiles FROM anon, authenticated;
  EXECUTE format('GRANT SELECT (%s) ON public.profiles TO authenticated', v_cols);
END $$;

-- 4. Клиентские RPC: EXECUTE только у service_role (API зовёт их через
--    сервис-клиент, грант authenticated был не нужен и открывал обход маски).
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
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn.sig);
  END LOOP;
END $$;

-- Диагностика (просто SELECT, ничего не меняет). Ожидания после запуска:
--   phone_read = false, password_enc_read/pin_read = false,
--   rpc_auth_execute = false, is_admin_exists = true, other_cols_read = true.
--   deals_table_select = true — это норма: GRANT на таблицу сделок остаётся,
--   строки фильтрует RLS-политика crm_deals_admin_all (не-админ получает 0 строк).
--   Проверить политику можно подменой роли:
--     select set_config('role','authenticated',true);
--     select count(*) from public.deals_kvartiry;  -- 0 для не-админа
--     reset role;
SELECT
  has_column_privilege('authenticated', 'public.clients_arenda', 'phone', 'SELECT') AS phone_read,
  has_any_column_privilege('authenticated', 'public.clients_arenda', 'SELECT') AS other_cols_read,
  has_table_privilege('authenticated', 'public.deals_kvartiry', 'SELECT') AS deals_table_select,
  has_column_privilege('authenticated', 'public.profiles', 'password_enc', 'SELECT') AS password_enc_read,
  has_column_privilege('authenticated', 'public.profiles', 'pin', 'SELECT') AS pin_read,
  has_function_privilege('authenticated', 'public.get_clients_page(text,int,int,text,text,boolean,text[],text[],text,text,text,text,text[],numeric,numeric,numeric,numeric,text,text,text,boolean)', 'EXECUTE') AS rpc_auth_execute,
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'is_admin') AS is_admin_exists;
