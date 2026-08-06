import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity, buildChanges, buildUpdateMessage } from "@/lib/activity";

const TABLE_MAP: Record<string, string> = {
  arenda: "clients_arenda",
  prodaja: "clients_prodaja",
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ category: string; id: string }> }
) {
  try {
    const { category, id } = await params;
    const table = TABLE_MAP[category];
    if (!table) return NextResponse.json({ error: "Неизвестная категория" }, { status: 400 });

    const supabase = await createClient();
    const body = await request.json();
    const { data: existing } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
    const { data, error } = await supabase
      .from(table)
      .update({
        type: body.type,
        area: body.area,
        address: body.address,
        jk: body.jk,
        contract: body.contract,
        date: body.date,
        name: body.name,
        rooms: body.rooms,
        district: body.district,
        amount: body.amount,
        furniture: body.furniture,
        rental_period: body.rental_period,
        phone: body.phone,
        who_lives: body.who_lives,
        people_count: body.people_count,
        notes: body.notes,
        completed: body.completed,
        broker: body.broker,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const changes = buildChanges(existing || {}, data);
    if (changes.length > 0) {
      await logActivity({
        client_table: table,
        client_id: data.id,
        client_name: data.name || existing?.name || "",
        action: "update",
        message: buildUpdateMessage(changes),
        changes,
      });
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ category: string; id: string }> }
) {
  try {
    const { category, id } = await params;
    const table = TABLE_MAP[category];
    if (!table) return NextResponse.json({ error: "Неизвестная категория" }, { status: 400 });

    const supabase = await createClient();
    const { data: existing } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (existing) {
      await logActivity({
        client_table: table,
        client_id: Number(id),
        client_name: existing.name || "",
        action: "delete",
        message: "Удалил клиента",
        changes: buildChanges(existing, {}),
      });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
  }
}