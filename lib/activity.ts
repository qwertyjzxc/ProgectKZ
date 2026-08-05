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
  clients_prodaja: "Продажа",
};

const FIELD_LABELS: Record<string, string> = {
  name: "Имя",
  phone: "Телефон",
  district: "Район",
  address: "Адрес",
  jk: "ЖК",
  rooms: "Комнат",
  area: "Площадь",
  amount: "Бюджет",
  type: "Тип недвижимости",
  contract: "Договор",
  furniture: "Меблировка",
  rental_period: "Срок аренды",
  who_lives: "Кто проживает",
  people_count: "Кол-во человек",
  notes: "Заметки",
  completed: "Статус",
  broker: "Брокер",
  date: "Дата",
};

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

export function buildChanges(oldRow: Record<string, unknown>, newRow: Record<string, unknown>): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const [key, label] of Object.entries(FIELD_LABELS)) {
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
  } catch {
    // Журнал не должен ломать основную операцию с клиентом
  }
}
