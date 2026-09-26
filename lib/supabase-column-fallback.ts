const COLUMN_MISSING_RE = /Could not find the '([^']+)' column/;

function stripMissingColumn(table: string, row: Record<string, unknown>, message: string): boolean {
  const m = message.match(COLUMN_MISSING_RE);
  if (!m) return false;
  // Дрейф схемы больше не молчаливый: видно в серверных логах, какую колонку
  // сбросили и в какой таблице — значит, соответствующая миграция не применена.
  console.warn(`[schema-drift] таблица "${table}": колонка "${m[1]}" отсутствует в БД, значение сброшено. Примените миграцию.`);
  delete row[m[1]];
  return true;
}

function firstRow<T = any>(data: unknown): T | null {
  if (Array.isArray(data) && data.length > 0) return data[0] as T;
  return null;
}

export async function insertWithColumnFallback<T = any, E = any>(
  supabase: { from: (table: string) => any },
  table: string,
  row: Record<string, unknown>
): Promise<{ data: T | null; error: E | null }> {
  let res = await supabase.from(table).insert(row).select("*");
  while (res.error && stripMissingColumn(table, row, res.error?.message || "")) {
    res = await supabase.from(table).insert(row).select("*");
  }
  if (res.error) return { data: null, error: res.error };
  return { data: firstRow<T>(res.data), error: null };
}

export async function updateWithColumnFallback<T = any, E = any>(
  supabase: { from: (table: string) => any },
  table: string,
  row: Record<string, unknown>,
  id: string | number
): Promise<{ data: T | null; error: E | null }> {
  let res = await supabase.from(table).update(row).eq("id", id).select("*");
  while (res.error && stripMissingColumn(table, row, res.error?.message || "")) {
    res = await supabase.from(table).update(row).eq("id", id).select("*");
  }
  if (res.error) return { data: null, error: res.error };
  return { data: firstRow<T>(res.data), error: null };
}