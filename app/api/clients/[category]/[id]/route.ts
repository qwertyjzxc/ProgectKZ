import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity, buildChanges, buildUpdateMessage } from "@/lib/activity";
import { updateWithColumnFallback } from "@/lib/supabase-column-fallback";
import { notifyAll, getActorUserId, maybeCreateResumeTask } from "@/lib/notify";
import { clientListLink } from "@/lib/notify-links";
import { getPhoneVisibility, canSeePhone } from "@/lib/phone-visibility";

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

    // Телефоны видит только тот, кто добавил клиента; админу видны все.
    // Чужой номер не показываем в ответе и не даём перезаписывать.
    const vis = await getPhoneVisibility();
    const canEditPhone = vis.isAdmin || canSeePhone(existing?.broker as string | undefined, vis);

    const updateRow: Record<string, unknown> = {
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
      phone: canEditPhone ? body.phone : existing?.phone,
      who_lives: body.who_lives,
      people_count: body.people_count,
      notes: body.notes,
      completed: body.completed,
      broker: body.broker,
      documents: body.documents,
      preferences: body.preferences,
      client_category: body.client_category,
      tags: body.tags,
      premise_type: body.premise_type,
      finishing: body.finishing,
      contract_type: body.contract_type,
      contract_kind: body.contract_kind,
      reason: body.reason,
      status_comment: body.status_comment,
      resume_date: body.resume_date,
    };
    if (body.type === "Земля" || body.type === "Дома") {
      updateRow.area_unit = body.area_unit;
      updateRow.plot_type = body.plot_type;
      updateRow.purpose = body.purpose;
      updateRow.communications = body.communications;
      updateRow.access = body.access;
      updateRow.plot_shape = body.plot_shape;
      updateRow.relief = body.relief;
      updateRow.restrictions = body.restrictions;
    }
    const { data, error } = await updateWithColumnFallback(supabase as unknown as { from: (table: string) => unknown }, table, updateRow, id);
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
      await notifyAll({
        key: "clients_update",
        message: "Изменён клиент: «" + (data.name || existing?.name || "") + "»",
        related_to: clientListLink(category, data.type || existing?.type, data.id),
        related_id: data.id,
        actorUserId: await getActorUserId(supabase),
      });
      // ТЗ §5: «Приостановлен» с датой → автозадача на повторный контакт
      await maybeCreateResumeTask(supabase, data);
    }
    // Чужой клиент: телефон в ответе скрываем, чтобы он не утёк в клиентский стейт
    if (!canEditPhone) {
      return NextResponse.json({ ...data, phone: "", phone_masked: true });
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
      await notifyAll({
        key: "clients_delete",
        message: "Удалён клиент: «" + (existing.name || "") + "»",
        related_to: clientListLink(category, existing.type),
        actorUserId: await getActorUserId(supabase),
      });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
  }
}