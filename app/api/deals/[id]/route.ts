import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity, buildChanges, buildUpdateMessage, DEAL_LABELS } from "@/lib/activity";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();

  const { data: existing } = await supabase.from("deals").select("*").eq("id", id).maybeSingle();

  const { data, error } = await supabase.from("deals").update({
    name: body.name,
    client: body.client,
    amount: body.amount,
    stage: body.stage,
    date: body.date,
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
  const { data: existing } = await supabase.from("deals").select("*").eq("id", id).maybeSingle();
  const { error } = await supabase.from("deals").delete().eq("id", id);
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
