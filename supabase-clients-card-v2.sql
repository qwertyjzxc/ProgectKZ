-- В卡片е v2: новые поля клиентов (площадь от/до, дата заезда, животные,
-- договор с клиентом), связь задач с клиентом для «Следующего действия»,
-- дата/статус договора в сделках. RPC v4: фильтры под диапазон площади
-- и мультивыбор района/ЖК (через запятую).
-- Выполнить в Supabase → SQL Editor → Run. Идемпотентно.
-- Код совместим и ДО запуска (лишние колонки отбрасываются с warn в логах).

-- 1. Клиенты: новые колонки (обе таблицы).
DO $$
DECLARE
  t text;
  cols text := '';
BEGIN
  FOREACH t IN ARRAY ARRAY['clients_arenda', 'clients_prodaja'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS area_min INTEGER', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS area_max INTEGER', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS move_in_date TEXT DEFAULT ''''', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS pets TEXT DEFAULT ''''', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS contract_status TEXT DEFAULT ''''', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS contract_date TEXT DEFAULT ''''', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS contract_valid_until TEXT DEFAULT ''''', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS contract_file TEXT DEFAULT ''''', t);
  END LOOP;
END $$;

-- Старое текстовое area переносим в диапазон (одиночное число = и от, и до).
UPDATE clients_arenda SET area_min = NULLIF(regexp_replace(area, '[^0-9.]', '', 'g'), '')::numeric::int,
       area_max = NULLIF(regexp_replace(area, '[^0-9.]', '', 'g'), '')::numeric::int
WHERE area ~ '^[0-9]+(\.[0-9]+)?$' AND area_min IS NULL AND area_max IS NULL;
UPDATE clients_prodaja SET area_min = NULLIF(regexp_replace(area, '[^0-9.]', '', 'g'), '')::numeric::int,
       area_max = NULLIF(regexp_replace(area, '[^0-9.]', '', 'g'), '')::numeric::int
WHERE area ~ '^[0-9]+(\.[0-9]+)?$' AND area_min IS NULL AND area_max IS NULL;

-- 2. Задачи: связь с клиентом для «Следующего действия».
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS client_id BIGINT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS client_table TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_tasks_client ON public.tasks (client_id);

-- 3. Сделки: дата и статус договора (из формы «Завершить сделку»).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['deals_kvartiry', 'deals_pomescheniya', 'deals_zemlya'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS contract_date TEXT DEFAULT ''''', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS contract_status TEXT DEFAULT ''''', t);
  END LOOP;
END $$;

-- 4. RPC v4: та же сигнатура, новые правила внутри:
--    - район/ЖК: мультивыбор хранится строкой «Абайский, Туранский» —
--      фильтр стал «содержит», точное равенство больше не подходит;
--    - площадь: числовые area_min/area_max (диапазон пересекается с фильтром),
--      старое текстовое area — фолбэк для строк без диапазона.
DROP FUNCTION IF EXISTS public.get_clients_page(p_table text, p_limit int, p_offset int, p_types text, p_completed text, p_active_only boolean, p_words text[], p_name_words text[], p_district text, p_broker text, p_jk text, p_rooms text, p_address_words text[], p_amount_min numeric, p_amount_max numeric, p_area_min numeric, p_area_max numeric, p_date_from text, p_date_to text, p_exclude_status text, p_no_status boolean);

CREATE OR REPLACE FUNCTION public.get_clients_page(
  p_table text,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_types text DEFAULT NULL,
  p_completed text DEFAULT NULL,
  p_active_only boolean DEFAULT TRUE,
  p_words text[] DEFAULT NULL,
  p_name_words text[] DEFAULT NULL,
  p_district text DEFAULT NULL,
  p_broker text DEFAULT NULL,
  p_jk text DEFAULT NULL,
  p_rooms text DEFAULT NULL,
  p_address_words text[] DEFAULT NULL,
  p_amount_min numeric DEFAULT NULL,
  p_amount_max numeric DEFAULT NULL,
  p_area_min numeric DEFAULT NULL,
  p_area_max numeric DEFAULT NULL,
  p_date_from text DEFAULT NULL,
  p_date_to text DEFAULT NULL,
  p_exclude_status text DEFAULT NULL,
  p_no_status boolean DEFAULT FALSE
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_where_type text := 'TRUE';
  v_where_full text := 'TRUE';
  v_where_facet text := 'TRUE';
  v_w text;
  v_total bigint := 0;
  v_total_facet bigint := 0;
  v_by_type json := '{}'::json;
  v_by_status json := '{}'::json;
  v_by_facet json := '{}'::json;
  v_rows json := '[]'::json;
  v_area text;
BEGIN
  IF p_table NOT IN ('clients_arenda', 'clients_prodaja', 'test_clients') THEN
    RAISE EXCEPTION 'bad table';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 THEN p_limit := 50; END IF;
  IF p_limit > 500 THEN p_limit := 500; END IF;
  IF p_offset IS NULL OR p_offset < 0 THEN p_offset := 0; END IF;

  -- scope типа
  IF p_types IS NOT NULL AND p_types <> '' THEN
    v_where_type := 'type = ANY (string_to_array(' || quote_literal(p_types) || ', '',''))';
  END IF;
  v_where_full := v_where_type;
  v_where_facet := v_where_type;

  -- статус (runtime-параметры, без хардкода кириллицы)
  IF p_no_status THEN
    v_where_full := v_where_full || ' AND (completed IS NULL OR completed = '''')';
  ELSIF p_completed IS NOT NULL AND p_completed <> '' THEN
    v_where_full := v_where_full || ' AND completed = ' || quote_literal(p_completed);
  ELSIF p_active_only AND p_exclude_status IS NOT NULL AND p_exclude_status <> '' THEN
    v_where_full := v_where_full || ' AND (completed <> ' || quote_literal(p_exclude_status) || ' OR completed IS NULL)';
  END IF;

  -- точные совпадения → фасетный scope. Район/ЖК: мультивыбор строкой через
  -- запятую, поэтому равенство сменилось на вхождение.
  IF p_district IS NOT NULL AND p_district <> '' THEN
    v_where_full := v_where_full || ' AND district ILIKE ''%'' || ' || quote_literal(p_district) || ' || ''%''';
    v_where_facet := v_where_facet || ' AND district ILIKE ''%'' || ' || quote_literal(p_district) || ' || ''%''';
  END IF;
  IF p_broker IS NOT NULL AND p_broker <> '' THEN
    v_where_full := v_where_full || ' AND broker = ' || quote_literal(p_broker);
    v_where_facet := v_where_facet || ' AND broker = ' || quote_literal(p_broker);
  END IF;
  IF p_jk IS NOT NULL AND p_jk <> '' THEN
    v_where_full := v_where_full || ' AND jk ILIKE ''%'' || ' || quote_literal(p_jk) || ' || ''%''';
    v_where_facet := v_where_facet || ' AND jk ILIKE ''%'' || ' || quote_literal(p_jk) || ' || ''%''';
  END IF;
  IF p_rooms IS NOT NULL AND p_rooms <> '' THEN
    v_where_full := v_where_full || ' AND rooms LIKE ' || quote_literal(p_rooms || '%');
    v_where_facet := v_where_facet || ' AND rooms LIKE ' || quote_literal(p_rooms || '%');
  END IF;

  -- слова: каждое — в любом из полей (AND между словами)
  IF p_words IS NOT NULL THEN
    FOREACH v_w IN ARRAY p_words LOOP
      IF v_w <> '' THEN
        v_where_full := v_where_full ||
          ' AND (name ILIKE ''%'' || ' || quote_literal(v_w) || ' || ''%''' ||
          ' OR phone ILIKE ''%'' || ' || quote_literal(v_w) || ' || ''%''' ||
          ' OR district ILIKE ''%'' || ' || quote_literal(v_w) || ' || ''%''' ||
          ' OR address ILIKE ''%'' || ' || quote_literal(v_w) || ' || ''%''' ||
          ' OR jk ILIKE ''%'' || ' || quote_literal(v_w) || ' || ''%''' ||
          ' OR broker ILIKE ''%'' || ' || quote_literal(v_w) || ' || ''%'')';
        v_where_facet := v_where_facet ||
          ' AND (name ILIKE ''%'' || ' || quote_literal(v_w) || ' || ''%''' ||
          ' OR phone ILIKE ''%'' || ' || quote_literal(v_w) || ' || ''%''' ||
          ' OR district ILIKE ''%'' || ' || quote_literal(v_w) || ' || ''%''' ||
          ' OR address ILIKE ''%'' || ' || quote_literal(v_w) || ' || ''%''' ||
          ' OR jk ILIKE ''%'' || ' || quote_literal(v_w) || ' || ''%''' ||
          ' OR broker ILIKE ''%'' || ' || quote_literal(v_w) || ' || ''%'')';
      END IF;
    END LOOP;
  END IF;
  IF p_name_words IS NOT NULL THEN
    FOREACH v_w IN ARRAY p_name_words LOOP
      IF v_w <> '' THEN
        v_where_full := v_where_full || ' AND name ILIKE ''%'' || ' || quote_literal(v_w) || ' || ''%''';
        v_where_facet := v_where_facet || ' AND name ILIKE ''%'' || ' || quote_literal(v_w) || ' || ''%''';
      END IF;
    END LOOP;
  END IF;
  IF p_address_words IS NOT NULL THEN
    FOREACH v_w IN ARRAY p_address_words LOOP
      IF v_w <> '' THEN
        v_where_full := v_where_full || ' AND address ILIKE ''%'' || ' || quote_literal(v_w) || ' || ''%''';
        v_where_facet := v_where_facet || ' AND address ILIKE ''%'' || ' || quote_literal(v_w) || ' || ''%''';
      END IF;
    END LOOP;
  END IF;

  -- бюджет: пересечение диапазонов
  IF p_amount_min IS NOT NULL THEN
    v_where_full := v_where_full || ' AND amount >= ' || p_amount_min::text;
    v_where_facet := v_where_facet || ' AND amount >= ' || p_amount_min::text;
  END IF;
  IF p_amount_max IS NOT NULL THEN
    v_where_full := v_where_full || ' AND COALESCE(amount_min, amount) <= ' || p_amount_max::text;
    v_where_facet := v_where_facet || ' AND COALESCE(amount_min, amount) <= ' || p_amount_max::text;
  END IF;

  -- площадь: числовой диапазон area_min/area_max; фолбэк — старое текстовое
  -- area с чисто численным значением. Клиент без площади под фильтр не попадает.
  IF p_area_min IS NOT NULL THEN
    v_area := 'COALESCE(area_max, CASE WHEN area ~ ''^[0-9]+(\.[0-9]+)?$'' THEN area::numeric END)';
    v_where_full := v_where_full || ' AND ' || v_area || ' >= ' || p_area_min::text;
    v_where_facet := v_where_facet || ' AND ' || v_area || ' >= ' || p_area_min::text;
  END IF;
  IF p_area_max IS NOT NULL THEN
    v_area := 'COALESCE(area_min, CASE WHEN area ~ ''^[0-9]+(\.[0-9]+)?$'' THEN area::numeric END)';
    v_where_full := v_where_full || ' AND ' || v_area || ' <= ' || p_area_max::text;
    v_where_facet := v_where_facet || ' AND ' || v_area || ' <= ' || p_area_max::text;
  END IF;

  -- даты: текст DD.MM.YYYY
  IF p_date_from IS NOT NULL AND p_date_from ~ '^\d{2}\.\d{2}\.\d{4}$' THEN
    v_where_full := v_where_full ||
      ' AND date ~ ''^\d{2}\.\d{2}\.\d{4}$'' AND to_date(date, ''DD.MM.YYYY'') >= to_date(' ||
      quote_literal(p_date_from) || ', ''DD.MM.YYYY'')';
    v_where_facet := v_where_facet ||
      ' AND date ~ ''^\d{2}\.\d{2}\.\d{4}$'' AND to_date(date, ''DD.MM.YYYY'') >= to_date(' ||
      quote_literal(p_date_from) || ', ''DD.MM.YYYY'')';
  END IF;
  IF p_date_to IS NOT NULL AND p_date_to ~ '^\d{2}\.\d{2}\.\d{4}$' THEN
    v_where_full := v_where_full ||
      ' AND date ~ ''^\d{2}\.\d{2}\.\d{4}$'' AND to_date(date, ''DD.MM.YYYY'') <= to_date(' ||
      quote_literal(p_date_to) || ', ''DD.MM.YYYY'')';
    v_where_facet := v_where_facet ||
      ' AND date ~ ''^\d{2}\.\d{2}\.\d{4}$'' AND to_date(date, ''DD.MM.YYYY'') <= to_date(' ||
      quote_literal(p_date_to) || ', ''DD.MM.YYYY'')';
  END IF;

  EXECUTE format(
    'SELECT COALESCE(SUM(c), 0), COALESCE(json_object_agg(s, c), ''{}''::json) FROM (SELECT COALESCE(completed, '''') AS s, count(*) AS c FROM %I WHERE %s GROUP BY 1) t',
    p_table, v_where_type
  ) INTO v_total, v_by_type;

  EXECUTE format(
    'SELECT count(*) FROM %I WHERE %s',
    p_table, v_where_facet
  ) INTO v_total_facet;

  EXECUTE format(
    'SELECT COALESCE(json_object_agg(s, c), ''{}''::json) FROM (SELECT COALESCE(completed, '''') AS s, count(*) AS c FROM %I WHERE %s GROUP BY 1) t',
    p_table, v_where_full
  ) INTO v_by_status;

  EXECUTE format(
    'SELECT COALESCE(json_object_agg(s, c), ''{}''::json) FROM (SELECT COALESCE(completed, '''') AS s, count(*) AS c FROM %I WHERE %s GROUP BY 1) t',
    p_table, v_where_facet
  ) INTO v_by_facet;

  EXECUTE format(
    'SELECT COALESCE(json_agg(t ORDER BY created_at DESC), ''[]''::json) FROM (SELECT * FROM %I WHERE %s ORDER BY created_at DESC LIMIT %s OFFSET %s) t',
    p_table, v_where_full, p_limit, p_offset
  ) INTO v_rows;

  RETURN json_build_object('rows', v_rows, 'total', v_total, 'totalAll', v_total_facet, 'byType', v_by_type, 'byStatus', v_by_status, 'byStatusAll', v_by_facet);
END;
$fn$;
