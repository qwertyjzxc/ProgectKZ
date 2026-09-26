// Общие типы и константы сделок.
// Вынесены из deals/page, чтобы модалки жили в отдельных
// чанках (next/dynamic) и не раздували бандл страницы.

export interface Deal {
  id: number;
  name: string;
  client: string;
  amount: number;
  stage: string;
  date: string;
  type: string;
  category: string;
  area?: string;
  area_unit?: string;
  address?: string;
  jk?: string;
  contract?: string;
  phone?: string;
  district?: string;
  rooms?: string;
  furniture?: string;
  rental_period?: string;
  who_lives?: string;
  people_count?: number;
  notes?: string;
  completed?: string;
  broker?: string;
  layout?: string;
  renter_type?: string;
  payment?: string;
  commission?: number;
  owner_name?: string;
  plot_type?: string;
  purpose?: string;
  communications?: string;
  access?: string;
  plot_shape?: string;
  relief?: string;
  documents?: string;
  restrictions?: string;
  finishing?: string;
  premise_type?: string;
  dealType?: string;
  completion_date?: string;
  created_at: string;
}

export type DealFormValues = Partial<Deal> & {
  dealType?: string;
  client?: string;
  premise_type?: string;
};

export const DEAL_TABLE_MAP: Record<string, string> = { kvartiry: "deals_kvartiry", pomescheniya: "deals_pomescheniya", zemlya: "deals_zemlya" };

export const DEAL_STATUSES = [
  "В процессе", "Завершено", "Отказ",
  "Заморожено", "Подписание договора", "Оплата",
  "VIP Клиент", "Перспективный", "Думает", "Проблемный",
  "Новый собственник", "Оценка объекта", "Заключение договора", "Упаковка + Маркетинг", "Сделка",
];

export const completedColors: Record<string, string> = {
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
  "Новый собственник": "bg-violet-100 text-violet-800",
  "Оценка объекта": "bg-sky-100 text-sky-800",
  "Заключение договора": "bg-indigo-100 text-indigo-800",
  "Упаковка + Маркетинг": "bg-teal-100 text-teal-800",
  "Сделка": "bg-green-100 text-green-800",
};
