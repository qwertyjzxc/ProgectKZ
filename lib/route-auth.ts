import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";

// Единые проверки доступа для API-роутов.
// Паттерн: const denied = await requireX(...); if (denied) return denied;

export function unauthorized(message = "Не авторизован") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Нет доступа") {
  return NextResponse.json({ error: message }, { status: 403 });
}

// Любой залогиненный пользователь (сессия валидируется через getUser).
export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { denied: unauthorized(), user: null as null, supabase };
  return { denied: null as null, user, supabase };
}

// Только администратор.
export async function requireAdmin() {
  const checked = await requireUser();
  if (checked.denied || !checked.user) return { denied: checked.denied || unauthorized(), user: null as null, supabase: checked.supabase };
  if (!(await isAdminUser(checked.user.id))) return { denied: forbidden(), user: null as null, supabase: checked.supabase };
  return { denied: null as null, user: checked.user, supabase: checked.supabase };
}

// Запрос от Vercel Cron: Authorization: Bearer <CRON_SECRET>.
// Секрет обязан быть задан — без него проверка не проходит (fail closed).
export function isCronRequest(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

// Тяжёлые фоновые ручки: либо крон по секрету, либо админ вручную.
export async function requireCronOrAdmin(request: NextRequest) {
  if (isCronRequest(request)) return { denied: null as null };
  const checked = await requireAdmin();
  if (checked.denied) return { denied: checked.denied };
  return { denied: null as null };
}
