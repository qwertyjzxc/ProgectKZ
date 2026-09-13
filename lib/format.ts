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