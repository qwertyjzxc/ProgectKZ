"use client";

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useEscapeKey } from "@/lib/use-escape";
import Combobox from "@/components/Combobox";
import DatePicker from "@/components/DatePicker";
import { SHYMKENT_DISTRICTS, SHYMKENT_JK } from "@/lib/shymkent";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Trash2, Edit3, Filter, X, Loader2, Check, Banknote, CalendarDays, Square, CheckSquare, ArrowLeft, History, ListTodo, Upload, FileText, CheckCircle2, Home, MapPin, Ruler, Briefcase, Phone, User, Users, Building2, Eye } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import DealCategorySelector from "@/components/DealCategorySelector";
import DealTypeSelector, { DEAL_CATEGORY_LABELS } from "@/components/DealTypeSelector";
// Модалки сделок — отдельными чанками: грузятся только при открытии
const DealFormModal = dynamic(() => import("@/components/DealFormModal"), { ssr: false });
const DealViewModal = dynamic(() => import("@/components/DealViewModal"), { ssr: false });
const AssignTaskModalDyn = dynamic(() => import("@/components/AssignTaskModal"), { ssr: false });
const CompleteDealModalForDealDyn = dynamic(() => import("@/components/CompleteDealModalForDeal"), { ssr: false });
import MoneyInput from "@/components/MoneyInput";
import { maskKzPhone, phoneToWa } from "@/components/PhoneInput";
import { formatMoney } from "@/lib/format";
import { type Deal, type DealFormValues, DEAL_STATUSES, completedColors, DEAL_TABLE_MAP, normalizeDealCategory } from "@/lib/deal-types";
import PillSettingsGear, { usePillVisibility } from "@/components/PillSettingsGear";
import { useProfile } from "@/lib/profile-context";
import { getReference } from "@/lib/ref-cache";

const TYPE_LABELS: Record<string, string> = {
  kvartiry: "Квартиры",
  pomescheniya: "Помещения",
  zemlya: "Земля",
};

function getDealTypeLabel(id: string, category?: string): string {
  return id === "zemlya" && category === "arenda" ? "Дома" : TYPE_LABELS[id] || id;
}

function objectTypeLabel(type?: string): string {
  if (type === "Квартира" || type === "Квартиры") return "Квартира";
  if (type === "Помещение" || type === "Помещения") return "Помещение";
  if (type === "Дома" || type === "Дом") return "Дом";
  if (type === "Земля" || type === "Участок") return "Участок";
  return type || "—";
}

function dealKindLabel(category?: string): string {
  if (!category) return "—";
  if (category === "arenda") return "Аренда";
  if (category === "prodaja" || category === "pokupka") return "Продажа";
  return category;
}

const STATUS_STAT_COLORS: Record<string, string> = {
  "В процессе": "text-yellow-600",
  "Завершено": "text-green-600",
  "Отказ": "text-red-500",
  "Заморожено": "text-blue-600",
  "Подписание договора": "text-indigo-600",
  "Оплата": "text-cyan-600",
  "VIP Клиент": "text-amber-600",
  "Перспективный": "text-emerald-600",
  "Думает": "text-orange-600",
  "Проблемный": "text-rose-600",
  "Новый собственник": "text-violet-600",
  "Оценка объекта": "text-sky-600",
  "Заключение договора": "text-indigo-600",
  "Упаковка + Маркетинг": "text-teal-600",
  "Сделка": "text-green-600",
};

function parseDateStr(s: string): number {
  const parts = (s || "").split(" ");
  const datePart = parts[0] || "";
  const timePart = parts[1] || "00:00";
  const [h = "0", m = "0"] = timePart.split(":");
  const ru = datePart.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ru) return new Date(Number(ru[3]), Number(ru[2]) - 1, Number(ru[1]), Number(h), Number(m)).getTime();
  const iso = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), Number(h), Number(m)).getTime();
  return NaN;
}

function smartMatch(field: string | undefined | null, query: string): boolean {
  if (!query) return true;
  if (!field) return false;
  const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const cleanField = normalize(field);
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return words.every(word => cleanField.includes(word));
}

// ====== FORM MODAL (вынесена в DealFormModal) ======

function DealsContent({ dealType, category, onBack }: { dealType?: string; category?: string; onBack?: () => void }) {
  const isPomescheniya = dealType === "pomescheniya";
  const isZemlya = dealType === "zemlya";
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [viewDeal, setViewDeal] = useState<Deal | null>(null);

  const dealsRouter = useRouter();
  const dealsPathname = usePathname();
  const dealsSearchParams = useSearchParams();

  // Глубокая ссылка из уведомления: ?view=<id> открывает карточку сделки
  const dealViewParam = dealsSearchParams.get("view");
  const [lastDealViewParam, setLastDealViewParam] = useState<string | null>(null);
  if (dealViewParam && dealViewParam !== lastDealViewParam && deals.length > 0) {
    setLastDealViewParam(dealViewParam);
    const target = deals.find(d => d.id === Number(dealViewParam));
    if (target) setViewDeal(target);
  } else if (!dealViewParam && lastDealViewParam) {
    // URL уже почищен закрытием — сбрасываем guard для повторного клика
    setLastDealViewParam(null);
  }

  const closeViewDeal = useCallback(() => {
    setViewDeal(null);
    // lastDealViewParam НЕ сбрасываем: иначе карточка переоткрывается,
    // пока router.replace чистит URL (приходилось закрывать дважды)
    const params = new URLSearchParams(dealsSearchParams.toString());
    if (params.has("view")) {
      params.delete("view");
      const qs = params.toString();
      dealsRouter.replace(dealsPathname + (qs ? "?" + qs : ""));
    }
  }, [dealsSearchParams, dealsPathname, dealsRouter]);
  useEscapeKey(closeViewDeal, viewDeal !== null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const dealPillVis = usePillVisibility("deals");
  const [filterClient, setFilterClient] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterRooms, setFilterRooms] = useState("");
  const [filterAreaMin, setFilterAreaMin] = useState("");
  const [filterAreaMax, setFilterAreaMax] = useState("");
  const [filterAddress, setFilterAddress] = useState("");
  const [filterJk, setFilterJk] = useState("");
  const [filterBroker, setFilterBroker] = useState("");
  const [filterAmountMin, setFilterAmountMin] = useState("");
  const [filterAmountMax, setFilterAmountMax] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [districtOptions, setDistrictOptions] = useState<string[]>(SHYMKENT_DISTRICTS);
  const [jkOptions, setJkOptions] = useState<string[]>(SHYMKENT_JK);

  // Режим удаления
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const totalCols = (isZemlya ? 11 : isPomescheniya ? 14 : 10) + (deleteMode ? 1 : 0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [completeDealTarget, setCompleteDealTarget] = useState<Deal | null>(null);
  const [showTask, setShowTask] = useState(false);
  const dragRef = useRef(false);

  useEffect(() => {
    const up = () => { dragRef.current = false; };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  useEffect(() => {
    getReference("districts").then(d => { if (d.length) setDistrictOptions(d); });
    getReference("residential-complexes").then(c => { if (c.length) setJkOptions(c); });
  }, []);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleRowContextMenu = (e: React.MouseEvent, id: number) => {
    if (!deleteMode) return;
    e.preventDefault();
    toggleSelect(id);
  };

  const handleRowPointerDown = (e: React.PointerEvent, id: number) => {
    if (!deleteMode || e.button !== 0) return;
    e.preventDefault();
    dragRef.current = true;
    toggleSelect(id);
  };

  const handleRowPointerEnter = (id: number) => {
    if (!deleteMode || !dragRef.current) return;
    toggleSelect(id);
  };

  const exitDeleteMode = () => {
    setDeleteMode(false);
    setSelectedIds(new Set());
  };

  const hasActiveFilters = filterStage || filterClient || filterDistrict || filterRooms || filterAreaMin || filterAreaMax || filterAddress || filterJk || filterBroker || filterAmountMin || filterAmountMax || filterDateFrom || filterDateTo;

  const resetAllFilters = () => {
    setSearchQuery("");
    setFilterStage("");
    setFilterClient("");
    setFilterDistrict("");
    setFilterRooms("");
    setFilterAreaMin("");
    setFilterAreaMax("");
    setFilterAddress("");
    setFilterJk("");
    setFilterBroker("");
    setFilterAmountMin("");
    setFilterAmountMax("");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const fetchDeals = useCallback(() => {
    const url = dealType
      ? "/api/deals?type=" + dealType + (category ? "&category=" + category : "")
      : "/api/deals";
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setDeals(data);
        else if (data.error) setError(data.error);
      })
      .catch(err => setError(err instanceof Error ? err.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [dealType, category]);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  const stageBase = useMemo(() => {
    let result = deals;
    if (searchQuery) {
      result = result.filter(d =>
        smartMatch(d.name, searchQuery) || smartMatch(d.phone, searchQuery) || smartMatch(d.district, searchQuery) || smartMatch(d.broker, searchQuery) || smartMatch(d.address, searchQuery) || smartMatch(d.jk, searchQuery)
      );
    }
    if (filterClient) {
      result = result.filter(d => smartMatch(d.name, filterClient));
    }
    if (filterDistrict) {
      result = result.filter(d => smartMatch(d.district, filterDistrict));
    }
    if (filterRooms) result = result.filter(d => (d.rooms || "").trim().startsWith(filterRooms));
    if (filterAreaMin) result = result.filter(d => Number(d.area) >= Number(filterAreaMin));
    if (filterAreaMax) result = result.filter(d => Number(d.area) <= Number(filterAreaMax));
    if (filterAddress) {
      result = result.filter(d => smartMatch(d.address, filterAddress));
    }
    if (filterJk) {
      result = result.filter(d => smartMatch(d.jk, filterJk));
    }
    if (filterBroker) {
      result = result.filter(d => smartMatch(d.broker, filterBroker));
    }
    if (filterAmountMin) result = result.filter(d => d.amount >= Number(filterAmountMin));
    if (filterAmountMax) result = result.filter(d => d.amount <= Number(filterAmountMax));
    if (filterDateFrom) {
      const t = parseDateStr(filterDateFrom);
      if (!isNaN(t)) result = result.filter(d => parseDateStr(d.date) >= t);
    }
    if (filterDateTo) {
      const t = parseDateStr(filterDateTo);
      if (!isNaN(t)) result = result.filter(d => parseDateStr(d.date) <= t);
    }
    return result;
  }, [deals, searchQuery, filterClient, filterDistrict, filterRooms, filterAreaMin, filterAreaMax, filterAddress, filterJk, filterBroker, filterAmountMin, filterAmountMax, filterDateFrom, filterDateTo]);

  const filtered = useMemo(() => {
    if (filterStage) return stageBase.filter(d => d.completed === filterStage);
    // Без фильтров показываем всё, включая завершённые
    return stageBase;
  }, [stageBase, filterStage]);

  const handleAdd = async (data: DealFormValues) => {
    setSaveError(null);
    const res = await fetch("/api/deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) {
      const newDeal = await res.json();
      setDeals(prev => [newDeal, ...prev]);
      setShowAdd(false);
    } else {
      const err = await res.json().catch(() => ({}));
      setSaveError(err.error || "Ошибка сохранения");
    }
  };

  const handleEdit = async (data: DealFormValues) => {
    if (!editDeal) return;
    setSaveError(null);
    const res = await fetch("/api/deals/" + editDeal.id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, type: dealType, category: category }) });
    if (res.ok) {
      const updated = await res.json();
      setDeals(prev => prev.map(d => d.id === updated.id ? updated : d));
      setEditDeal(null);
    } else {
      const err = await res.json().catch(() => ({}));
      setSaveError(err.error || "Ошибка сохранения");
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch("/api/deals/" + id + "?type=" + dealType, { method: "DELETE" });
    if (res.ok) setDeals(prev => prev.filter(d => d.id !== id));
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every(d => selectedIds.has(d.id));
  const handleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) filtered.forEach(d => next.delete(d.id));
      else filtered.forEach(d => next.add(d.id));
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/deals", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [...selectedIds], type: dealType, category: category }) });
      if (res.ok) {
        setDeals(prev => prev.filter(d => !selectedIds.has(d.id)));
        exitDeleteMode();
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div>
      {saveError && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <span>Не удалось сохранить: {saveError}</span>
          <button onClick={() => setSaveError(null)} className="text-red-500 hover:text-red-700 shrink-0"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div>
          {onBack && (
            <button onClick={onBack} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium mb-2 rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all">
              <ArrowLeft className="w-4 h-4" />Назад к категориям
            </button>
          )}
          <h1 className="text-xl font-bold text-gray-900">Сделки · {category ? (DEAL_CATEGORY_LABELS[category] || category) : ""}{dealType ? " · " + getDealTypeLabel(dealType, category) : ""}</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">Сделки создаются автоматически при завершении клиента</p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск по имени, телефону, району, брокеру..." className="pl-10 h-9 text-sm bg-white" />
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
        <Button variant={showFilters || hasActiveFilters ? "default" : "outline"} size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1"><Filter className="w-4 h-4" />Фильтры{hasActiveFilters && <span className="ml-1 w-2 h-2 rounded-full bg-blue-500" />}</Button>
        {!deleteMode ? (
          <Button variant="outline" size="sm" onClick={() => { setDeleteMode(true); setSelectedIds(new Set()); }} className="gap-1 text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4" />Удалить
          </Button>
        ) : (
          <>
            <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)} disabled={selectedIds.size === 0 || deleting} className="gap-1">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Удалить ({selectedIds.size})
            </Button>
            <Button variant="ghost" size="sm" onClick={exitDeleteMode} className="gap-1 text-gray-500">
              <X className="w-4 h-4" />Отмена
            </Button>
          </>
        )}
      </div>

      {deleteMode && (
        <div className="mb-4 flex items-center gap-2 text-xs text-gray-500 bg-blue-50/60 border border-blue-100 rounded-lg px-3 py-2">
          <CheckSquare className="w-4 h-4 text-blue-500 shrink-0" />
          Режим удаления: правый клик — выделить строку, зажмите левую кнопку и скролльте — выделить несколько
        </div>
      )}

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-4 p-4 bg-white rounded-xl border shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-20 shrink-0">Статус</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: "", label: "Активные" },
                ...DEAL_STATUSES.map(s => ({ value: s, label: s })),
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilterStage(opt.value)}
                  className={
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all " +
                    (filterStage === opt.value
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50")
                  }
                >
                  {opt.label}
                  {filterStage === opt.value && <Check className="w-3 h-3 inline ml-1" />}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Клиент</label>
              <Input value={filterClient} onChange={e => setFilterClient(e.target.value)} placeholder="Имя" className="h-9 text-sm bg-white" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Район</label>
              <Combobox value={filterDistrict} onChange={setFilterDistrict} options={districtOptions} placeholder="Любой" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Адрес</label>
              <Input value={filterAddress} onChange={e => setFilterAddress(e.target.value)} placeholder="Улица, дом" className="h-9 text-sm bg-white" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Жилой комплекс</label>
              <Combobox value={filterJk} onChange={setFilterJk} options={jkOptions} placeholder="Любой" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Брокер</label>
              <Input value={filterBroker} onChange={e => setFilterBroker(e.target.value)} placeholder="Брокер" className="h-9 text-sm bg-white" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Комнат</label>
              <Combobox value={filterRooms} onChange={setFilterRooms} options={["1", "2", "3", "4", "5"]} placeholder="Любые" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Площадь, м²</label>
              <div className="flex items-center gap-2">
                <Input value={filterAreaMin} onChange={e => setFilterAreaMin(e.target.value)} placeholder="От" type="number" className="h-9 w-full text-sm" />
                <span className="text-xs text-gray-400">—</span>
                <Input value={filterAreaMax} onChange={e => setFilterAreaMax(e.target.value)} placeholder="До" type="number" className="h-9 w-full text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Сумма сделки, ₸</label>
              <div className="flex items-center gap-2">
                <MoneyInput value={filterAmountMin} onChange={setFilterAmountMin} placeholder="От" className="w-full h-9" />
                <span className="text-xs text-gray-400">—</span>
                <MoneyInput value={filterAmountMax} onChange={setFilterAmountMax} placeholder="До" className="w-full h-9" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Дата обращения</label>
              <div className="flex items-center gap-2">
                <DatePicker value={filterDateFrom} onChange={setFilterDateFrom} placeholder="От" />
                <span className="text-xs text-gray-400">—</span>
                <DatePicker value={filterDateTo} onChange={setFilterDateTo} placeholder="До" />
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="pt-2 border-t">
              <button onClick={resetAllFilters} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
                <X className="w-3 h-3" /> Сбросить все фильтры
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stats — клик по статусу фильтрует таблицу, повторный клик снимает */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <PillSettingsGear statuses={DEAL_STATUSES} hidden={dealPillVis.hidden} onToggle={dealPillVis.toggle} onReset={dealPillVis.reset} />
        <button
          type="button"
          onClick={() => setFilterStage("")}
          title="Показать все, кроме завершённых"
          className="flex items-center gap-1.5 rounded-full bg-blue-600 text-white px-3 py-1 text-xs font-medium hover:bg-blue-700 transition-colors"
        >
          <span>Всего</span>
          <span className="font-bold">
            {filtered.length}
            {stageBase.length !== filtered.length && (
              <span className="font-normal opacity-70"> из {stageBase.length}</span>
            )}
          </span>
        </button>
        {DEAL_STATUSES.filter(s => !dealPillVis.hidden.includes(s) || filterStage === s).map(s => {
          const count = stageBase.filter(d => d.completed === s).length;
          const active = filterStage === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStage(active ? "" : s)}
              title={active ? "Снять фильтр" : "Показать только «" + s + "»"}
              className={
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors "
                + (active
                  ? "bg-blue-50 border border-blue-300 text-blue-700 font-medium"
                  : "bg-white border border-gray-200 text-gray-500 hover:border-blue-200 hover:text-gray-800")
              }
            >
              <span className="w-2 h-2 rounded-full bg-gray-300"></span>
              <span>{s}</span>
              <span className={"font-bold " + (STATUS_STAT_COLORS[s] || "text-gray-900")}>{count}</span>
            </button>
          );
        })}
      </div>

      {loading && <div className="bg-white rounded-xl shadow-sm border p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /><p className="text-gray-500 mt-2">Загрузка из Supabase...</p></div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">Ошибка: {error}<button onClick={() => { setLoading(true); setError(null); fetchDeals(); }} className="ml-3 underline text-red-600 hover:text-red-800">Повторить</button></div>}

      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border">
            <div className="table-scroll overflow-y-auto max-h-[calc(100vh-280px)]">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  {deleteMode && (
                    <th className="px-4 py-3 w-10 sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">
                      <button onClick={handleSelectAll} className="text-gray-500 hover:text-blue-600 transition-colors" title={allVisibleSelected ? "Снять выделение" : "Выделить все"}>
                        {allVisibleSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                      </button>
                    </th>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase rounded-tl-xl sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300"></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Клиент</th>
                  {isZemlya ? (
                    <>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Телефон</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Участок под</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Площадь</th>
                    </>
                  ) : isPomescheniya ? (
                    <>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Площадь</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Адрес</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Планировка</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Меблировка</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Кто арендует</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Оплата</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Площадь</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Адрес</th>
                    </>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Брокер</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Сумма сделки</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Дата обращения</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Дата завершения</th>
                  <th className="px-4 py-3 w-12 sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300 rounded-tr-xl"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 [&>tr:last-child>td:first-child]:rounded-bl-xl [&>tr:last-child>td:last-child]:rounded-br-xl">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={totalCols} className="px-6 py-16 text-center text-gray-400">
                      <p className="text-lg">Нет сделок</p>
                      <p className="text-sm mt-1">{deals.length === 0 ? "Нажмите «Новая сделка»" : "Попробуйте изменить фильтры"}</p>
                      {deals.length > 0 && <button onClick={resetAllFilters} className="mt-2 text-blue-500 hover:text-blue-600 text-sm">Сбросить фильтры</button>}
                    </td>
                  </tr>
                )}
                {filtered.map(d => {
                  const isSelected = selectedIds.has(d.id);
                  return (
                  <tr
                    key={d.id}
                    onContextMenu={e => handleRowContextMenu(e, d.id)}
                    onPointerDown={e => handleRowPointerDown(e, d.id)}
                    onPointerEnter={() => handleRowPointerEnter(d.id)}
                    onClick={() => { if (!deleteMode) { setViewDeal(d); } }}
                    className={
                      (deleteMode ? "cursor-pointer " : "cursor-pointer ") +
                      (isSelected ? "bg-red-100 hover:bg-red-200 " : deleteMode ? "hover:bg-red-100/50 " : "hover:bg-blue-50/40 ") +
                      "transition-colors group"
                    }
                  >
                    {deleteMode && (
                      <td className="px-4 py-3">
                        <button
                          onPointerDown={e => e.stopPropagation()}
                          onContextMenu={e => e.stopPropagation()}
                          onClick={e => { e.stopPropagation(); toggleSelect(d.id); }}
                          className="text-gray-500 hover:text-blue-600 transition-colors"
                        >
                          {isSelected ? <CheckSquare className="w-4 h-4 text-red-500" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                    )}
                    <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                      {d.phone ? (
                        <a
                          href={`https://wa.me/${phoneToWa(d.phone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                          title="Написать в WhatsApp"
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </a>
                      ) : (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 text-gray-300">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.name || "—"}</td>
                    {isZemlya ? (
                      <>
                        <td className="px-4 py-3 text-sm text-gray-600">{d.phone ? maskKzPhone(d.phone) : "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{d.plot_type || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{d.area ? d.area + " " + (d.area_unit || "сот") : "—"}</td>
                      </>
                    ) : null}
                    {isZemlya ? null : isPomescheniya ? (
                      <>
                        <td className="px-4 py-3 text-sm text-gray-600">{d.area ? d.area + " м²" : "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{d.address || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{d.layout || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{d.furniture || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{d.renter_type || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{d.payment || "—"}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm text-gray-600">{d.area ? d.area + " м²" : "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{d.address || "—"}</td>
                      </>
                    )}
                    <td className="px-4 py-3 text-sm text-gray-600">{d.broker || "—"}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {d.amount ? formatMoney(d.amount) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{d.date || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge className={"text-xs " + (completedColors[d.completed || ""] || "bg-gray-100 text-gray-700")}>
                        {d.completed || "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{d.completion_date || "—"}</td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      {!deleteMode && (
                        <DropdownMenu>
                          <DropdownMenuTrigger onPointerDown={e => e.stopPropagation()} className="inline-flex shrink-0 items-center justify-center rounded-[min(var(--radius-md),12px)] border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none hover:bg-gray-100 hover:text-gray-700 size-7">
                            <MoreHorizontal className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => { setViewDeal(d); }}>
                              <Eye className="w-4 h-4 mr-2" />Просмотр
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setViewDeal(d); setShowTask(true); }}>
                              <ListTodo className="w-4 h-4 mr-2" />Назначить задачу
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditDeal({ ...d })}>
                              <Edit3 className="w-4 h-4 mr-2" />Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(d.id)} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                              <Trash2 className="w-4 h-4 mr-2" />Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          <div className="border-t bg-gray-50/50 px-4 py-2.5 text-xs text-gray-400 flex items-center justify-between rounded-b-xl">
            <span>Показано: {filtered.length} из {deals.length} сделок</span>
            {hasActiveFilters && (
              <button onClick={resetAllFilters} className="text-blue-500 hover:text-blue-600">Сбросить всё</button>
            )}
          </div>
        </div>
      )}

      {showAdd && <DealFormModal onClose={() => setShowAdd(false)} onSave={handleAdd} dealType={dealType} category={category} />}
      {editDeal && <DealFormModal deal={editDeal} onClose={() => setEditDeal(null)} onSave={handleEdit} />}

      {viewDeal && (
        <DealViewModal
          deal={viewDeal}
          dealType={dealType}
          category={category}
          onClose={closeViewDeal}
          onEdit={d => { closeViewDeal(); setEditDeal({ ...d }); }}
          onAssign={() => setShowTask(true)}
          onComplete={d => setCompleteDealTarget(d)}
        />
      )}
      {/* ====== OLD VIEW BODY REMOVED (see DealViewModal) ====== */}

      <ConfirmDialog
        open={confirmDelete}
        title="Удаление сделок"
        message={`Удалить ${selectedIds.size} ${selectedIds.size === 1 ? "сделку" : "сделок"}?`}
        hint="Действие необратимо."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      {showTask && viewDeal && (
        <AssignTaskModalDyn clientName={viewDeal.name || ""} onClose={() => setShowTask(false)} />
      )}

      {completeDealTarget && (
        <CompleteDealModalForDealDyn
          deal={completeDealTarget}
          dealType={dealType}
          category={category}
          onClose={() => setCompleteDealTarget(null)}
          onDone={() => { setCompleteDealTarget(null); closeViewDeal(); fetchDeals(); }}
        />
      )}
    </div>
  );
}

export default function DealsPage() {
  return (
    <Suspense fallback={<div className="p-6"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
      <DealsPageInner />
    </Suspense>
  );
}

const VALID_CATEGORIES = ["arenda", "pokupka"];
const VALID_TYPES = ["kvartiry", "pomescheniya", "zemlya"];

function DealsPageInner() {
  const router = useRouter();
  const { currentProfile } = useProfile();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (currentProfile && currentProfile.role !== "admin") router.replace("/overview");
  }, [currentProfile, router]);

  if (currentProfile && currentProfile.role !== "admin") return null;

  const categoryParam = searchParams.get("category");
  const typeParam = searchParams.get("type");

  // Legacy-ссылки с ?category=prodaja нормализуются в pokupka
  const normalizedCategoryParam = categoryParam ? normalizeDealCategory(categoryParam) : null;
  const selectedCategory: string | null = normalizedCategoryParam && VALID_CATEGORIES.includes(normalizedCategoryParam) ? normalizedCategoryParam : null;
  const selectedType: string | null = VALID_TYPES.includes(typeParam ?? "") ? typeParam! : null;

  const handleSelectCategory = (cat: string) => {
    router.replace("/deals?category=" + cat);
  };

  const handleSelectType = (type: string) => {
    router.replace("/deals?category=" + selectedCategory + "&type=" + type);
  };

  if (!selectedCategory) {
    return <DealCategorySelector onSelect={handleSelectCategory} />;
  }

  if (!selectedType) {
    return (
      <DealTypeSelector
        category={selectedCategory}
        onSelect={handleSelectType}
        onBack={() => router.replace("/deals")}
      />
    );
  }

  return (
    <DealsContent
      dealType={selectedType}
      category={selectedCategory}
      onBack={() => router.replace("/deals?category=" + selectedCategory)}
    />
  );
}
