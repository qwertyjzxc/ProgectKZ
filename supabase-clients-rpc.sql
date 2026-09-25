-- Скоростной список клиентов одним вызовом: строки + тотал + разбивки за 1 хоп.
-- Выполнить в Supabase Dashboard → SQL Editor → Run.
-- Вызывает бэкенд через service role; проверка прав остаётся в API.

CREATE OR REPLACE FUNCTION get_clients_page(
  p_table text,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_types text DEFAULT NULL,          -- csv точных значений type
  p_completed text DEFAULT NULL,      -- точный статус
  p_active_only boolean DEFAULT TRUE, -- скрыть «Сделка завершена» (NULL тоже активны)
  p_words text[] DEFAULT NULL,        -- слова поиска: AND, по 6 колонкам (уже очищенные)
  p_name_words text[] DEFAULT NULL,
  p_district text DEFAULT NULL,
  p_broker text DEFAULT NULL,
  p_jk text DEFAULT NULL,
  p_rooms text DEFAULT NULL,          -- префикс
  p_address_words text[] DEFAULT NULL,
  p_amount_min numeric DEFAULT NULL,
  p_amount_max numeric DEFAULT NULL,
  p_area_min numeric DEFAULT NULL,
  p_area_max numeric DEFAULT NULL,
  p_date_from text DEFAULT NULL,      -- DD.MM.YYYY
  p_date_to text DEFAULT NULL         -- DD.MM.YYYY
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_where_type text := 'TRUE';
  v_where_full text := 'TRUE';
  v_w text;
  v_total bigint := 0;
  v_by_type json := '{}'::json;
  v_by_status json := '{}'::json;
  v_rows json := '[]'::json;
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

  -- статус
  IF p_completed IS NOT NULL AND p_completed <> '' THEN
    IF p_completed = 'Без статуса' THEN
      -- как на клиенте: (completed || "Без статуса") — пустые тоже сюда
      v_where_full := v_where_full || ' AND (completed IS NULL OR completed = '''')';
    ELSE
      v_where_full := v_where_full || ' AND completed = ' || quote_literal(p_completed);
    END IF;
  ELSIF p_active_only THEN
    v_where_full := v_where_full || ' AND (completed <> ''Сделка завершена'' OR completed IS NULL)';
  END IF;

  -- точные совпадения
  IF p_district IS NOT NULL AND p_district <> '' THEN
    v_where_full := v_where_full || ' AND district = ' || quote_literal(p_district);
  END IF;
  IF p_broker IS NOT NULL AND p_broker <> '' THEN
    v_where_full := v_where_full || ' AND broker = ' || quote_literal(p_broker);
  END IF;
  IF p_jk IS NOT NULL AND p_jk <> '' THEN
    v_where_full := v_where_full || ' AND jk = ' || quote_literal(p_jk);
  END IF;
  IF p_rooms IS NOT NULL AND p_rooms <> '' THEN
    v_where_full := v_where_full || ' AND rooms LIKE ' || quote_literal(p_rooms || '%');
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
      END IF;
    END LOOP;
  END IF;
  IF p_name_words IS NOT NULL THEN
    FOREACH v_w IN ARRAY p_name_words LOOP
      IF v_w <> '' THEN
        v_where_full := v_where_full || ' AND name ILIKE ''%'' || ' || quote_literal(v_w) || ' || ''%''';
      END IF;
    END LOOP;
  END IF;
  IF p_address_words IS NOT NULL THEN
    FOREACH v_w IN ARRAY p_address_words LOOP
      IF v_w <> '' THEN
        v_where_full := v_where_full || ' AND address ILIKE ''%'' || ' || quote_literal(v_w) || ' || ''%''';
      END IF;
    END LOOP;
  END IF;

  -- суммы (числовая колонка)
  IF p_amount_min IS NOT NULL THEN
    v_where_full := v_where_full || ' AND amount >= ' || p_amount_min::text;
  END IF;
  IF p_amount_max IS NOT NULL THEN
    v_where_full := v_where_full || ' AND amount <= ' || p_amount_max::text;
  END IF;

  -- площадь: текстовая колонка — только числовые значения участвуют (как Number() на клиенте)
  IF p_area_min IS NOT NULL THEN
    v_where_full := v_where_full ||
      ' AND area ~ ''^[0-9]+(\.[0-9]+)?$'' AND area::numeric >= ' || p_area_min::text;
  END IF;
  IF p_area_max IS NOT NULL THEN
    v_where_full := v_where_full ||
      ' AND area ~ ''^[0-9]+(\.[0-9]+)?$'' AND area::numeric <= ' || p_area_max::text;
  END IF;

  -- даты: текст DD.MM.YYYY — невалидные строки отпадают (как NaN на клиенте)
  IF p_date_from IS NOT NULL AND p_date_from ~ '^\d{2}\.\d{2}\.\d{4}$' THEN
    v_where_full := v_where_full ||
      ' AND date ~ ''^\d{2}\.\d{2}\.\d{4}$'' AND to_date(date, ''DD.MM.YYYY'') >= to_date(' ||
      quote_literal(p_date_from) || ', ''DD.MM.YYYY'')';
  END IF;
  IF p_date_to IS NOT NULL AND p_date_to ~ '^\d{2}\.\d{2}\.\d{4}$' THEN
    v_where_full := v_where_full ||
      ' AND date ~ ''^\d{2}\.\d{2}\.\d{4}$'' AND to_date(date, ''DD.MM.YYYY'') <= to_date(' ||
      quote_literal(p_date_to) || ', ''DD.MM.YYYY'')';
  END IF;

  -- тотал и пилюли: scope типа (count(*) считал бы ГРУППЫ — нужен SUM)
  EXECUTE format(
    'SELECT COALESCE(SUM(c), 0), COALESCE(json_object_agg(s, c), ''{}''::json) FROM (SELECT COALESCE(completed, ''Без статуса'') AS s, count(*) AS c FROM %I WHERE %s GROUP BY 1) t',
    p_table, v_where_type
  ) INTO v_total, v_by_type;

  -- разбивка: полный scope
  EXECUTE format(
    'SELECT COALESCE(json_object_agg(s, c), ''{}''::json) FROM (SELECT COALESCE(completed, ''Без статуса'') AS s, count(*) AS c FROM %I WHERE %s GROUP BY 1) t',
    p_table, v_where_full
  ) INTO v_by_status;

  -- страница строк
  EXECUTE format(
    'SELECT COALESCE(json_agg(t ORDER BY created_at DESC), ''[]''::json) FROM (SELECT * FROM %I WHERE %s ORDER BY created_at DESC LIMIT %s OFFSET %s) t',
    p_table, v_where_full, p_limit, p_offset
  ) INTO v_rows;

  RETURN json_build_object('rows', v_rows, 'total', v_total, 'byType', v_by_type, 'byStatus', v_by_status);
END;
$$;

-- Опции фильтров на всю категорию (районы, ЖК) одним вызовом.
CREATE OR REPLACE FUNCTION get_clients_distincts(p_table text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_d json;
  v_j json;
BEGIN
  IF p_table NOT IN ('clients_arenda', 'clients_prodaja', 'test_clients') THEN
    RAISE EXCEPTION 'bad table';
  END IF;
  EXECUTE format(
    'SELECT COALESCE(json_agg(x), ''[]''::json) FROM (SELECT DISTINCT district AS x FROM %I WHERE district IS NOT NULL AND district <> '''' ORDER BY 1) t',
    p_table
  ) INTO v_d;
  EXECUTE format(
    'SELECT COALESCE(json_agg(x), ''[]''::json) FROM (SELECT DISTINCT jk AS x FROM %I WHERE jk IS NOT NULL AND jk <> '''' ORDER BY 1) t',
    p_table
  ) INTO v_j;
  RETURN json_build_object('districts', v_d, 'jk', v_j);
END;
$$;

-- Задел на рост таблиц: сейчас 3.5k строк и всё летает и так,
-- индексы пригодятся когда станет 50k+. Прогон необязателен прямо сейчас.
CREATE INDEX IF NOT EXISTS idx_clients_arenda_type_created ON clients_arenda (type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_arenda_completed ON clients_arenda (completed);
CREATE INDEX IF NOT EXISTS idx_clients_prodaja_type_created ON clients_prodaja (type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_prodaja_completed ON clients_prodaja (completed);
