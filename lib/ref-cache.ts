// Кэш справочников (районы, ЖК) на сессию: вместо 2+ одинаковых запросов
// с каждой страницы (клиенты, сделки, модалки) — один запрос на таблицу.
const cache = new Map<string, Promise<string[]>>();

export function getReference(table: "districts" | "residential_complexes" | "residential-complexes"): Promise<string[]> {
  const key = table === "districts" ? "districts" : "residential-complexes";
  let p = cache.get(key);
  if (!p) {
    p = fetch("/api/" + key)
      .then(res => res.json())
      .then((data: unknown) => {
        if (!Array.isArray(data)) return [];
        return (data as Array<{ name?: string }>).map(d => d.name || "").filter(Boolean);
      })
      .catch(() => []);
    cache.set(key, p);
  }
  return p;
}
