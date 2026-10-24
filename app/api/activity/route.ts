import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { logActivity } from "@/lib/activity";
import { getPhoneVisibility, canSeePhone } from "@/lib/phone-visibility";
import { requireUser, requireAdmin } from "@/lib/route-auth";

const CLIENT_TABLES = ["clients_arenda", "clients_prodaja"];

// Быстрые события в журнал клиента из карточки: «Отправлены объекты …»,
// «Назначен просмотр …» (ТЗ §10). Текст пишет брокер, шаблон подставляет UI.
export async function POST(request: NextRequest) {
  const { denied } = await requireUser();
  if (denied) return denied;
  try {
    const body = await request.json();
    const clientTable = String(body.client_table || "");
    const clientId = Number(body.client_id);
    const message = String(body.message || "").trim();
    if (!CLIENT_TABLES.includes(clientTable) || !Number.isFinite(clientId) || clientId <= 0) {
      return NextResponse.json({ error: "Не указан клиент" }, { status: 400 });
    }
    if (!message) return NextResponse.json({ error: "Пустой текст события" }, { status: 400 });
    await logActivity({
      client_table: clientTable,
      client_id: clientId,
      client_name: String(body.client_name || ""),
      action: "event",
      message,
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;
    const clientTable = searchParams.get("client_table");
    const clientId = searchParams.get("client_id");

    // Общая лента — только для админа. Лента конкретной карточки
    // (client_table + client_id) доступна сотрудникам как раньше.
    if (!(clientTable && clientId)) {
      const { denied } = await requireAdmin();
      if (denied) return denied;
    }

    let query = supabase.from("client_activity").select("*");

    if (clientTable && clientId) {
      // Значение передаём строкой: PostgREST приведёт его к типу колонки —
      // bigint (клиенты/сделки/собственники) и text (UUID объектов) оба работают
      query = query.eq("client_table", clientTable).eq("client_id", clientId);
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const rows = (data || []) as Array<Record<string, unknown> & { client_table: string; client_id: number | string; changes: Array<{ field: string; label: string; oldValue: string; newValue: string }> | null }>;

    // Чужим сотрудникам телефон в журнале не показываем, админ видит всё
    const vis = await getPhoneVisibility();
    if (!vis.isAdmin && rows.length > 0) {
      const idsByTable = new Map<string, Set<number>>();
      for (const row of rows) {
        if (!CLIENT_TABLES.includes(row.client_table)) continue;
        if (!idsByTable.has(row.client_table)) idsByTable.set(row.client_table, new Set());
        idsByTable.get(row.client_table)!.add(Number(row.client_id));
      }
      const brokerMap = new Map<string, Map<number, string>>();
      for (const [table, ids] of idsByTable) {
        const map = new Map<number, string>();
        if (ids.size > 0) {
          const { data: clients } = await serviceClient.from(table).select("id, broker").in("id", [...ids]);
          for (const c of clients || []) map.set(Number(c.id), (c.broker || "") as string);
        }
        brokerMap.set(table, map);
      }
      for (const row of rows) {
        if (!CLIENT_TABLES.includes(row.client_table)) continue;
        const broker = brokerMap.get(row.client_table)?.get(Number(row.client_id)) || "";
        if (canSeePhone(broker, vis)) continue;
        if (Array.isArray(row.changes)) {
          row.changes = row.changes.filter(ch => ch.field !== "phone");
        }
      }
    }
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const { data: profs } = await serviceClient.from("profiles").select("role").eq("user_id", user.id);
    const isAdmin = (profs || []).some(p => p.role === "admin");
    if (!isAdmin) return NextResponse.json({ error: "Доступ только для администратора" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? (body.ids as unknown[]).map(Number).filter((n: number) => Number.isFinite(n) && n > 0) : [];
    if (ids.length === 0) return NextResponse.json({ error: "Нет выбранных записей" }, { status: 400 });

    const { error } = await serviceClient.from("client_activity").delete().in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
  }
}
