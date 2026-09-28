import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { isAdminUser } from "@/lib/admin";

export interface PhoneVisibility {
  isAdmin: boolean;
  profileNames: string[];
  // null = нет живой сессии. Списки обязаны отвечать 401, а не тихо
  // маскировать телефоны (админ с протухшей кукой получал "Скрыт").
  userId: string | null;
}

// Кэш на инстанс (TTL 60с): visibility дёргается каждым списочным GET
// (клиенты), без кэша это +1-2 хопа (~200-400мс) к каждому запросу.
const visCache = new Map<string, { vis: Omit<PhoneVisibility, "userId">; at: number }>();
const VIS_TTL_MS = 60 * 1000;

// Профили auth-пользователя: собственные (user_id = userId) + подключённые (profile_links).
// Имя профиля = "Имя Фамилия" (как в profile-context.profileName).
// Перф: getSession читает JWT из кук локально (0 хопов) вместо getUser (целый
// roundtrip к Auth API). Для чтения списков этого достаточно; если куки нет или
// истекли — дёргаем getUser как фолбэк, чтобы залогиненный админ не считался
// анонимом и не видел сплошную маску.
export async function getPhoneVisibility(): Promise<PhoneVisibility> {
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    let user = session?.user ?? null;
    if (!user) {
      try {
        const { data: { user: fresh } } = await supabase.auth.getUser();
        user = fresh;
      } catch {
        user = null;
      }
    }
    if (!user) return { isAdmin: false, profileNames: [], userId: null };
    userId = user.id;
    const hit = visCache.get(userId);
    if (hit && Date.now() - hit.at < VIS_TTL_MS) return { ...hit.vis, userId };

    const { data: ownedRaw, error: ownedErr } = await serviceClient
      .from("profiles")
      .select("id, user_id, first_name, last_name, full_name, role")
      .eq("user_id", user.id);
    // Ошибка БД раньше молча читалась как «не админ» — админ получал маску
    // без единого следа в логах. Пробрасываем в catch: там лог + фолбэк.
    if (ownedErr) throw new Error("profiles: " + ownedErr.message);

    const owned = (ownedRaw || []) as Array<{
      id: number; user_id: string; first_name?: string; last_name?: string; full_name?: string; role?: string;
    }>;
    const isAdmin = owned.some(p => p.role === "admin");

    // Админу маскирование не применяется — links не нужны, пропускаем лишние запросы.
    // Не-админу докачиваем связанные профили для сверки имён брокеров.
    const ownedIds = new Set(owned.map(p => p.id));
    let linked: typeof owned = [];
    if (!isAdmin) {
      const { data: linksRaw } = await serviceClient.from("profile_links").select("profile_id").eq("user_id", user.id);
      const linkedIds = (linksRaw || [])
        .map(l => (l as { profile_id: number }).profile_id)
        .filter(id => !ownedIds.has(id));
      if (linkedIds.length > 0) {
        const { data } = await serviceClient
          .from("profiles")
          .select("id, user_id, first_name, last_name, full_name, role")
          .in("id", linkedIds);
        linked = (data || []) as typeof owned;
      }
    }

    const profileNames = [...owned, ...linked]
      .map(p => [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || p.full_name || "")
      .filter(Boolean);

    const vis: Omit<PhoneVisibility, "userId"> = { isAdmin, profileNames };
    visCache.set(userId, { vis, at: Date.now() });
    if (visCache.size > 500) {
      const oldest = visCache.keys().next().value;
      if (oldest) visCache.delete(oldest);
    }
    return { ...vis, userId };
  } catch (e) {
    // Деградация обязана быть видимой в логах. isAdminUser (свой кэш +
    // отдельный запрос) даёт админу второй шанс остаться админом.
    console.error("[phone-visibility] не удалось получить видимость, телефоны замаскированы:", e);
    const adminFallback = userId ? await isAdminUser(userId) : false;
    return { isAdmin: adminFallback, profileNames: [], userId };
  }
}

// Сброс кэша видимости (смена роли/имени профиля, удаление пользователя).
export function invalidatePhoneVisibility(userId?: string | null) {
  if (userId) visCache.delete(userId);
  else visCache.clear();
}

// Клиент считается «своим», если его broker совпадает с именем профиля текущего пользователя.
export function canSeePhone(broker: string | undefined, vis: PhoneVisibility): boolean {
  if (vis.isAdmin) return true;
  return !!broker && vis.profileNames.includes(broker);
}

// Маскирует телефоны в списке: чужие клиенты получают phone="" + флаг phone_masked.
export function maskRowsPhones<T extends { broker?: string; phone?: string }>(
  rows: T[],
  vis: PhoneVisibility
): Array<T & { phone_masked?: boolean }> {
  if (vis.isAdmin) return rows;
  return rows.map(r =>
    canSeePhone(r.broker, vis) ? r : { ...r, phone: "", phone_masked: true }
  );
}
