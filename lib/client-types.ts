// Общие типы и константы карточки клиента.
// Вынесены из ClientCategoryContent, чтобы View/Form-модалки жили
// в отдельных чанках (next/dynamic) и не раздували бандл страницы.

export interface Client {
  id: number;
  date: string;
  name: string;
  rooms: string;
  district: string;
  amount: number;
  furniture: string;
  rental_period: string;
  phone: string;
  phone_masked?: boolean;
  who_lives: string;
  people_count: number;
  notes: string;
  completed: string;
  broker: string;
  type: string;
  area: string;
  address: string;
  jk: string;
  contract: string;
  area_unit?: string;
  plot_type?: string;
  purpose?: string;
  communications?: string;
  access?: string;
  plot_shape?: string;
  relief?: string;
  restrictions?: string;
  documents?: string;
  preferences?: string;
  client_category?: string;
  tags?: string;
  premise_type?: string;
  finishing?: string;
  contract_type?: string;
  contract_kind?: string;
  reason?: string;
  status_comment?: string;
  resume_date?: string;
  created_at: string;
}

export type ClientFormData = Omit<Client, "id" | "created_at">;

export const completedColors: Record<string, string> = {
  "Новый Клиент": "bg-sky-100 text-sky-800",
  "Запрос уточняется": "bg-cyan-100 text-cyan-800",
  "Подбор объектов": "bg-blue-100 text-blue-800",
  "Варианты отправлены": "bg-indigo-100 text-indigo-800",
  "Просмотр": "bg-violet-100 text-violet-800",
  "Переговоры": "bg-amber-100 text-amber-800",
  "Подготовка к сделке": "bg-orange-100 text-orange-800",
  "Сделка в процессе": "bg-yellow-100 text-yellow-800",
  "Сделка завершена": "bg-green-100 text-green-800",
  "Заморожен": "bg-blue-100 text-blue-800",
  "Приостановлен": "bg-gray-100 text-gray-700",
  "Закрыт без сделки": "bg-red-100 text-red-800",
  // старые статусы из данных — чтобы не были чёрными
  "В процессе": "bg-yellow-100 text-yellow-800",
  "Завершено": "bg-green-100 text-green-800",
  "Отказ": "bg-red-100 text-red-800",
  "Заморожено": "bg-blue-100 text-blue-800",
  "Подписание договора": "bg-indigo-100 text-indigo-800",
  "Оплата": "bg-cyan-100 text-cyan-800",
  "VIP Клиент": "bg-amber-100 text-amber-800",
  "Перспективный": "bg-emerald-100 text-emerald-800",
  "Думает": "bg-orange-100 text-orange-800",
  "Проблемный": "bg-rose-100 text-rose-800",
  "Без статуса": "bg-gray-100 text-gray-500",
};

export function getInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}
