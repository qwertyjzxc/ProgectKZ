import { serviceClient } from "@/lib/supabase/service";

// Кэш на инстанс (TTL 60с): проверка админа идёт почти в каждом API-запросе,
// без кэша это +1 хоп (~200мс) к каждой ручке. Смена роли применяется с задержкой до TTL.
const adminCache = new Map<string, { isAdmin: boolean; at: number }>();
const ADMIN_TTL_MS = 60 * 1000;

// Проверяет, есть ли у auth-пользователя хотя бы один профиль с ролью admin.
// Используется для серверной защиты админских API (одним скрытием кнопок
// в интерфейсе не обойтись — API можно вызвать напрямую).
export async function isAdminUser(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const hit = adminCache.get(userId);
  if (hit && Date.now() - hit.at < ADMIN_TTL_MS) return hit.isAdmin;
  try {
    const { data } = await serviceClient.from("profiles").select("role").eq("user_id", userId);
    const isAdmin = (data || []).some(p => (p.role as string) === "admin");
    adminCache.set(userId, { isAdmin, at: Date.now() });
    if (adminCache.size > 500) {
      const oldest = adminCache.keys().next().value;
      if (oldest) adminCache.delete(oldest);
    }
    return isAdmin;
  } catch {
    return false;
  }
}
