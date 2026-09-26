import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateWithColumnFallback } from "@/lib/supabase-column-fallback";
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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const category = request.nextUrl.searchParams.get("category") || "";
  const table = TABLE_MAP[category];
  if (!table) return NextResponse.json({ error: "Неизвестная категория" }, { status: 400 });

  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();
  const allowed = COLUMNS[category];
  const row: Record<string, unknown> = {};
  for (const col of allowed) {
    if (body[col] !== undefined) row[col] = body[col];
  }

  const { data, error } = await updateWithColumnFallback(supabase as unknown as { from: (table: string) => unknown }, table, row, parseInt(id, 10));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const updated = data;
  const link = ownerListLink(category, data.id);
  after(async () => {
    const actorUserId = await getActorUserId(supabase);
    await notifyAll({
      key: "objects_update",
      message: "Изменён собственник: «" + (updated.name || "") + "»",
      related_to: link,
      related_id: updated.id,
      actorUserId,
    });
  });
  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const category = _request.nextUrl.searchParams.get("category") || "";
  const table = TABLE_MAP[category];
  if (!table) return NextResponse.json({ error: "Неизвестная категория" }, { status: 400 });

  const { id } = await params;
  const supabase = await createClient();
  const [nameRes, delRes, actorUserId] = await Promise.all([
    supabase.from(table).select("name").eq("id", parseInt(id, 10)).maybeSingle(),
    supabase.from(table).delete().eq("id", parseInt(id, 10)),
    getActorUserId(supabase),
  ]);
  if (delRes.error) return NextResponse.json({ error: delRes.error.message }, { status: 500 });
  const existingName = (nameRes.data as { name?: string } | null)?.name || "";
  const listLink = ownerListLink(category);
  after(async () => {
    await notifyAll({
      key: "objects_delete",
      message: "Удалён собственник: «" + existingName + "»",
      related_to: listLink,
      actorUserId,
    });
  });
  return NextResponse.json({ success: true });
}