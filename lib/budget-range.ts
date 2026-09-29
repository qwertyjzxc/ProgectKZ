import { formatMoney, formatNumber } from "@/lib/format";

// Разбор текста поля «Бюджет/Цена»: фильтр одним полем.
// "1500"        → ровно 1500 (мин = макс)
// "1000-1500"   → диапазон от и до
// "1500-", "-1500" и прочий мусор → пусто (фильтр не применяется)
export function parseBudgetRange(text: string): { min: string; max: string } {
  const t = text.trim();
  if (!t.includes("-")) {
    const v = t.replace(/[^\d]/g, "");
    return { min: v, max: v };
  }
  const parts = t.split("-");
  const min = (parts[0] || "").replace(/[^\d]/g, "");
  const max = (parts[1] || "").replace(/[^\d]/g, "");
  if (!min || !max) return { min: "", max: "" };
  return { min, max };
}

// Разбор поля «Бюджет» в карточке клиента. В отличие от фильтра, одиночное
// число здесь — только «до» (max), диапазон "1000-1500" — от и до.
// Мусор и пусто → { min: null, max: null } (бюджет не задан).
export function parseBudgetCard(raw: string): { min: number | null; max: number | null } {
  const t = (raw || "").replace(/\s+/g, "").replace(/[–—]/g, "-").trim();
  if (!t) return { min: null, max: null };
  const m = /^(\d{1,15})-(\d{1,15})$/.exec(t);
  if (m) {
    let a = parseInt(m[1], 10);
    let b = parseInt(m[2], 10);
    if (a > b) [a, b] = [b, a];
    return { min: a, max: b };
  }
  if (/^\d{1,15}$/.test(t)) return { min: null, max: parseInt(t, 10) };
  return { min: null, max: null };
}

// Живая маска поля бюджета: тысячи разделяются соразмерно MoneyInput,
// диапазон "1500-2000" сохраняется (дробим по тире и форматируем каждую часть).
export function formatBudgetInput(raw: string): string {
  return raw
    .split("-")
    .map(p => {
      const digits = p.replace(/[^\d]/g, "");
      return digits ? formatNumber(digits) : "";
    })
    .join("-");
}

// Первоначальное значение текстового поля при открытии карточки.
export function budgetToInput(min: number | null | undefined, max: number | null | undefined): string {
  const hasMax = typeof max === "number" && max > 0;
  const hasMin = typeof min === "number" && min > 0;
  if (hasMin && hasMax) return `${min}-${max}`;
  if (hasMin) return String(min);
  return hasMax ? String(max) : "";
}

// Человекочитаемое отображение бюджета: «1 500 ₸ — 2 000 ₸» для диапазона,
// «1 500 ₸» для одиночного, пустая строка, если бюджета нет.
export function formatBudgetRange(min: number | null | undefined, max: number | null | undefined): string {
  const hasMax = typeof max === "number" && max > 0;
  const hasMin = typeof min === "number" && min > 0;
  if (hasMin && hasMax) return `${formatMoney(min)} — ${formatMoney(max)}`;
  if (hasMin) return formatMoney(min);
  return hasMax ? formatMoney(max) : "";
}