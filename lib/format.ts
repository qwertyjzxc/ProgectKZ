export function formatNumber(value: string | number): string {
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(/[^\d.]/g, ""));
  if (isNaN(n)) return "";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(n);
}

export function formatMoney(value: string | number): string {
  if (value === null || value === undefined || value === "") return "";
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(/[^\d.]/g, ""));
  if (isNaN(n)) return "";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(n) + " ₸";
}

// «Сегодня» как YYYY-MM-DD в локальном часовом поясе устройства.
// Нельзя использовать new Date().toISOString().slice(0,10): toISOString это
// всегда UTC, и с 00:00 до 05:00 по Алматы вернёт вчерашний день.
export function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// «Сегодня» как DD.MM.YYYY по Алма-Ате — для серверных дефолтов (Vercel живёт в UTC).
export function todayRuAlmaty(): string {
  return new Date().toLocaleDateString("ru-RU", { timeZone: "Asia/Almaty" });
}

// Нормализация даты в YYYY-MM-DD. Принимает DD.MM.YYYY (с временем или без),
// YYYY-MM-DD (с T-временем или без), пустое значение → "". От мусора — "".
const ddMmYyyyRe = /^(\d{2})\.(\d{2})\.(\d{4})/;
const isoDateRe = /^(\d{4})-(\d{2})-(\d{2})/;
export function toISODate(v?: string | null): string {
  if (!v) return "";
  const s = String(v).trim();
  const dm = s.match(ddMmYyyyRe);
  if (dm) return `${dm[3]}-${dm[2]}-${dm[1]}`;
  const im = s.match(isoDateRe);
  if (im) return `${im[1]}-${im[2]}-${im[3]}`;
  return "";
}

export function formatDateOnly(dateStr: string): string {
  // Парсим строку вручную, без new Date("YYYY-MM-DD") — он трактуется как
  // UTC-полночь и при отрицательном смещении сдвинет день.
  const iso = toISODate(dateStr);
  if (iso) {
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr || "";
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}