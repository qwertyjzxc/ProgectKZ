-- Гранты роли authenticated на клиентские таблицы и профили.
-- Выполнить в Supabase → SQL Editor → Run. Идемпотентно (можно перезапускать).
--
-- Зачем: supabase-rls-v2.sql отозвал table-level SELECT у anon/authenticated
-- на clients_arenda/clients_prodaja и выдал его заново по колонкам (все,
-- кроме phone). supabase-clients-card-v2.sql позже добавил новые колонки
-- (area_min/area_max, move_in_date, pets, contract_*), которые в тот список
-- не попали. В итоге любая операция под ролью authenticated с select("*")
-- или INSERT/UPDATE ... RETURNING * на клиентских таблицах падала с
-- "permission denied for table clients_arenda" (ломалось добавление клиента).
--
-- API-ручки клиентов переведены на service-клиент (см. app/api/clients/*),
-- но миграция нужна как страховка и как «пересчёт» грантов: её безопасно
-- перезапускать ПОСЛЕ любой миграции, добавляющей колонки в clients_* или
-- profiles. Телефон и секреты при этом НЕ возвращаются authenticated:
-- phone читается только через API с маскированием (phone-visibility),
-- password_enc/pin — только service_role.

-- 1. Диагностика ДО (вывод в результатах запроса).
SELECT
  has_table_privilege('authenticated', 'public.clients_arenda', 'INSERT') AS ins,
  has_table_privilege('authenticated', 'public.clients_arenda', 'UPDATE') AS upd,
  has_table_privilege('authenticated', 'public.clients_arenda', 'DELETE') AS del,
  has_table_privilege('authenticated', 'public.clients_arenda', 'SELECT') AS sel_table,
  has_column_privilege('authenticated', 'public.clients_arenda', 'phone', 'SELECT') AS phone_read,
  has_column_privilege('authenticated', 'public.clients_arenda', 'name', 'SELECT') AS name_read,
  has_column_privilege('authenticated', 'public.profiles', 'password_enc', 'SELECT') AS password_enc_read,
  has_column_privilege('authenticated', 'public.profiles', 'pin', 'SELECT') AS pin_read;

-- 2. Проверка дрейфа: колонки clients_*/profiles без SELECT у authenticated
--    (кроме намеренно закрытых phone/password_enc/pin). Ожидание: «нет».
DO $$
DECLARE
  t text;
  v_missing text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clients_arenda', 'clients_prodaja'] LOOP
    SELECT string_agg(c.column_name, ', ' ORDER BY c.column_name)
      INTO v_missing
      FROM information_schema.columns c
     WHERE c.table_schema = 'public' AND c.table_name = t
       AND c.column_name <> 'phone'
       AND NOT has_column_privilege('authenticated', format('public.%I', t), c.column_name, 'SELECT');
    RAISE NOTICE 'дрейф %: колонки без SELECT у authenticated: %',
      t, COALESCE(v_missing, 'нет — всё покрыто');
  END LOOP;
  SELECT string_agg(c.column_name, ', ' ORDER BY c.column_name)
    INTO v_missing
    FROM information_schema.columns c
   WHERE c.table_schema = 'public' AND c.table_name = 'profiles'
     AND c.column_name NOT IN ('password_enc', 'pin')
     AND NOT has_column_privilege('authenticated', 'public.profiles', c.column_name, 'SELECT');
  RAISE NOTICE 'дрейф profiles: колонки без SELECT у authenticated: %',
    COALESCE(v_missing, 'нет — всё покрыто');
END $$;

-- 3. Запись в клиентские таблицы: явный GRANT (страховка, если привилегии
--    когда-то отозваны вне репозитория). Чтение (SELECT) сюда НЕ возвращаем —
--    оно остаётся column-level без phone.
GRANT INSERT, UPDATE, DELETE ON TABLE public.clients_arenda, public.clients_prodaja TO authenticated;

-- 4. Пересчёт column-level SELECT по текущему списку колонок (без phone) —
--    покрывает колонки, добавленные после supabase-rls-v2.sql.
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
    EXECUTE format('GRANT SELECT (%s) ON public.%I TO authenticated', v_cols, t);
  END LOOP;
END $$;

-- 5. То же для profiles: колонки без password_enc/pin.
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
  EXECUTE format('GRANT SELECT (%s) ON public.profiles TO authenticated', v_cols);
END $$;

-- 6. Диагностика ПОСЛЕ: phone_read/password_enc_read/pin_read обязаны быть
--    false, sel_table — false (table-level SELECT закрыт), остальное — true.
SELECT
  has_table_privilege('authenticated', 'public.clients_arenda', 'INSERT') AS ins,
  has_table_privilege('authenticated', 'public.clients_arenda', 'UPDATE') AS upd,
  has_table_privilege('authenticated', 'public.clients_arenda', 'DELETE') AS del,
  has_table_privilege('authenticated', 'public.clients_arenda', 'SELECT') AS sel_table,
  has_column_privilege('authenticated', 'public.clients_arenda', 'phone', 'SELECT') AS phone_read,
  has_column_privilege('authenticated', 'public.clients_arenda', 'name', 'SELECT') AS name_read,
  has_column_privilege('authenticated', 'public.profiles', 'password_enc', 'SELECT') AS password_enc_read,
  has_column_privilege('authenticated', 'public.profiles', 'pin', 'SELECT') AS pin_read;
