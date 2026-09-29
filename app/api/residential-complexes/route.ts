import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, requireAdmin } from "@/lib/route-auth";

export async function GET() {
  const gate = await requireUser();
  if (gate.denied) return gate.denied;
  const supabase = await createClient();
  const { data, error } = await supabase.from("residential_complexes").select("*").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  // Справочник в UI — только у админа; раньше писать/удалять мог кто угодно.
  const gate = await requireAdmin();
  if (gate.denied) return gate.denied;
  const supabase = await createClient();
  const { name } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
  const { data, error } = await supabase.from("residential_complexes").insert({ name: name.trim() }).select().single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Такой ЖК уже существует" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  const gate = await requireAdmin();
  if (gate.denied) return gate.denied;
  const supabase = await createClient();
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "ID обязателен" }, { status: 400 });
  const { error } = await supabase.from("residential_complexes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
