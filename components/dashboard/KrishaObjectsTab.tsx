"use client";
import { useCallback, useEffect, useState } from "react";
import FilterPanel, { type SearchFilters } from "@/components/dashboard/FilterPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, Building2, RefreshCw } from "lucide-react";

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

interface InactiveItem {
  id: number;
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
  is_active?: boolean;
}

interface PageData {
  items: InactiveItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
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

const PER_PAGE = 30;

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

function Pagination({
  page,
  totalPages,
  pageNumbers,
  onChange,
}: {
  page: number;
  totalPages: number;
  pageNumbers: (number | "...")[];
  onChange: (p: number) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-40 bg-white rounded-xl shadow-lg border p-3 flex flex-col items-end gap-2">
      <p className="text-xs text-gray-500">Страница {page} из {totalPages}</p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
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
              onClick={() => onChange(n)}
            >
              {n}
            </Button>
          )
        )}
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Вперёд
        </Button>
      </div>
    </div>
  );
}

function ObjectCard({ o, removed }: { o: KrishaItem | InactiveItem; removed?: boolean }) {
  return (
    <a
      href={o.krisha_url}
      target="_blank"
      rel="noreferrer"
      className={"bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex flex-col " + (removed ? "opacity-60 saturate-50" : "")}
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
        {removed && (
          <Badge className="absolute bottom-2 left-2 bg-red-600 text-white">Снято с публикации</Badge>
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
  );
}

export default function KrishaObjectsTab() {
  const [mode, setMode] = useState<"live" | "inactive">("live");

  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<KrishaItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [inactivePage, setInactivePage] = useState(1);
  const [inactiveData, setInactiveData] = useState<PageData | null>(null);
  const [inactiveLoading, setInactiveLoading] = useState(false);

  const loadPage = useCallback(
    (dealType: string, propType: string, district: string, rooms: string, budgetFrom: string, budgetTo: string, p: number) => {
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
    if (mode !== "live") return;
    loadPage(
      filters.dealType,
      filters.propType,
      filters.district,
      filters.rooms ?? "",
      filters.budgetFrom,
      filters.budgetTo,
      page
    );
  }, [loadPage, mode, page, filters.dealType, filters.propType, filters.district, filters.rooms, filters.budgetFrom, filters.budgetTo]);

  const loadInactive = useCallback((p: number) => {
    fetch(`/api/objects?status=inactive&page=${p}&perPage=${PER_PAGE}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.items) setInactiveData(d);
        else if (d.error) setError(d.error);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Ошибка загрузки снятых"))
      .finally(() => setInactiveLoading(false));
  }, []);

  useEffect(() => {
    if (mode === "inactive") loadInactive(inactivePage);
  }, [mode, inactivePage, loadInactive]);

  const handleFiltersChange = useCallback((f: SearchFilters) => {
    setFilters(f);
    setPage(1);
  }, []);

  const switchMode = (m: "live" | "inactive") => {
    setMode(m);
    setError("");
    if (m === "inactive") {
      setInactiveLoading(true);
      setInactivePage(1);
    }
  };

  const pageNumbers = getPageNumbers(page, totalPages);
  const inactiveTotalPages = inactiveData?.totalPages ?? 1;
  const inactivePageNumbers = getPageNumbers(inactivePage, inactiveTotalPages);

  return (
    <div>
      <div className="flex items-center rounded-lg border bg-white p-0.5 w-fit">
        <button
          onClick={() => switchMode("live")}
          className={"px-3 py-1.5 rounded-md text-sm font-medium transition-colors " + (mode === "live" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100")}
        >
          Активные
        </button>
        <button
          onClick={() => switchMode("inactive")}
          className={"px-3 py-1.5 rounded-md text-sm font-medium transition-colors " + (mode === "inactive" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100")}
        >
          Снятые
        </button>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 text-red-700 rounded-xl border border-red-100 p-4 text-sm flex items-center justify-between gap-2">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => setError("")}>Закрыть</Button>
        </div>
      )}

      {mode === "live" ? (
        <>
          <FilterPanel onSearch={handleFiltersChange} />

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
                <ObjectCard key={o.krisha_id} o={o} />
              ))}
            </div>
          )}

          {!loading && items.length > 0 && (
            <Pagination page={page} totalPages={totalPages} pageNumbers={pageNumbers} onChange={setPage} />
          )}
        </>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              Снятые с публикации: <span className="text-gray-500">{inactiveData?.total ?? 0}</span>
            </h2>
            <Button variant="outline" size="sm" onClick={() => { setInactiveLoading(true); loadInactive(inactivePage); }}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Обновить
            </Button>
          </div>

          {inactiveLoading ? (
            <div className="mt-4 bg-white rounded-xl shadow-sm border p-12 text-center text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Загрузка…
            </div>
          ) : !inactiveData || inactiveData.items.length === 0 ? (
            <div className="mt-4 bg-white rounded-xl shadow-sm border p-12 text-center text-gray-400">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-lg">Снятых объектов нет</p>
              <p className="text-sm mt-1">Снятые появятся здесь после полного синка</p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {inactiveData.items.map((o) => (
                <ObjectCard key={o.krisha_id} o={o} removed />
              ))}
            </div>
          )}

          {!inactiveLoading && (inactiveData?.items.length ?? 0) > 0 && (
            <Pagination
              page={inactivePage}
              totalPages={inactiveTotalPages}
              pageNumbers={inactivePageNumbers}
              onChange={(p) => { setInactiveLoading(true); setInactivePage(p); }}
            />
          )}
        </>
      )}
    </div>
  );
}
