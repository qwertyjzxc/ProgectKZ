const COLUMN_MISSING_RE = /Could not find the '([^']+)' column/;

function stripMissingColumn(row: Record<string, unknown>, message: string): boolean {
  const m = message.match(COLUMN_MISSING_RE);
  if (!m) return false;
  delete row[m[1]];
  return true;
}

export async function insertWithColumnFallback<T = any, E = any>(
  supabase: { from: (table: string) => any },
  table: string,
  row: Record<string, unknown>
): Promise<{ data: T | null; error: E | null }> {
  let res = await supabase.from(table).insert(row).select().single();
  while (res.error && stripMissingColumn(row, res.error?.message || "")) {
    res = await supabase.from(table).insert(row).select().single();
  }
  return res;
}

export async function updateWithColumnFallback<T = any, E = any>(
  supabase: { from: (table: string) => any },
  table: string,
  row: Record<string, unknown>,
  id: string | number
): Promise<{ data: T | null; error: E | null }> {
  let res = await supabase.from(table).update(row).eq("id", id).select().single();
  while (res.error && stripMissingColumn(row, res.error?.message || "")) {
    res = await supabase.from(table).update(row).eq("id", id).select().single();
  }
  return res;
}