import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profile_id");

  let query = supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20);
  if (profileId) query = query.eq("profile_id", profileId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { data, error } = await supabase.from("notifications").insert({
    profile_id: body.profile_id,
    message: body.message || "",
    type: body.type || "info",
    related_to: body.related_to || "",
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { id, mark_all, profile_id } = body;

  if (mark_all && profile_id) {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("profile_id", profile_id).eq("is_read", false);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (id) {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "id or mark_all required" }, { status: 400 });
}
