import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";

export interface PhoneVisibility {
  isAdmin: boolean;
  profileNames: string[];
}

// Кэш на инстанс (TTL 60с): visibility дёргается каждым списочным GET
// (клиенты), без кэша это +1-2 хопа (~200-400мс) к каждому запросу.
const visCache = new Map<string, { vis: PhoneVisibility; at: number }>();
const VIS_TTL_MS = 60 * 1000;

// Профили auth-пользователя: собственные (user_id = userId) + подключённые (profile_links).
// Имя профиля = "Имя Фамилия" (как в profile-context.profileName).
// Перф: getSession читает JWT из кук локально (0 хопов) вместо getUser (целый
// roundtrip к Auth API). Для чтения списков этого достаточно — proxy.ts уже
// весь роутинг строит на getSession; строгий getUser остаётся на записи.
export async function getPhoneVisibility(): Promise<PhoneVisibility> {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return { isAdmin: false, profileNames: [] };
    const hit = visCache.get(user.id);
    if (hit && Date.now() - hit.at < VIS_TTL_MS) return hit.vis;

    const { data: ownedRaw } = await serviceClient
      .from("profiles")
      .select("id, user_id, first_name, last_name, full_name, role")
      .eq("user_id", user.id);

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

    const vis: PhoneVisibility = { isAdmin, profileNames };
    visCache.set(user.id, { vis, at: Date.now() });
    if (visCache.size > 500) {
      const oldest = visCache.keys().next().value;
      if (oldest) visCache.delete(oldest);
    }
    return vis;
  } catch {
    return { isAdmin: false, profileNames: [] };
  }
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