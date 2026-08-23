import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity, buildChanges, DEAL_LABELS } from "@/lib/activity";

const TABLE_MAP: Record<string, string> = {
  kvartiry: "deals_kvartiry",
  pomescheniya: "deals_pomescheniya",
  zemlya: "deals_zemlya",
};

function getTable(type: string | null): string {
  return TABLE_MAP[type || "kvartiry"] || "deals_kvartiry";
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const type = request.nextUrl.searchParams.get("type");
  const category = request.nextUrl.searchParams.get("category");
  const table = getTable(type);
  let query = supabase.from(table).select("*");
  if (category) query = query.eq("category", category);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const table = getTable(body.dealType || body.type);
  const { data, error } = await supabase.from(table).insert({
    name: body.name,
    client: body.client || body.name,
    amount: body.amount,
    stage: body.stage || "Первичный контакт",
    date: body.date || new Date().toLocaleDateString("ru-RU"),
    category: body.category || "arenda",
    type: body.type || "",
    area: body.area || "",
    address: body.address || "",
    jk: body.jk || "",
    contract: body.contract || "",
    phone: body.phone || "",
    district: body.district || "",
    rooms: body.rooms || "",
    furniture: body.furniture || "",
    rental_period: body.rental_period || "",
    who_lives: body.who_lives || "",
    people_count: body.people_count || 1,
    notes: body.notes || "",
    completed: body.completed || "В процессе",
    broker: body.broker || "",
    layout: body.layout || "",
    renter_type: body.renter_type || "",
    payment: body.payment || "",
    finishing: body.finishing || "",
    premise_type: body.premise_type || "",
    plot_type: body.plot_type || "",
    purpose: body.purpose || "",
    communications: body.communications || "",
    area_unit: body.area_unit || "сот",
    access: body.access || "",
    plot_shape: body.plot_shape || "",
    relief: body.relief || "",
    documents: body.documents || "",
    restrictions: body.restrictions || "",
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logActivity({
    client_table: table,
    client_id: data.id,
    client_name: data.name || "",
    action: "create",
    message: "Добавил сделку",
    changes: buildChanges({}, data, DEAL_LABELS),
  });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json().catch(() => ({}));
  const table = getTable(body.type);
  const ids = Array.isArray(body.ids) ? (body.ids as unknown[]).map(Number).filter((n: number) => Number.isFinite(n) && n > 0) : [];
  if (ids.length === 0) return NextResponse.json({ error: "Нет выбранных сделок" }, { status: 400 });
  const { data: existing } = await supabase.from(table).select("id, name").in("id", ids);
  const { error } = await supabase.from(table).delete().in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (ids.length === 1 && existing?.[0]) {
    await logActivity({
      client_table: table,
      client_id: existing[0].id,
      client_name: existing[0].name || "",
      action: "delete",
      message: "Удалил сделку",
    });
  } else {
    await logActivity({
      client_table: table,
      client_id: 0,
      client_name: "",
      action: "delete",
      message: `Удалил ${ids.length} сделок`,
    });
  }
  return NextResponse.json({ success: true, deleted: ids.length });
}
