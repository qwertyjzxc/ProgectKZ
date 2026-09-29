-- Применить в Supabase -> SQL Editor (весь файл целиком).
-- Пересоздаёт get_clients_page: скрытие завершённых + пересечение диапазонов бюджета.

DROP FUNCTION IF EXISTS get_clients_page(p_table text, p_limit int, p_offset int, p_types text, p_completed text, p_active_only boolean, p_words text[], p_name_words text[], p_district text, p_broker text, p_jk text, p_rooms text, p_address_words text[], p_amount_min numeric, p_amount_max numeric, p_area_min numeric, p_area_max numeric, p_date_from text, p_date_to text);

-- РЎРєРѕСЂРѕСЃС‚РЅРѕР№ СЃРїРёСЃРѕРє РєР»РёРµРЅС‚РѕРІ РѕРґРЅРёРј РІС‹Р·РѕРІРѕРј: СЃС‚СЂРѕРєРё + С‚РѕС‚Р°Р» + СЂР°Р·Р±РёРІРєРё Р·Р° 1 С…РѕРї.
-- Р’С‹РїРѕР»РЅРёС‚СЊ РІ Supabase Dashboard в†’ SQL Editor в†’ Run.
-- Р’С‹Р·С‹РІР°РµС‚ Р±СЌРєРµРЅРґ С‡РµСЂРµР· service role; РїСЂРѕРІРµСЂРєР° РїСЂР°РІ РѕСЃС‚Р°С‘С‚СЃСЏ РІ API.
-- v2: +byStatusAll вЂ” СЂР°Р·Р±РёРІРєР° РїРѕ СЃС‚Р°С‚СѓСЃР°Рј СЃРѕ Р’РЎР•РњР С„РёР»СЊС‚СЂР°РјРё, РєСЂРѕРјРµ СЃР°РјРѕРіРѕ
-- СЃС‚Р°С‚СѓСЃР° (РґР»СЏ РїРёР»СЋР»СЊ: СЃС‡С‘С‚С‡РёРєРё С‡РµСЃС‚РЅРѕ СЂРµР°РіРёСЂСѓСЋС‚ РЅР° Р±СЂРѕРєРµСЂР°/СЂР°Р№РѕРЅ/РїРѕРёСЃРє).
-- РџРµСЂРµР·Р°РїСѓСЃРє РїРѕРІРµСЂС… v1 Р±РµР·РѕРїР°СЃРµРЅ (CREATE OR REPLACE, СЃРёРіРЅР°С‚СѓСЂР° С‚Р° Р¶Рµ).

CREATE OR REPLACE FUNCTION get_clients_page(
  p_table text,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_types text DEFAULT NULL,          -- csv С‚РѕС‡РЅС‹С… Р·РЅР°С‡РµРЅРёР№ type
  p_completed text DEFAULT NULL,      -- С‚РѕС‡РЅС‹Р№ СЃС‚Р°С‚СѓСЃ
  p_active_only boolean DEFAULT TRUE, -- СЃРєСЂС‹С‚СЊ В«РЎРґРµР»РєР° Р·Р°РІРµСЂС€РµРЅР°В» (NULL С‚РѕР¶Рµ Р°РєС‚РёРІРЅС‹)
  p_words text[] DEFAULT NULL,        -- СЃР»РѕРІР° РїРѕРёСЃРєР°: AND, РїРѕ 6 РєРѕР»РѕРЅРєР°Рј (СѓР¶Рµ РѕС‡РёС‰РµРЅРЅС‹Рµ)
  p_name_words text[] DEFAULT NULL,
  p_district text DEFAULT NULL,
  p_broker text DEFAULT NULL,
  p_jk text DEFAULT NULL,
  p_rooms text DEFAULT NULL,          -- РїСЂРµС„РёРєСЃ
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
  v_where_facet text := 'TRUE';
  v_w text;
  v_total bigint := 0;
  v_total_facet bigint := 0;
  v_by_type json := '{}'::json;
  v_by_status json := '{}'::json;
  v_by_facet json := '{}'::json;
  v_rows json := '[]'::json;
BEGIN
  IF p_table NOT IN ('clients_arenda', 'clients_prodaja', 'test_clients') THEN
    RAISE EXCEPTION 'bad table';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 THEN p_limit := 50; END IF;
  IF p_limit > 500 THEN p_limit := 500; END IF;
  IF p_offset IS NULL OR p_offset < 0 THEN p_offset := 0; END IF;

  -- scope С‚РёРїР°
  IF p_types IS NOT NULL AND p_types <> '' THEN
    v_where_type := 'type = ANY (string_to_array(' || quote_literal(p_types) || ', '',''))';
  END IF;
  v_where_full := v_where_type;
  -- С„Р°СЃРµС‚РЅС‹Р№ scope: РІСЃС‘, РєСЂРѕРјРµ СЃС‚Р°С‚СѓСЃР° (СЃС‚Р°С‚СѓСЃРЅС‹Р№ С„РёР»СЊС‚СЂ СЃСЋРґР° РЅРµ РїРѕРїР°РґР°РµС‚)
  v_where_facet := v_where_type;

  -- СЃС‚Р°С‚СѓСЃ
  IF p_completed IS NOT NULL AND p_completed <> '' THEN
    IF p_completed = 'Р‘РµР· СЃС‚Р°С‚СѓСЃР°' THEN
      -- РєР°Рє РЅР° РєР»РёРµРЅС‚Рµ: (completed || "Р‘РµР· СЃС‚Р°С‚СѓСЃР°") вЂ” РїСѓСЃС‚С‹Рµ С‚РѕР¶Рµ СЃСЋРґР°
      v_where_full := v_where_full || ' AND (completed IS NULL OR completed = '''')';
    ELSE
      v_where_full := v_where_full || ' AND completed = ' || quote_literal(p_completed);
    END IF;
  ELSIF p_active_only THEN
    v_where_full := v_where_full || ' AND (completed <> ''РЎРґРµР»РєР° Р·Р°РІРµСЂС€РµРЅР°'' OR completed IS NULL)';
  END IF;

  -- С‚РѕС‡РЅС‹Рµ СЃРѕРІРїР°РґРµРЅРёСЏ (РґСѓР±Р»РёСЂСѓРµРј РІРѕ С„Р°СЃРµС‚РЅС‹Р№ scope вЂ” РІСЃС‘, РєСЂРѕРјРµ СЃС‚Р°С‚СѓСЃР°)
  IF p_district IS NOT NULL AND p_district <> '' THEN
    v_where_full := v_where_full || ' AND district = ' || quote_literal(p_district);
    v_where_facet := v_where_facet || ' AND district = ' || quote_literal(p_district);
  END IF;
  IF p_broker IS NOT NULL AND p_broker <> '' THEN
    v_where_full := v_where_full || ' AND broker = ' || quote_literal(p_broker);
    v_where_facet := v_where_facet || ' AND broker = ' || quote_literal(p_broker);
  END IF;
  IF p_jk IS NOT NULL AND p_jk <> '' THEN
    v_where_full := v_where_full || ' AND jk = ' || quote_literal(p_jk);
    v_where_facet := v_where_facet || ' AND jk = ' || quote_literal(p_jk);
  END IF;
  IF p_rooms IS NOT NULL AND p_rooms <> '' THEN
    v_where_full := v_where_full || ' AND rooms LIKE ' || quote_literal(p_rooms || '%');
    v_where_facet := v_where_facet || ' AND rooms LIKE ' || quote_literal(p_rooms || '%');
  END IF;

  -- СЃР»РѕРІР°: РєР°Р¶РґРѕРµ вЂ” РІ Р»СЋР±РѕРј РёР· РїРѕР»РµР№ (AND РјРµР¶РґСѓ СЃР»РѕРІР°РјРё)
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

  -- Р±СЋРґР¶РµС‚: РєР»РёРµРЅС‚ СЃ РґРёР°РїР°Р·РѕРЅРѕРј [amount_min..amount] РїРѕРїР°РґР°РµС‚, РµСЃР»Рё С„РёР»СЊС‚СЂ
  -- РїРµСЂРµСЃРµРєР°РµС‚СЃСЏ СЃ РґРёР°РїР°Р·РѕРЅРѕРј. РћРґРёРЅРѕС‡РЅРѕРµ С‡РёСЃР»Рѕ "17000" в†’ amountMin=amountMax=17000
  -- Рё РєР»РёРµРЅС‚ "15000-20000" РЅР°С…РѕРґРёС‚СЃСЏ (17000 РІРЅСѓС‚СЂРё РµРіРѕ РІРёР»РєРё).
  IF p_amount_min IS NOT NULL THEN
    v_where_full := v_where_full || ' AND amount >= ' || p_amount_min::text;
    v_where_facet := v_where_facet || ' AND amount >= ' || p_amount_min::text;
  END IF;
  IF p_amount_max IS NOT NULL THEN
    v_where_full := v_where_full || ' AND COALESCE(amount_min, amount) <= ' || p_amount_max::text;
    v_where_facet := v_where_facet || ' AND COALESCE(amount_min, amount) <= ' || p_amount_max::text;
  END IF;

  -- РїР»РѕС‰Р°РґСЊ: С‚РµРєСЃС‚РѕРІР°СЏ РєРѕР»РѕРЅРєР° вЂ” С‚РѕР»СЊРєРѕ С‡РёСЃР»РѕРІС‹Рµ Р·РЅР°С‡РµРЅРёСЏ СѓС‡Р°СЃС‚РІСѓСЋС‚ (РєР°Рє Number() РЅР° РєР»РёРµРЅС‚Рµ)
  IF p_area_min IS NOT NULL THEN
    v_where_full := v_where_full ||
      ' AND area ~ ''^[0-9]+(\.[0-9]+)?$'' AND area::numeric >= ' || p_area_min::text;
    v_where_facet := v_where_facet ||
      ' AND area ~ ''^[0-9]+(\.[0-9]+)?$'' AND area::numeric >= ' || p_area_min::text;
  END IF;
  IF p_area_max IS NOT NULL THEN
    v_where_full := v_where_full ||
      ' AND area ~ ''^[0-9]+(\.[0-9]+)?$'' AND area::numeric <= ' || p_area_max::text;
    v_where_facet := v_where_facet ||
      ' AND area ~ ''^[0-9]+(\.[0-9]+)?$'' AND area::numeric <= ' || p_area_max::text;
  END IF;

  -- РґР°С‚С‹: С‚РµРєСЃС‚ DD.MM.YYYY вЂ” РЅРµРІР°Р»РёРґРЅС‹Рµ СЃС‚СЂРѕРєРё РѕС‚РїР°РґР°СЋС‚ (РєР°Рє NaN РЅР° РєР»РёРµРЅС‚Рµ)
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

  -- С‚РѕС‚Р°Р» Рё РїРёР»СЋР»Рё: scope С‚РёРїР° (count(*) СЃС‡РёС‚Р°Р» Р±С‹ Р“Р РЈРџРџР« вЂ” РЅСѓР¶РµРЅ SUM)
  EXECUTE format(
    'SELECT COALESCE(SUM(c), 0), COALESCE(json_object_agg(s, c), ''{}''::json) FROM (SELECT COALESCE(completed, ''Р‘РµР· СЃС‚Р°С‚СѓСЃР°'') AS s, count(*) AS c FROM %I WHERE %s GROUP BY 1) t',
    p_table, v_where_type
  ) INTO v_total, v_by_type;

  -- С‚РѕС‚Р°Р» РїРёР»СЋР»Рё В«Р’СЃРµРіРѕВ»: РІСЃРµ С„РёР»СЊС‚СЂС‹, РєСЂРѕРјРµ СЃС‚Р°С‚СѓСЃР° (СЂРµР°РіРёСЂСѓРµС‚ РЅР° Р±СЂРѕРєРµСЂР°)
  EXECUTE format(
    'SELECT count(*) FROM %I WHERE %s',
    p_table, v_where_facet
  ) INTO v_total_facet;

  -- СЂР°Р·Р±РёРІРєР°: РїРѕР»РЅС‹Р№ scope
  EXECUTE format(
    'SELECT COALESCE(json_object_agg(s, c), ''{}''::json) FROM (SELECT COALESCE(completed, ''Р‘РµР· СЃС‚Р°С‚СѓСЃР°'') AS s, count(*) AS c FROM %I WHERE %s GROUP BY 1) t',
    p_table, v_where_full
  ) INTO v_by_status;

  -- СЂР°Р·Р±РёРІРєР° РґР»СЏ РїРёР»СЋР»СЊ: РІСЃРµ С„РёР»СЊС‚СЂС‹, РєСЂРѕРјРµ СЃС‚Р°С‚СѓСЃР°
  EXECUTE format(
    'SELECT COALESCE(json_object_agg(s, c), ''{}''::json) FROM (SELECT COALESCE(completed, ''Р‘РµР· СЃС‚Р°С‚СѓСЃР°'') AS s, count(*) AS c FROM %I WHERE %s GROUP BY 1) t',
    p_table, v_where_facet
  ) INTO v_by_facet;

  -- СЃС‚СЂР°РЅРёС†Р° СЃС‚СЂРѕРє
  EXECUTE format(
    'SELECT COALESCE(json_agg(t ORDER BY created_at DESC), ''[]''::json) FROM (SELECT * FROM %I WHERE %s ORDER BY created_at DESC LIMIT %s OFFSET %s) t',
    p_table, v_where_full, p_limit, p_offset
  ) INTO v_rows;

  RETURN json_build_object('rows', v_rows, 'total', v_total, 'totalAll', v_total_facet, 'byType', v_by_type, 'byStatus', v_by_status, 'byStatusAll', v_by_facet);
END;
$$;

-- РћРїС†РёРё С„РёР»СЊС‚СЂРѕРІ РЅР° РІСЃСЋ РєР°С‚РµРіРѕСЂРёСЋ (СЂР°Р№РѕРЅС‹, Р–Рљ) РѕРґРЅРёРј РІС‹Р·РѕРІРѕРј.
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

-- Р—Р°РґРµР» РЅР° СЂРѕСЃС‚ С‚Р°Р±Р»РёС†: СЃРµР№С‡Р°СЃ 3.5k СЃС‚СЂРѕРє Рё РІСЃС‘ Р»РµС‚Р°РµС‚ Рё С‚Р°Рє,
-- РёРЅРґРµРєСЃС‹ РїСЂРёРіРѕРґСЏС‚СЃСЏ РєРѕРіРґР° СЃС‚Р°РЅРµС‚ 50k+. РџСЂРѕРіРѕРЅ РЅРµРѕР±СЏР·Р°С‚РµР»РµРЅ РїСЂСЏРјРѕ СЃРµР№С‡Р°СЃ.
CREATE INDEX IF NOT EXISTS idx_clients_arenda_type_created ON clients_arenda (type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_arenda_completed ON clients_arenda (completed);
CREATE INDEX IF NOT EXISTS idx_clients_prodaja_type_created ON clients_prodaja (type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_prodaja_completed ON clients_prodaja (completed);
