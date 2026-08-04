import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TABLE_MAP: Record<string, string> = {
  arenda: "clients_arenda",
  pokupka: "clients_pokupka",
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
    const { data, error } = await supabase
      .from(table)
      .update({
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
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
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
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}