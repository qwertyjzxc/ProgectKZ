// Общие типы и константы собственников.
// Вынесены из OwnerCategoryContent, чтобы модалки жили в отдельных
// чанках (next/dynamic) и не раздували бандл страницы.

export interface Owner {
  id: number;
  name: string;
  phone?: string;
  district?: string;
  address?: string;
  jk?: string;
  rooms?: string;
  area?: string;
  area_unit?: string;
  house_area?: string;
  land_area?: string;
  price?: number;
  contract_type?: string;
  contract_kind?: string;
  status?: string;
  condition?: string;
  location_line?: string;
  premise_type?: string;
  finishing?: string;
  notes?: string;
  broker?: string;
  documents?: string;
  date?: string;
  created_at: string;
}

export const OWNER_STATUSES = ["Новый собственник", "Оценка объекта", "Заключение договора", "Упаковка + Маркетинг", "Сделка"];

export const completedColors: Record<string, string> = {
  "Новый собственник": "bg-violet-100 text-violet-800",
  "Оценка объекта": "bg-sky-100 text-sky-800",
  "Заключение договора": "bg-indigo-100 text-indigo-800",
  "Упаковка + Маркетинг": "bg-teal-100 text-teal-800",
  "Сделка": "bg-green-100 text-green-800",
};

export const CONDITIONS = ["Новое", "Хорошее", "Требует ремонта"];
export const LOCATION_LINES = ["1 линия (вдоль главной дороги)", "2 линия (второстепенная дорога, во дворе)"];
export const PREMISE_TYPES = ["Отдельно стоящее здание", "В ЖК"];
export const FINISHING_TYPES = ["Черновая", "С ремонтом"];
export const CONTRACT_KINDS = ["Эксклюзивный", "Стандартный"];
