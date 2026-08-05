"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import FilterPanel, { type SearchFilters } from "@/components/dashboard/FilterPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, Building2 } from "lucide-react";

interface KrishaItem {
  krisha_id: number;
  deal_type: string;
  prop_type: string;
  title: string;
  price: number;
  price_text: string;
  rooms: string;
  area: string;
  floor: string;
  address: string;
  description: string;
  image_url: string;
  krisha_url: string;
}

const EMPTY_FILTERS: SearchFilters = {
  dealType: "",
  propType: "",
  district: "",
  jc: "",
  rooms: null,
  budgetFrom: "",
  budgetTo: "",
  areaFrom: "",
  areaTo: "",
};

const formatPrice = (price: number) =>
  price ? new Intl.NumberFormat("ru-RU").format(price) + " ₸" : "";

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set<number>([1, total, current - 1, current, current + 1]);
  const sorted = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "...")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push("...");
    out.push(p);
    prev = p;
  }
  return out;
}

export default function KrishaObjectsTab() {
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<KrishaItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const cacheRef = useRef(new Map<string, { items: KrishaItem[]; totalPages: number }>());

  const loadPage = useCallback(
    (dealType: string, propType: string, district: string, rooms: string, budgetFrom: string, budgetTo: string, p: number) => {
      const key = `${p}|${dealType}|${propType}|${district}|${rooms}|${budgetFrom}|${budgetTo}`;
      const cached = cacheRef.current.get(key);
      if (cached) {
        Promise.resolve().then(() => {
          setItems(cached.items);
          setTotalPages(cached.totalPages);
        });
        return;
      }
      const qs = new URLSearchParams({
        dealType,
        propType,
        district,
        rooms,
        budgetFrom,
        budgetTo,
        page: String(p),
      });
      fetch(`/api/krisha?${qs.toString()}`)
        .then((res) => res.json())
        .then((d) => {
          if (d.items) {
            cacheRef.current.set(key, { items: d.items, totalPages: d.totalPages || 1 });
            setItems(d.items);
            setTotalPages(d.totalPages || 1);
          } else if (d.error) {
            setError(d.error);
          }
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Ошибка загрузки с Krisha.kz"))
        .finally(() => setLoading(false));
    },
    []
  );

  useEffect(() => {
    loadPage(
      filters.dealType,
      filters.propType,
      filters.district,
      filters.rooms ?? "",
      filters.budgetFrom,
      filters.budgetTo,
      page
    );
  }, [loadPage, page, filters.dealType, filters.propType, filters.district, filters.rooms, filters.budgetFrom, filters.budgetTo]);

  const handleFiltersChange = useCallback((f: SearchFilters) => {
    setFilters(f);
    setPage(1);
  }, []);

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div>
      <FilterPanel onSearch={handleFiltersChange} />

      {error && (
        <div className="mt-4 bg-red-50 text-red-700 rounded-xl border border-red-100 p-4 text-sm flex items-center justify-between gap-2">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => setError("")}>Закрыть</Button>
        </div>
      )}

      {loading ? (
        <div className="mt-6 bg-white rounded-xl shadow-sm border p-12 text-center text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          Загружаем объявления с Krisha.kz…
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 bg-white rounded-xl shadow-sm border p-12 text-center text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-lg">Ничего не найдено</p>
          <p className="text-sm mt-1">Попробуйте изменить фильтры</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((o) => (
            <a
              key={o.krisha_id}
              href={o.krisha_url}
              target="_blank"
              rel="noreferrer"
              className="bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex flex-col"
            >
              <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                {o.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={o.image_url}
                    alt={o.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Building2 className="w-10 h-10" />
                  </div>
                )}
                <Badge className="absolute top-2 left-2 bg-blue-600 text-white">{o.prop_type}</Badge>
                {o.deal_type && (
                  <Badge variant="secondary" className="absolute top-2 right-2 bg-white/90">
                    {o.deal_type}
                  </Badge>
                )}
              </div>
              <div className="p-4 flex flex-col gap-1.5 flex-1">
                <p className="text-sm font-semibold text-gray-900 line-clamp-1">{o.title || "Объект"}</p>
                <p className="text-lg font-bold text-blue-600">{formatPrice(o.price) || o.price_text}</p>
                <p className="text-xs text-gray-500 line-clamp-1">{o.address || "Адрес не указан"}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {o.rooms && <Badge variant="secondary">{o.rooms}</Badge>}
                  {o.area && <Badge variant="secondary">{o.area}</Badge>}
                  {o.floor && <Badge variant="secondary">{o.floor} эт.</Badge>}
                </div>
                <div className="mt-auto pt-2 flex items-center gap-1 text-xs text-blue-500 font-medium">
                  Смотреть на Krisha.kz <ExternalLink className="w-3 h-3" />
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40 bg-white rounded-xl shadow-lg border p-3 flex flex-col items-end gap-2">
          <p className="text-xs text-gray-500">Страница {page} из {totalPages}</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Назад
            </Button>
            {pageNumbers.map((n, i) =>
              n === "..." ? (
                <span key={`dots-${i}`} className="px-1.5 text-gray-400 select-none">
                  …
                </span>
              ) : (
                <Button
                  key={n}
                  size="sm"
                  variant={n === page ? "default" : "outline"}
                  onClick={() => setPage(n)}
                >
                  {n}
                </Button>
              )
            )}
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Вперёд
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
