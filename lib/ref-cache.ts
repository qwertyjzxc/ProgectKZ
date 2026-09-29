// Кэш справочников (районы, ЖК) на сессию: вместо 2+ одинаковых запросов
// с каждой страницы (клиенты, сделки, модалки) — один запрос на таблицу.
const cache = new Map<string, Promise<string[]>>();

export function getReference(table: "districts" | "residential_complexes" | "residential-complexes"): Promise<string[]> {
  const key = table === "districts" ? "districts" : "residential-complexes";
  let p = cache.get(key);
  if (!p) {
    p = fetch("/api/" + key)
      .then(async res => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data: unknown = await res.json();
        if (!Array.isArray(data)) return [];
        return (data as Array<{ name?: string }>).map(d => d.name || "").filter(Boolean);
      })
      .catch((err: Error) => {
        // Ошибку не кэшируем на всю сессию: следующий вызов попробует ещё раз,
        // а не покажет закэшированный пустой список справочников.
        cache.delete(key);
        console.warn("[ref-cache] Не удалось загрузить «" + key + "»:", err?.message || err);
        return [] as string[];
      });
    cache.set(key, p);
  }
  return p;
}
