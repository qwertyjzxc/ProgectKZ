import { serviceClient } from "@/lib/supabase/service";

// Проверяет, есть ли у auth-пользователя хотя бы один профиль с ролью admin.
// Используется для серверной защиты админских API (одним скрытием кнопок
// в интерфейсе не обойтись — API можно вызвать напрямую).
export async function isAdminUser(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data } = await serviceClient.from("profiles").select("role").eq("user_id", userId);
    return (data || []).some(p => (p.role as string) === "admin");
  } catch {
    return false;
  }
}
