import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity, buildChanges } from "@/lib/activity";
import { insertWithColumnFallback } from "@/lib/supabase-column-fallback";
import { notifyAll, getActorUserId, maybeCreateResumeTask } from "@/lib/notify";

const TABLE_MAP: Record<string, string> = {
  arenda: "clients_arenda",
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
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
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
    const insertRow: Record<string, unknown> = {
      type: body.type || "",
      area: body.area || "",
      address: body.address || "",
      jk: body.jk || "",
      contract: body.contract || "",
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
      documents: body.documents || "[]",
      preferences: body.preferences || "",
      client_category: body.client_category || "",
      tags: body.tags || "[]",
      premise_type: body.premise_type || "",
      finishing: body.finishing || "",
      contract_type: body.contract_type || "",
      contract_kind: body.contract_kind || "",
      reason: body.reason || "",
      status_comment: body.status_comment || "",
      resume_date: body.resume_date || "",
    };
    if (body.type === "Земля") {
      insertRow.area_unit = body.area_unit || "сот";
      insertRow.plot_type = body.plot_type || "";
      insertRow.purpose = body.purpose || "";
      insertRow.communications = body.communications || "";
      insertRow.access = body.access || "";
      insertRow.plot_shape = body.plot_shape || "";
      insertRow.relief = body.relief || "";
      insertRow.restrictions = body.restrictions || "";
    }
    const { data, error } = await insertWithColumnFallback(supabase as unknown as { from: (table: string) => unknown }, table, insertRow);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Проверка на дубли по телефону (в обеих клиентских таблицах)
    let duplicateWarning: Array<{ id: number; name: string; where: string }> = [];
    try {
      const digits = String(body.phone || "").replace(/\D/g, "").slice(-10);
      if (digits.length >= 7) {
        const found: Array<{ id: number; name: string; where: string }> = [];
        const tables: Array<{ t: string; label: string }> = [
          { t: "clients_arenda", label: "Аренда" },
          { t: "clients_prodaja", label: "Покупка" },
        ];
        for (const ct of tables) {
          const { data: dups } = await supabase.from(ct.t).select("id,name").ilike("phone", "%" + digits + "%").neq("id", data.id).limit(3);
          for (const d of dups || []) {
            found.push({ id: d.id as number, name: (d.name || "") as string, where: ct.label });
          }
        }
        duplicateWarning = found;
      }
    } catch {
      // проверка дублей не должна мешать созданию
    }
    await logActivity({
      client_table: table,
      client_id: data.id,
      client_name: data.name || "",
      action: "create",
      message: "Добавил клиента",
      changes: buildChanges({}, data),
    });
    await notifyAll({
      key: "clients_create",
      message: "Новый клиент: «" + (data.name || "") + "»",
      related_to: "/clients",
      related_id: data.id,
      actorUserId: await getActorUserId(supabase),
    });
    await maybeCreateResumeTask(supabase, data);
    return NextResponse.json({ ...data, duplicateWarning }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await params;
    const { supabase, table } = await getTable(category);
    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? (body.ids as unknown[]).map(Number).filter((n: number) => Number.isFinite(n) && n > 0) : [];
    if (ids.length === 0) return NextResponse.json({ error: "Нет выбранных клиентов" }, { status: 400 });

    const { data: existing } = await supabase.from(table).select("id, name").in("id", ids);
    const names = (existing ?? []).map((r: { name?: string }) => r.name || "").filter(Boolean);

    const { error } = await supabase.from(table).delete().in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const nameList = names.length > 0 ? `: ${names.join(", ")}` : "";
    await logActivity({
      client_table: table,
      client_id: ids[0],
      client_name: names.join(", "),
      action: "delete",
      message: `Удалил ${ids.length} ${ids.length === 1 ? "клиента" : "клиентов"}${nameList}`,
    });
    await notifyAll({
      key: "clients_delete",
      message: ids.length === 1 && names[0]
        ? "Удалён клиент: «" + names[0] + "»"
        : `Удалено клиентов: ${ids.length}`,
      related_to: "/clients",
      actorUserId: await getActorUserId(supabase),
    });
    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
  }
}