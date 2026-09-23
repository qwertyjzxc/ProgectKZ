// Статусы клиентов по ТЗ §5: воронка «на каком этапе сейчас клиент».

export const CLIENT_FUNNEL_STATUSES = [
  "Новый Клиент",
  "Запрос уточняется",
  "Подбор объектов",
  "Варианты отправлены",
  "Просмотр",
  "Переговоры",
  "Подготовка к сделке",
  "Сделка в процессе",
  "Сделка завершена",
  "Заморожен",
  "Приостановлен",
  "Закрыт без сделки",
] as const;

export const PAUSED_STATUS = "Приостановлен";
export const CLOSED_LOST_STATUS = "Закрыт без сделки";
export const DEAL_DONE_STATUS = "Сделка завершена";

export const PAUSE_REASONS = [
  "Отложил покупку/аренду",
  "Ждёт продажи своей недвижимости",
  "Ждёт одобрения ипотеки",
  "Не определился с бюджетом",
  "Временно нет подходящих вариантов",
  "Уехал / временно недоступен",
  "Изменились обстоятельства",
  "Другое",
];

export const CLOSE_REASONS = [
  "Купил/арендовал самостоятельно",
  "Купил/арендовал через другое агентство",
  "Передумал покупать/арендовать",
  "Не устроили цены",
  "Не найден подходящий объект",
  "Не выходит на связь",
  "Нет финансирования",
  "Отказ банка / ипотеки",
  "Изменились планы",
  "Другое",
];

export function reasonsFor(status: string): string[] {
  if (status === PAUSED_STATUS) return PAUSE_REASONS;
  if (status === CLOSED_LOST_STATUS) return CLOSE_REASONS;
  return [];
}

export function needsReason(status: string): boolean {
  return status === PAUSED_STATUS || status === CLOSED_LOST_STATUS;
}

export function needsResumeDate(status: string): boolean {
  return status === PAUSED_STATUS;
}

export const CLIENT_FUNNEL_COLORS: Record<string, string> = {
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
};

export const CLIENT_FUNNEL_STAT_COLORS: Record<string, string> = {
  "Новый Клиент": "text-sky-600",
  "Запрос уточняется": "text-cyan-600",
  "Подбор объектов": "text-blue-600",
  "Варианты отправлены": "text-indigo-600",
  "Просмотр": "text-violet-600",
  "Переговоры": "text-amber-600",
  "Подготовка к сделке": "text-orange-600",
  "Сделка в процессе": "text-yellow-600",
  "Сделка завершена": "text-green-600",
  "Заморожен": "text-blue-600",
  "Приостановлен": "text-gray-500",
  "Закрыт без сделки": "text-red-500",
};

export const CLIENT_CATEGORIES = ["VIP", "Приоритетный", "Обычный"] as const;

export const CLIENT_TAGS = [
  "VIP",
  "Инвестор",
  "Повторный клиент",
  "Рекомендация",
  "Срочный",
  "Ипотека",
  "Требует внимания",
] as const;

export const PREMISE_TYPES = [
  "Отдельно стоящее здание",
  "В ЖК",
] as const;

export const FINISHING_TYPES = [
  "Черновая",
  "С ремонтом",
] as const;

export const CONTRACT_KINDS = [
  "Эксклюзивный",
  "Стандартный",
] as const;

export function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(x => typeof x === "string") : [];
  } catch {
    return raw.split(",").map(s => s.trim()).filter(Boolean);
  }
}
