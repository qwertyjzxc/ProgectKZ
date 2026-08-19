import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity, buildChanges, buildUpdateMessage, DEAL_LABELS } from "@/lib/activity";

const TABLE_MAP: Record<string, string> = {
  kvartiry: "deals_kvartiry",
  pomescheniya: "deals_pomescheniya",
  zemlya: "deals_zemlya",
};

function getTable(type: string | null): string {
  return TABLE_MAP[type || "kvartiry"] || "deals_kvartiry";
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();
  const table = getTable(body.type);

  const { data: existing } = await supabase.from(table).select("*").eq("id", id).maybeSingle();

  const { data, error } = await supabase.from(table).update({
    name: body.name,
    client: body.client,
    amount: body.amount,
    stage: body.stage,
    date: body.date,
    category: body.category,
    type: body.type,
    area: body.area,
    address: body.address,
    jk: body.jk,
    contract: body.contract,
    phone: body.phone,
    district: body.district,
    rooms: body.rooms,
    furniture: body.furniture,
    rental_period: body.rental_period,
    who_lives: body.who_lives,
    people_count: body.people_count,
    notes: body.notes,
    completed: body.completed,
    broker: body.broker,
    layout: body.layout,
    renter_type: body.renter_type,
    payment: body.payment,
    finishing: body.finishing,
    premise_type: body.premise_type,
    plot_type: body.plot_type,
    purpose: body.purpose,
    communications: body.communications,
    area_unit: body.area_unit,
    access: body.access,
    plot_shape: body.plot_shape,
    relief: body.relief,
    documents: body.documents,
    restrictions: body.restrictions,
  }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const changes = buildChanges(existing || {}, data || {}, DEAL_LABELS);
  if (changes.length > 0) {
    await logActivity({
      client_table: "deals",
      client_id: data.id,
      client_name: data.name || existing?.name || "",
      action: "update",
      message: buildUpdateMessage(changes),
      changes,
    });
  }
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;
  const type = request.nextUrl.searchParams.get("type");
  const table = getTable(type);
  const { data: existing } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (existing) {
    await logActivity({
      client_table: "deals",
      client_id: existing.id,
      client_name: existing.name || "",
      action: "delete",
      message: "Удалил сделку",
      changes: buildChanges(existing, {}, DEAL_LABELS),
    });
  }
  return NextResponse.json({ success: true });
}
