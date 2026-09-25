import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { isAdminUser } from "@/lib/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  // Данные через сервис-клиент: роут только для админов (проверка выше),
  // а RLS-политика profiles рекурсивна и роняет запрос через user-клиент.
  const { data, error } = await serviceClient.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await request.json();
  const { data, error } = await serviceClient.from("profiles").insert({
    full_name: body.full_name || "",
    role: body.role || "user",
    pin: body.pin || "",
    phone: body.phone || "",
    email: body.email || "",
    avatar_color: body.avatar_color || "blue",
    is_active: body.is_active ?? true,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
