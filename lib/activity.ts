import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";

export interface ActivityEntry {
  id: number;
  client_table: string;
  client_id: number;
  client_name: string;
  action: string;
  message: string;
  changes: FieldChange[] | null;
  actor_id: string | null;
  actor_name: string;
  created_at: string;
}

export interface FieldChange {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
}

export const ACTIVITY_TABLE_LABELS: Record<string, string> = {
  clients_arenda: "Аренда",
  clients_prodaja: "Покупка",
  deals: "Сделки",
  deals_kvartiry: "Квартиры",
  deals_pomescheniya: "Помещения",
  deals_zemlya: "Земля",
  tasks: "Задачи",
};

const FIELD_LABELS: Record<string, string> = {
  name: "Имя",
  phone: "Телефон",
  district: "Район",
  address: "Адрес",
  jk: "ЖК",
  rooms: "Кол-во комнат",
  area: "Площадь",
  amount: "Бюджет",
  type: "Тип недвижимости",
  contract: "Договор",
  furniture: "Меблировка",
  rental_period: "Срок аренды",
  who_lives: "Кто будет проживать",
  people_count: "Кол-во человек",
  notes: "Заметки",
  completed: "Статус",
  broker: "Брокер",
  date: "Дата",
};

export const DEAL_LABELS: Record<string, string> = {
  name: "Название",
  client: "Клиент",
  amount: "Сумма",
  stage: "Этап",
  date: "Дата",
  category: "Категория",
};

export const TASK_LABELS: Record<string, string> = {
  title: "Название",
  client: "Клиент",
  description: "Описание",
  created_date: "Дата создания",
  due_date: "Срок",
  priority: "Приоритет",
  status: "Статус",
  assignee_ids: "Исполнители",
};

const NOTIFICATION_ENTITY_LABELS: Record<string, string> = {
  clients: "Клиенты",
  deals: "Сделки",
  tasks: "Задачи",
};

export function notificationKey(clientTable: string, action: string): string {
  const entity = clientTable.startsWith("clients_") ? "clients" : clientTable.startsWith("deals_") ? "deals" : clientTable;
  return `${entity}_${action}`;
}

function fmtValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return v.toLocaleString("ru-RU");
  if (typeof v === "boolean") return v ? "да" : "нет";
  return String(v);
}

function normalizeForCompare(key: string, v: unknown): string {
  if (v === null || v === undefined) return "";
  if (key === "phone") {
    let digits = String(v).replace(/\D/g, "");
    if (digits.startsWith("8")) digits = digits.slice(1);
    else if (digits.length === 11 && digits.startsWith("7")) digits = digits.slice(1);
    return digits;
  }
  if (key === "amount" || key === "people_count") {
    const n = Number(v);
    return Number.isFinite(n) ? String(n) : "";
  }
  return String(v).trim();
}

export function buildChanges(oldRow: Record<string, unknown>, newRow: Record<string, unknown>, labels: Record<string, string> = FIELD_LABELS): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const [key, label] of Object.entries(labels)) {
    const oldV = oldRow[key];
    const newV = newRow[key];
    if (normalizeForCompare(key, oldV) !== normalizeForCompare(key, newV)) {
      changes.push({ field: key, label, oldValue: fmtValue(oldV), newValue: fmtValue(newV) });
    }
  }
  return changes;
}

export function buildUpdateMessage(changes: FieldChange[]): string {
  if (changes.length === 0) return "Обновил данные клиента";
  return "Изменил: " + changes.map(c => c.label).join(", ");
}

export async function logActivity(entry: {
  client_table: string;
  client_id: number;
  client_name: string;
  action: "create" | "update" | "delete";
  message: string;
  changes?: FieldChange[];
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let actorName = "";
    if (user) {
      const { data } = await serviceClient
        .from("profiles")
        .select("first_name, last_name")
        .eq("user_id", user.id)
        .limit(1);
      const prof = data?.[0];
      if (prof) actorName = [prof.first_name, prof.last_name].filter(Boolean).join(" ").trim();
    }
    await serviceClient.from("client_activity").insert({
      client_table: entry.client_table,
      client_id: entry.client_id,
      client_name: entry.client_name,
      action: entry.action,
      message: entry.message,
      changes: entry.changes || [],
      actor_id: user?.id || null,
      actor_name: actorName || "Сотрудник",
    });

    const entity = entry.client_table.startsWith("clients_") ? "clients" : entry.client_table.startsWith("deals_") ? "deals" : entry.client_table;
    const key = notificationKey(entry.client_table, entry.action);
    const skipIds = new Set<number>();
    if (user) {
      const { data: actorProfiles } = await serviceClient
        .from("profiles")
        .select("id")
        .eq("user_id", user.id);
      (actorProfiles || []).forEach(p => skipIds.add(p.id));
    }
    const entityLabel = NOTIFICATION_ENTITY_LABELS[entity] || entity;
    const { data: targets } = await serviceClient
      .from("profiles")
      .select("id, notification_settings")
      .eq("is_active", true);
    const rows = (targets || [])
      .filter(p => !skipIds.has(p.id))
      .filter(p => {
        const s = (p.notification_settings as Record<string, boolean> | null) || {};
        return s[key] === true;
      })
      .map(p => ({
        profile_id: p.id,
        message: `${actorName || "Сотрудник"} · ${entityLabel}: ${entry.message}${entry.client_name ? " — " + entry.client_name : ""}`,
        type: "activity",
        related_to: entity === "clients" ? "/clients" : "/" + entity,
      }));
    if (rows.length > 0) {
      await serviceClient.from("notifications").insert(rows);
    }
  } catch {
    // Журнал и уведомления не должны ломать основную операцию
  }
}
