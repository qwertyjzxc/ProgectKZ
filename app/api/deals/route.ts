import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity, buildChanges, DEAL_LABELS } from "@/lib/activity";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("deals").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { data, error } = await supabase.from("deals").insert({
    name: body.name,
    client: body.client,
    amount: body.amount,
    stage: body.stage || "Первичный контакт",
    date: body.date || new Date().toLocaleDateString("ru-RU"),
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logActivity({
    client_table: "deals",
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
  const ids = Array.isArray(body.ids) ? (body.ids as unknown[]).map(Number).filter((n: number) => Number.isFinite(n) && n > 0) : [];
  if (ids.length === 0) return NextResponse.json({ error: "Нет выбранных сделок" }, { status: 400 });
  const { data: existing } = await supabase.from("deals").select("id, name").in("id", ids);
  const { error } = await supabase.from("deals").delete().in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (ids.length === 1 && existing?.[0]) {
    await logActivity({
      client_table: "deals",
      client_id: existing[0].id,
      client_name: existing[0].name || "",
      action: "delete",
      message: "Удалил сделку",
    });
  } else {
    await logActivity({
      client_table: "deals",
      client_id: 0,
      client_name: "",
      action: "delete",
      message: `Удалил ${ids.length} сделок`,
    });
  }
  return NextResponse.json({ success: true, deleted: ids.length });
}
