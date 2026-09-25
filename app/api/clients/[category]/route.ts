import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { logActivity, buildChanges } from "@/lib/activity";
import { insertWithColumnFallback } from "@/lib/supabase-column-fallback";
import { notifyAll, getActorUserId, maybeCreateResumeTask } from "@/lib/notify";
import { clientListLink } from "@/lib/notify-links";
import { getPhoneVisibility, maskRowsPhones } from "@/lib/phone-visibility";

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

// ---------- Серверный список через RPC (1 хоп вместо 4) ----------
// Чистим слова: запятые/скобки и %_* нельзя отдавать в ilike-паттерны.
function cleanWord(s: string): string {
  return s.replace(/[,()"%*_.\\]/g, "").trim();
}
function splitWords(s: string | null): string[] {
  if (!s) return [];
  // Как smartMatch на клиенте: слова — последовательности букв/цифр
  return s.split(/[^\p{L}\p{N}]+/gu).map(cleanWord).filter(w => w.length > 0);
}

const LIST_DEFAULT_LIMIT = 200;
const LIST_MAX_LIMIT = 500;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await params;
    const table = TABLE_MAP[category];
    if (!table) return NextResponse.json({ error: "Неизвестная категория" }, { status: 400 });
    const sp = request.nextUrl.searchParams;

    // --- Режим distincts: опции фильтров (район/ЖК) на всю категорию ---
    if (sp.get("distincts") === "1") {
      const { data, error } = await serviceClient.rpc("get_clients_distincts", { p_table: table });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ districts: data?.districts || [], jk: data?.jk || [] });
    }

    const numOrNull = (v: string | null): number | null =>
      v && v.trim() !== "" && !isNaN(Number(v)) ? Number(v) : null;
    const wordsOrNull = (v: string | null): string[] | null => {
      const w = splitWords(v);
      return w.length > 0 ? w : null;
    };
    const limit = Math.min(LIST_MAX_LIMIT, Math.max(1, parseInt(sp.get("limit") || String(LIST_DEFAULT_LIMIT), 10) || LIST_DEFAULT_LIMIT));
    const offset = Math.max(0, parseInt(sp.get("offset") || "0", 10) || 0);

    // Строки + тотал + разбивки — один вызов Postgres вместо сканов и подсчётов.
    // Проверка прав не нужна сверх авторизации: телефоны маскируем ниже как раньше.
    // rpc и visibility независимы — параллельно (на холодную экономит хоп).
    const [rpcRes, vis] = await Promise.all([
      serviceClient.rpc("get_clients_page", {
      p_table: table,
      p_limit: limit,
      p_offset: offset,
      p_types: sp.get("types") || null,
      p_completed: sp.get("completed") || null,
      p_active_only: sp.get("activeOnly") !== "0",
      p_words: wordsOrNull(sp.get("search")),
      p_name_words: wordsOrNull(sp.get("name")),
      p_district: sp.get("district") || null,
      p_broker: sp.get("broker") || null,
      p_jk: sp.get("jk") || null,
      p_rooms: sp.get("rooms")?.trim() || null,
      p_address_words: wordsOrNull(sp.get("address")),
      p_amount_min: numOrNull(sp.get("amountMin")),
      p_amount_max: numOrNull(sp.get("amountMax")),
      p_area_min: numOrNull(sp.get("areaMin")),
      p_area_max: numOrNull(sp.get("areaMax")),
      p_date_from: sp.get("dateFrom")?.trim() || null,
      p_date_to: sp.get("dateTo")?.trim() || null,
      }),
      getPhoneVisibility(),
    ]);
    const { data, error } = rpcRes;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Телефоны видит только тот, кто добавил клиента; админу видны все.
    return NextResponse.json({
      rows: maskRowsPhones((data?.rows || []) as Array<{ broker?: string; phone?: string }>, vis),
      total: data?.total || 0,
      byType: data?.byType || {},
      byStatus: data?.byStatus || {},
    });
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
      related_to: clientListLink(category, data.type || body.type, data.id),
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
      related_to: clientListLink(category, undefined),
      actorUserId: await getActorUserId(supabase),
    });
    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
  }
}
