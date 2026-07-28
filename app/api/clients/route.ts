import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("clients")
    .insert({
      date: body.date,
      name: body.name,
      rooms: body.rooms,
      district: body.district,
      amount: body.amount,
      furniture: body.furniture,
      rental_period: body.rentalPeriod,
      phone: body.phone,
      who_lives: body.whoLives,
      people_count: body.peopleCount,
      notes: body.notes,
      completed: body.completed,
      broker: body.broker,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
