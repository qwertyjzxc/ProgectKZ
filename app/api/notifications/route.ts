import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { requireUser, forbidden } from "@/lib/route-auth";
import { isAdminUser } from "@/lib/admin";

// Уведомления чужих профилей не читаем и не трогаем: раньше роут не проверял
// ничего, а RLS-политика authenticated USING(true) открывала все строки.
async function ownedProfileIds(userId: string): Promise<Set<number>> {
  try {
    const { data } = await serviceClient.from("profiles").select("id").eq("user_id", userId);
    return new Set((data || []).map(p => Number(p.id)));
  } catch {
    return new Set();
  }
}

export async function GET(request: NextRequest) {
  const { denied, user } = await requireUser();
  if (denied) return denied;
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profile_id");
  const owned = await ownedProfileIds(user.id);

  // Чистка уведомлений старше 30 дней — в GET /api/cleanup по крону, не здесь.

  const fetchAll = searchParams.get("all") === "1";

  // Лёгкий счётчик непрочитанных для бейджей (без выгрузки сотен строк)
  if (searchParams.get("count") === "1") {
    if (!profileId) return NextResponse.json({ unread: 0 });
    if (!owned.has(Number(profileId))) return forbidden();
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("profile_id", profileId).eq("is_read", false);
    return NextResponse.json({ unread: count || 0 });
  }

  let query = supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(fetchAll ? 500 : 20);
  if (profileId) {
    if (!owned.has(Number(profileId))) return forbidden();
    query = query.eq("profile_id", profileId);
  } else {
    // Без явного профиля — только свои уведомления, а не все подряд
    if (owned.size === 0) return NextResponse.json([]);
    query = query.in("profile_id", [...owned]);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  // Роут в UI не используется (система пишет через serviceClient) — закрыт на админа,
  // чтобы нельзя было рассылать уведомления от имени системы.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdminUser(user.id))) return forbidden();
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
  const { denied, user } = await requireUser();
  if (denied) return denied;
  const supabase = await createClient();
  const owned = await ownedProfileIds(user.id);
  const body = await request.json();
  const { id, mark_all, profile_id } = body;

  if (mark_all && profile_id) {
    if (!owned.has(Number(profile_id))) return forbidden();
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("profile_id", profile_id).eq("is_read", false);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (id) {
    const { data: target } = await supabase.from("notifications").select("profile_id").eq("id", id).maybeSingle();
    if (!target || !owned.has(Number(target.profile_id))) return forbidden();
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "id or mark_all required" }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const { denied, user } = await requireUser();
  if (denied) return denied;
  const supabase = await createClient();
  const owned = await ownedProfileIds(user.id);
  const body = await request.json().catch(() => ({}));
  const { id, all, profile_id } = body;

  if (id) {
    const { data: target } = await supabase.from("notifications").select("profile_id").eq("id", id).maybeSingle();
    if (!target || !owned.has(Number(target.profile_id))) return forbidden();
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (all && profile_id) {
    if (!owned.has(Number(profile_id))) return forbidden();
    const { error } = await supabase.from("notifications").delete().eq("profile_id", profile_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "id or all+profile_id required" }, { status: 400 });
}
