import type { SupabaseClient } from "@supabase/supabase-js";
import { serviceClient } from "@/lib/supabase/service";

export type NotifyKey =
  | "clients_create" | "clients_update" | "clients_delete"
  | "deals_create" | "deals_update" | "deals_delete"
  | "tasks_create" | "tasks_update" | "tasks_delete"
  | "objects_create" | "objects_update" | "objects_delete";

interface NotifyOpts {
  key: NotifyKey;
  message: string;
  related_to: string;
  related_id?: number | null;
  /** auth user id автора — его профили уведомление не получат */
  actorUserId?: string | null;
}

// Рассылает уведомление всем профилям, у которых включён соответствующий
// тумблер в настройках (profiles.notification_settings). Отсутствие ключа
// трактуется как "включено", чтобы не ломать поведение для старых профилей.
// Ошибки только логируются — уведомление никогда не должно ронять API.
export async function notifyAll(opts: NotifyOpts): Promise<void> {
  try {
    const { data: profiles, error } = await serviceClient
      .from("profiles")
      .select("id, user_id, role, notification_settings");
    if (error || !profiles) {
      if (error) console.error("notifyAll profiles:", error.message);
      return;
    }

    const ownIds = new Set<number>();
    if (opts.actorUserId) {
      for (const p of profiles as Array<{ id: number; user_id: string | null }>) {
        if (p.user_id === opts.actorUserId) ownIds.add(p.id);
      }
      const { data: links } = await serviceClient
        .from("profile_links")
        .select("profile_id")
        .eq("user_id", opts.actorUserId);
      for (const l of links || []) ownIds.add(l.profile_id as number);
    }

    const targets = (profiles as Array<{ id: number; role: string | null; notification_settings: Record<string, boolean> | null }>).filter(p => {
      if (ownIds.has(p.id)) return false;
      // Уведомления о сделках — только админам
      if (opts.key.startsWith("deals_") && p.role !== "admin") return false;
      const s = p.notification_settings || {};
      return s[opts.key] !== false;
    });
    if (targets.length === 0) return;

    const { error: insError } = await serviceClient.from("notifications").insert(
      targets.map(p => ({
        profile_id: p.id,
        message: opts.message,
        type: opts.key.split("_")[0],
        related_to: opts.related_to,
        related_id: opts.related_id ?? null,
      }))
    );
    if (insError) console.error("notifyAll insert:", insError.message);
  } catch (e) {
    console.error("notifyAll:", e instanceof Error ? e.message : e);
  }
}

export async function getActorUserId(
  supabase: { auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> } }
): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

// ТЗ §5: «Приостановлен» с датой повторного контакта → автозадача.
// Ошибки только логируются — задача не должна ронять основной запрос.
export async function maybeCreateResumeTask(
  supabase: SupabaseClient,
  row: { name?: unknown; completed?: unknown; resume_date?: unknown; reason?: unknown }
): Promise<void> {
  try {
    if (row.completed !== "Приостановлен" || !row.resume_date) return;
    const name = String(row.name || "");
    const { error } = await supabase.from("tasks").insert({
      title: "Связаться повторно: " + name,
      client: name,
      description: "Автозадача: клиент приостановлен" + (row.reason ? " — " + String(row.reason) : ""),
      due_date: String(row.resume_date),
      priority: "Средний",
      status: "Запланировано",
    });
    if (error) console.error("resume task:", error.message);
  } catch (e) {
    console.error("resume task:", e instanceof Error ? e.message : e);
  }
}
