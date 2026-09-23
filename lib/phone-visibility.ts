import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";

export interface PhoneVisibility {
  isAdmin: boolean;
  profileNames: string[];
}

// Профили auth-пользователя: собственные (user_id = userId) + подключённые (profile_links).
// Имя профиля = "Имя Фамилия" (как в profile-context.profileName).
export async function getPhoneVisibility(): Promise<PhoneVisibility> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { isAdmin: false, profileNames: [] };

    const [ownedRes, linksRes] = await Promise.all([
      serviceClient
        .from("profiles")
        .select("id, user_id, first_name, last_name, full_name, role")
        .eq("user_id", user.id),
      serviceClient.from("profile_links").select("profile_id").eq("user_id", user.id),
    ]);

    const owned = (ownedRes.data || []) as Array<{
      id: number; user_id: string; first_name?: string; last_name?: string; full_name?: string; role?: string;
    }>;
    const isAdmin = owned.some(p => p.role === "admin");

    const ownedIds = new Set(owned.map(p => p.id));
    const linkedIds = (linksRes.data || [])
      .map(l => (l as { profile_id: number }).profile_id)
      .filter(id => !ownedIds.has(id));

    let linked: typeof owned = [];
    if (linkedIds.length > 0) {
      const { data } = await serviceClient
        .from("profiles")
        .select("id, user_id, first_name, last_name, full_name, role")
        .in("id", linkedIds);
      linked = (data || []) as typeof owned;
    }

    const profileNames = [...owned, ...linked]
      .map(p => [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || p.full_name || "")
      .filter(Boolean);

    return { isAdmin, profileNames };
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