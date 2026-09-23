import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEAL_TABLES = [
  { table: "deals_kvartiry", label: "Квартиры" },
  { table: "deals_pomescheniya", label: "Помещения" },
  { table: "deals_zemlya", label: "Земля" },
] as const;

export function digitsOnly(s: string): string {
  return (s || "").replace(/\D/g, "");
}

// Сделки клиента: совпадение по телефону (последние 10 цифр) или по имени.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const phone = digitsOnly(request.nextUrl.searchParams.get("phone") || "").slice(-10);
  const name = (request.nextUrl.searchParams.get("name") || "").trim().replace(/[%_,]/g, "");
  if (!phone && name.length < 2) return NextResponse.json([]);

  const out: Array<Record<string, unknown>> = [];
  for (const t of DEAL_TABLES) {
    try {
      let query = supabase.from(t.table).select("id,name,client,amount,completed,date,category").order("created_at", { ascending: false }).limit(10);
      if (phone) {
        query = query.or(`phone.ilike.%${phone}%,client.ilike.%${name}%,name.ilike.%${name}%`);
      } else {
        query = query.or(`client.ilike.%${name}%,name.ilike.%${name}%`);
      }
      const { data, error } = await query;
      if (error || !data) continue;
      for (const d of data as Record<string, unknown>[]) out.push({ ...d, dealType: t.table, typeLabel: t.label });
    } catch {
      continue;
    }
  }
  return NextResponse.json(out.slice(0, 15));
}
