"use client";
import { useCallback, useEffect, useState } from "react";
import FilterPanel, { type SearchFilters } from "@/components/dashboard/FilterPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, ExternalLink, Building2 } from "lucide-react";

interface ObjectItem {
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
}

interface PageData {
  items: ObjectItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

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

export default function OurObjectsTab() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [pages, setPages] = useState("1");
  const [progress, setProgress] = useState<{ page: number; totalPages: number; count: number } | null>(null);

  const loadPage = useCallback((p: number) => {
    fetch(`/api/objects?page=${p}&perPage=${PER_PAGE}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.items) setData(d);
        else if (d.error) setError(d.error);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Ошибка загрузки объектов"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadPage(page);
  }, [page, loadPage]);

  const handleSearch = async (filters: SearchFilters) => {
    setImporting(true);
    setError("");
    setInfo("");
    setProgress({ page: 0, totalPages: 0, count: 0 });
    let added = 0;
    try {
      const res = await fetch("/api/objects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...filters, pages: Number(pages) || 1 }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Ошибка загрузки с Krisha.kz");
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("Стриминг недоступен");
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let evt;
          try {
            evt = JSON.parse(line);
          } catch {
            continue;
          }
          if (evt.type === "progress") {
            added += evt.items?.length ?? 0;
            setProgress({ page: evt.page, totalPages: evt.totalPages, count: added });
          } else if (evt.type === "done") {
            setInfo(
              `Загружено с Krisha.kz: ${evt.imported} объявл. (стр. ${evt.pagesFetched}/${evt.totalPages || "?"})`
            );
          } else if (evt.type === "error") {
            setError(evt.message);
          }
        }
      }
      if (page !== 1) setPage(1);
      else loadPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки с Krisha.kz");
    } finally {
      setImporting(false);
    }
  };

  const totalPages = data?.totalPages ?? 1;
  const items = data?.items ?? [];
  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Загрузка с Krisha.kz в базу</h2>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Страниц:</label>
            <input
              type="number"
              min={1}
              max={504}
              value={pages}
              onChange={(e) => setPages(e.target.value)}
              className="w-20 h-9 rounded-lg border border-gray-200 px-3 py-1 text-sm bg-white focus:border-blue-400 outline-none"
            />
          </div>
        </div>
        <FilterPanel onSearch={handleSearch} autoApply={false} />
        <p className="text-xs text-gray-400 mt-3">
          ≈28 объявлений на странице. «Загрузить с Krisha» добавит объявления в базу
          (повторная загрузка обновляет существующие).
        </p>
      </div>

      {importing && (
        <div className="mt-4 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 p-4 text-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {progress && progress.totalPages
              ? `Загрузка страницы ${progress.page} из ${progress.totalPages} · Добавлено: ${progress.count} объявл.`
              : "Подключаемся к Krisha.kz…"}
          </div>
          {progress && progress.totalPages ? (
            <div className="mt-2 h-1.5 bg-blue-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${Math.round((progress.page / progress.totalPages) * 100)}%` }}
              />
            </div>
          ) : null}
        </div>
      )}
      {info && (
        <div className="mt-4 bg-green-50 text-green-700 rounded-xl border border-green-100 p-4 text-sm">{info}</div>
      )}
      {error && (
        <div className="mt-4 bg-red-50 text-red-700 rounded-xl border border-red-100 p-4 text-sm flex items-center justify-between gap-2">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => setError("")}>Закрыть</Button>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          В базе: <span className="text-gray-500">{data?.total ?? 0}</span> объектов
        </h2>
        <Button variant="outline" size="sm" onClick={() => loadPage(page)}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Обновить
        </Button>
      </div>

      {loading ? (
        <div className="mt-6 bg-white rounded-xl shadow-sm border p-12 text-center text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          Загрузка…
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 bg-white rounded-xl shadow-sm border p-12 text-center text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-lg">Объектов пока нет</p>
          <p className="text-sm mt-1">Укажите параметры выше и нажмите «Загрузить с Krisha»</p>
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
