import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";

export interface ActivityEntry {
  id: number;
  client_table: string;
  // properties: id объекта — UUID, остальные таблицы — числовые
  client_id: number | string;
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
  owners_kvartiry: "Собственники · Квартиры",
  owners_pomescheniya: "Собственники · Коммерция",
  owners_doma: "Собственники · Дома",
  owners_zemlya: "Собственники · Участки",
  properties: "Объекты",
  tasks: "Задачи",
};

const FIELD_LABELS: Record<string, string> = {
  name: "Имя",
  phone: "Телефон",
  district: "Район",
  address: "Адрес",
  jk: "Жилой комплекс",
  rooms: "Кол-во комнат",
  area: "Площадь",
  area_min: "Площадь от",
  area_max: "Площадь до",
  move_in_date: "Дата заезда",
  pets: "Животные",
  contract_status: "Статус договора",
  contract_date: "Дата договора",
  contract_valid_until: "Срок действия договора",
  contract_file: "Файл договора",
  amount: "Бюджет",
  amount_min: "Бюджет (от)",
  type: "Тип недвижимости",
  contract: "Договор",
  furniture: "Меблировка",
  rental_period: "Срок аренды",
  who_lives: "Кто будет проживать",
  people_count: "Кол-во человек",
  notes: "Заметки",
  completed: "Статус",
  broker: "Брокер",
  date: "Дата обращения",
  completion_date: "Дата завершения",
  area_unit: "Единицы площади",
  plot_type: "Участок под",
  purpose: "Назначение",
  communications: "Коммуникации",
  access: "Подъездные пути",
  plot_shape: "Форма участка",
  relief: "Рельеф",
  restrictions: "Ограничения",
  preferences: "Предпочтения",
  client_category: "Категория клиента",
  tags: "Теги",
  premise_type: "Тип помещения",
  finishing: "Отделка",
  contract_type: "Тип договора",
  contract_kind: "Вид договора",
  reason: "Причина закрытия / приостановки",
  status_comment: "Комментарий к причине",
  resume_date: "Дата повторного контакта",
  commission: "Комиссия",
  payment: "Способ оплаты",
  owner_name: "Собственник",
  // Поля собственников (owners_*)
  price: "Цена",
  status: "Статус",
  condition: "Состояние",
  house_area: "Площадь дома",
  land_area: "Площадь участка",
  location_line: "Расположение",
  // Поля объектов (properties)
  title: "Название",
  city: "Город",
  property_type: "Тип объекта",
  building_type: "Тип дома",
  complex_name: "Жилой комплекс",
  year_built: "Год постройки",
  bathroom: "Санузел",
  ceiling_height: "Высота потолков",
  contract_number: "Номер договора",
  payment_method: "Способ оплаты",
  contacts: "Контакты",
  description: "Описание",
};

export const DEAL_LABELS: Record<string, string> = {
  name: "Название",
  client: "Клиент",
  amount: "Сумма сделки",
  stage: "Этап",
  date: "Дата обращения",
  completion_date: "Дата завершения",
  category: "Категория",
};

export const TASK_LABELS: Record<string, string> = {
  title: "Название",
  client: "Клиент",
  description: "Описание",
  created_date: "Дата обращения",
  due_date: "Срок",
  priority: "Приоритет",
  status: "Статус",
  assignee_ids: "Исполнители",
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
  if (key === "amount" || key === "amount_min" || key === "people_count") {
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
  client_id: number | string;
  client_name: string;
  // create/update/delete — клиентские; task/event — записи о задачах и
  // быстрых событиях (отправлены объекты, назначен просмотр)
  action: string;
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
    // Только журнал. Уведомления шлёт notifyAll (lib/notify.ts) — раньше здесь
    // была вторая рассылка по тем же событиям, и включившие настройку
    // получали по два уведомления на каждое изменение.
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
    // Журнал не должен ломать основную операцию
  }
}

// Ближайшая невыполненная задача клиента — «Следующее действие» в таблице
// и карточке. Связь через tasks.client_id (миграция card-v2); старые задачи
// без связи не учитываются. До применения миграции колонка просто пустая.
export async function fetchNextActions(
  table: string,
  clientIds: Array<number | string>
): Promise<Map<number, { title: string; due_date: string }>> {
  const map = new Map<number, { title: string; due_date: string }>();
  if (clientIds.length === 0) return map;
  try {
    const { data } = await serviceClient
      .from("tasks")
      .select("id,title,due_date,status,client_id")
      .eq("client_table", table)
      .in("client_id", clientIds)
      .neq("status", "Завершено")
      // пустой срок — в конец, реальные даты по возрастанию
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(300);
    for (const t of (data || []) as Array<{ id: number; title: string; due_date: string | null; client_id: number | null }>) {
      const key = Number(t.client_id);
      if (key && !map.has(key)) map.set(key, { title: t.title || "", due_date: t.due_date || "" });
    }
  } catch {
    // нет колонок связи — «Следующее действие» пока недоступно
  }
  return map;
}
