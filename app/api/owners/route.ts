import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { insertWithColumnFallback } from "@/lib/supabase-column-fallback";
import { notifyAll, getActorUserId } from "@/lib/notify";
import { ownerListLink } from "@/lib/notify-links";

const TABLE_MAP: Record<string, string> = {
  kvartiry: "owners_kvartiry",
  pomescheniya: "owners_pomescheniya",
  zemlya: "owners_zemlya",
  doma: "owners_doma",
};

const COLUMNS: Record<string, string[]> = {
  kvartiry: ["name","phone","district","address","jk","rooms","area","price","contract_type","contract_kind","status","condition","notes","broker","documents","date"],
  pomescheniya: ["name","phone","district","address","area","premise_type","finishing","location_line","price","contract_type","contract_kind","status","condition","notes","broker","documents","date"],
  zemlya: ["name","phone","district","address","area","area_unit","price","contract_type","contract_kind","status","condition","notes","broker","documents","date"],
  doma: ["name","phone","district","address","rooms","house_area","land_area","price","contract_type","contract_kind","status","condition","notes","broker","documents","date"],
};

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category") || "";
  const table = TABLE_MAP[category];
  if (!table) return NextResponse.json({ error: "Неизвестная категория" }, { status: 400 });

  const supabase = await createClient();
  // Защита от выгрузки всей таблицы целиком при росте данных
  const limit = Math.min(1000, Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") || "1000", 10) || 1000));
  const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category") || "";
  const table = TABLE_MAP[category];
  if (!table) return NextResponse.json({ error: "Неизвестная категория" }, { status: 400 });

  const supabase = await createClient();
  const body = await request.json();
  const allowed = COLUMNS[category];
  const row: Record<string, unknown> = {};
  for (const col of allowed) {
    if (body[col] !== undefined && body[col] !== null) row[col] = body[col];
  }
  if (!row.name) return NextResponse.json({ error: "Имя обязательно" }, { status: 400 });

  const { data, error } = await insertWithColumnFallback(supabase as unknown as { from: (table: string) => unknown }, table, row);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await notifyAll({
    key: "objects_create",
    message: "Новый собственник: «" + (data.name || "") + "»",
    related_to: ownerListLink(category, data.id),
    related_id: data.id,
    actorUserId: await getActorUserId(supabase),
  });
  return NextResponse.json(data, { status: 201 });
}