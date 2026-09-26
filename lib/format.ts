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

export function formatDateOnly(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr || "";
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}