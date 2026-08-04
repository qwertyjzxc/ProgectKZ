import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TABLE_MAP: Record<string, string> = {
  arenda: "clients_arenda",
  pokupka: "clients_pokupka",
  prodaja: "clients_prodaja",
};

async function getTable(category: string) {
  const table = TABLE_MAP[category];
  if (!table) throw new Error("Неизвестная категория");
  const supabase = await createClient();
  return { supabase, table };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await params;
    const { supabase, table } = await getTable(category);
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await params;
    const { supabase, table } = await getTable(category);
    const body = await request.json();
    const { data, error } = await supabase
      .from(table)
      .insert({
        date: body.date || new Date().toLocaleDateString("ru-RU"),
        name: body.name || "",
        rooms: body.rooms || "",
        district: body.district || "",
        amount: body.amount || 0,
        furniture: body.furniture || "",
        rental_period: body.rental_period || "",
        phone: body.phone || "",
        who_lives: body.who_lives || "",
        people_count: body.people_count || 1,
        notes: body.notes || "",
        completed: body.completed || "",
        broker: body.broker || "",
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}