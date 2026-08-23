import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;
    const clientTable = searchParams.get("client_table");
    const clientId = searchParams.get("client_id");

    let query = supabase.from("client_activity").select("*");

    if (clientTable && clientId) {
      const numericId = Number(clientId);
      if (clientTable.startsWith("deals_")) {
        query = query.or(`client_table.eq.${clientTable},client_table.eq.deals`).eq("client_id", numericId);
      } else {
        query = query.eq("client_table", clientTable).eq("client_id", numericId);
      }
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
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
