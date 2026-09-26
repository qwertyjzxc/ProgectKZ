import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateWithColumnFallback } from "@/lib/supabase-column-fallback";
import { logActivity, buildChanges, buildUpdateMessage, DEAL_LABELS } from "@/lib/activity";
import { notifyAll, getActorUserId } from "@/lib/notify";
import { dealListLink } from "@/lib/notify-links";
import { isAdminUser } from "@/lib/admin";

const TABLE_MAP: Record<string, string> = {
  kvartiry: "deals_kvartiry",
  pomescheniya: "deals_pomescheniya",
  zemlya: "deals_zemlya",
};

function getTable(type: string | null): string {
  return TABLE_MAP[type || "kvartiry"] || "deals_kvartiry";
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  return null;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();
  const table = getTable(body.type);

  const { data: existing } = await supabase.from(table).select("*").eq("id", id).maybeSingle();

  const updateRow: Record<string, unknown> = {
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
    commission: body.commission,
    owner_name: body.owner_name,
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
    completion_date: body.completion_date,
  };
  const { data, error } = await updateWithColumnFallback(
    supabase as unknown as { from: (table: string) => unknown },
    table,
    updateRow,
    id
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const changes = buildChanges(existing || {}, data || {}, DEAL_LABELS);
  if (changes.length > 0) {
    const snapshot = { data, existing, changes, table, body };
    after(async () => {
      const actorUserId = await getActorUserId(supabase);
      await Promise.all([
        logActivity({
          client_table: snapshot.table,
          client_id: snapshot.data.id,
          client_name: snapshot.data.name || snapshot.existing?.name || "",
          action: "update",
          message: buildUpdateMessage(snapshot.changes),
          changes: snapshot.changes,
        }),
        notifyAll({
          key: "deals_update",
          message: "Изменена сделка: «" + (snapshot.data.name || snapshot.existing?.name || "") + "»",
          related_to: dealListLink(snapshot.body.type, snapshot.data.category || snapshot.existing?.category, snapshot.data.id),
          related_id: snapshot.data.id,
          actorUserId,
        }),
      ]);
    });
  }
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const supabase = await createClient();
  const { id } = await params;
  const type = request.nextUrl.searchParams.get("type");
  const table = getTable(type);
  const { data: existing } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
  const [delRes, actorUserId] = await Promise.all([
    supabase.from(table).delete().eq("id", id),
    getActorUserId(supabase),
  ]);
  if (delRes.error) return NextResponse.json({ error: delRes.error.message }, { status: 500 });
  if (existing) {
    const row = existing;
    after(async () => {
      await Promise.all([
        logActivity({
          client_table: table,
          client_id: row.id,
          client_name: row.name || "",
          action: "delete",
          message: "Удалил сделку",
          changes: buildChanges(row, {}, DEAL_LABELS),
        }),
        notifyAll({
          key: "deals_delete",
          message: "Удалена сделка: «" + (row.name || "") + "»",
          related_to: dealListLink(type, row.category),
          actorUserId,
        }),
      ]);
    });
  }
  return NextResponse.json({ success: true });
}
