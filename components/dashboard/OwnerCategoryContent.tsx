"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useEscapeKey } from "@/lib/use-escape";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Trash2, Edit3, Filter, X, Eye, Phone, MapPin, Home, CalendarDays, Banknote, FileText, User, Ruler, Building, Loader2, ArrowLeft, Check, ChevronDown, CheckSquare, Square, CheckCircle2 } from "lucide-react";
import Combobox from "@/components/Combobox";
import DatePicker from "@/components/DatePicker";
import MoneyInput from "@/components/MoneyInput";
import { maskKzPhone } from "@/components/PhoneInput";
import PillSettingsGear, { usePillVisibility } from "@/components/PillSettingsGear";
import { formatMoney, formatDateOnly } from "@/lib/format";
import { useProfile, profileName } from "@/lib/profile-context";
import { OWNER_CATEGORY_LABELS, type OwnerCategory } from "@/components/dashboard/OwnerCategorySelector";
import { type Owner, OWNER_STATUSES, completedColors } from "@/lib/owner-types";
import { getInitials } from "@/lib/client-types";
// Модалки собственников — отдельными чанками: грузятся только при открытии
const OwnerFormModal = dynamic(() => import("@/components/OwnerFormModal"), { ssr: false });
const OwnerCompleteDealModal = dynamic(() => import("@/components/OwnerCompleteDealModal"), { ssr: false });
const ViewOwnerModal = dynamic(() => import("@/components/OwnerViewModal"), { ssr: false });

const STATUS_STAT_COLORS: Record<string, string> = {
  "Новый собственник": "text-violet-600",
  "Оценка объекта": "text-sky-600",
  "Заключение договора": "text-indigo-600",
  "Упаковка + Маркетинг": "text-teal-600",
  "Сделка": "text-green-600",
};

const OWNER_TO_DEAL_TYPE: Record<OwnerCategory, string> = {
  kvartiry: "kvartiry",
  pomescheniya: "pomescheniya",
  doma: "zemlya",
  zemlya: "zemlya",
};

const OWNER_TO_DEAL_TYPE_LABEL: Record<OwnerCategory, string> = {
  kvartiry: "Квартира",
  pomescheniya: "Помещение",
  doma: "Дом",
  zemlya: "Земля",
};

function parseDateStr(s: string): number {
  const ru = (s || "").match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ru) return new Date(Number(ru[3]), Number(ru[2]) - 1, Number(ru[1])).getTime();
  const iso = (s || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).getTime();
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

// ====== FORM MODAL (вынесена в OwnerFormModal) ======
// ====== COMPLETE DEAL MODAL (вынесена в OwnerCompleteDealModal) ======
// ====== VIEW MODAL ======
// ====== VIEW MODAL (вынесена в OwnerViewModal) ======

// ====== MAIN CONTENT ======
export default function OwnerCategoryContent({ category, onBack }: { category: OwnerCategory; onBack?: () => void }) {
  const { allProfiles } = useProfile();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editOwner, setEditOwner] = useState<Owner | null>(null);
  const [viewOwner, setViewOwner] = useState<Owner | null>(null);
  const [completeOwner, setCompleteOwner] = useState<Owner | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Глубокая ссылка из уведомления: ?view=<id> открывает карточку собственника
  const viewParam = searchParams.get("view");
  const [lastViewParam, setLastViewParam] = useState<string | null>(null);
  if (viewParam && viewParam !== lastViewParam && owners.length > 0) {
    setLastViewParam(viewParam);
    const target = owners.find(o => o.id === Number(viewParam));
    if (target) setViewOwner(target);
  }

  const closeViewOwner = useCallback(() => {
    setViewOwner(null);
    setLastViewParam(null);
    const params = new URLSearchParams(searchParams.toString());
    if (params.has("view")) {
      params.delete("view");
      const qs = params.toString();
      router.replace(pathname + (qs ? "?" + qs : ""));
    }
  }, [searchParams, pathname, router]);
  useEscapeKey(closeViewOwner, viewOwner !== null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterBroker, setFilterBroker] = useState("");
  const [filterRooms, setFilterRooms] = useState("");
  const [filterJk, setFilterJk] = useState("");
  const [filterAddress, setFilterAddress] = useState("");
  const [filterAreaMin, setFilterAreaMin] = useState("");
  const [filterAreaMax, setFilterAreaMax] = useState("");
  const [filterAmountMin, setFilterAmountMin] = useState("");
  const [filterAmountMax, setFilterAmountMax] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const uniqueDistricts = useMemo(() => [...new Set(owners.map(o => o.district).filter((d): d is string => Boolean(d)))].sort(), [owners]);
  const uniqueJk = useMemo(() => [...new Set(owners.map(o => o.jk).filter((d): d is string => Boolean(d)))].sort(), [owners]);
  const roomsFilterOptions = ["1", "2", "3", "4", "5"];
  const brokerNames = useMemo(() => allProfiles.map(p => profileName(p)).filter(Boolean).sort(), [allProfiles]);

  const hasActiveFilters = filterName || filterStatus || filterDistrict || filterBroker || filterRooms || filterJk || filterAddress || filterAreaMin || filterAreaMax || filterAmountMin || filterAmountMax || filterDateFrom || filterDateTo;

  const resetAllFilters = () => {
    setFilterName("");
    setFilterStatus("");
    setFilterDistrict("");
    setFilterBroker("");
    setFilterRooms("");
    setFilterJk("");
    setFilterAddress("");
    setFilterAreaMin("");
    setFilterAreaMax("");
    setFilterAmountMin("");
    setFilterAmountMax("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSearchQuery("");
  };

  const fetchOwners = () => {
    fetch("/api/owners?category=" + category)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setOwners(data);
        else if (data.error) setError(data.error);
      })
      .catch(err => setError(err instanceof Error ? err.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOwners(); }, [category]);

  const stageBase = useMemo(() => {
    let result = owners;
    if (searchQuery) {
      result = result.filter(o =>
        smartMatch(o.name, searchQuery) || smartMatch(o.phone, searchQuery) || smartMatch(o.district, searchQuery) || smartMatch(o.address, searchQuery) || smartMatch(o.jk, searchQuery) || smartMatch(o.broker, searchQuery)
      );
    }
    if (filterName) result = result.filter(o => smartMatch(o.name, filterName));
    if (filterDistrict) result = result.filter(o => o.district === filterDistrict);
    if (filterBroker) result = result.filter(o => o.broker === filterBroker);
    if (filterRooms) result = result.filter(o => (o.rooms || "").trim().startsWith(filterRooms));
    if (filterJk) result = result.filter(o => o.jk === filterJk);
    if (filterAddress) result = result.filter(o => smartMatch(o.address, filterAddress));
    if (filterAreaMin) result = result.filter(o => Number(o.area || (o.house_area || o.land_area)) >= Number(filterAreaMin));
    if (filterAreaMax) result = result.filter(o => Number(o.area || (o.house_area || o.land_area)) <= Number(filterAreaMax));
    if (filterAmountMin) result = result.filter(o => (o.price || 0) >= Number(filterAmountMin));
    if (filterAmountMax) result = result.filter(o => (o.price || 0) <= Number(filterAmountMax));
    if (filterDateFrom) {
      const t = parseDateStr(filterDateFrom);
      if (!isNaN(t)) result = result.filter(o => {
        const d = parseDateStr(o.date || "");
        const ts = isNaN(d) ? new Date(o.created_at).getTime() : d;
        return ts >= t;
      });
    }
    if (filterDateTo) {
      const t = parseDateStr(filterDateTo);
      if (!isNaN(t)) result = result.filter(o => {
        const d = parseDateStr(o.date || "");
        const ts = isNaN(d) ? new Date(o.created_at).getTime() : d;
        return ts <= t;
      });
    }
    return result;
  }, [owners, searchQuery, filterName, filterDistrict, filterBroker, filterRooms, filterJk, filterAddress, filterAreaMin, filterAreaMax, filterAmountMin, filterAmountMax, filterDateFrom, filterDateTo]);

  const filtered = useMemo(() => {
    if (filterStatus) return stageBase.filter(o => (o.status || "Без статуса") === filterStatus);
    return stageBase;
  }, [stageBase, filterStatus]);

  const ownerStatusList = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of owners) {
      const s = o.status || "Без статуса";
      m.set(s, (m.get(s) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  }, [owners]);

  const pillVis = usePillVisibility("owners");
  const visibleStatuses = ownerStatusList.filter(s => !pillVis.hidden.includes(s) || filterStatus === s);

  const handleAdd = async (data: Record<string, unknown>) => {
    setShowAdd(false);
    setSaveError(null);
    const temp: Owner = { ...data, id: -Date.now(), created_at: new Date().toISOString() } as Owner;
    setOwners(prev => [temp, ...prev]);
    try {
      const res = await fetch("/api/owners?category=" + category, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json()).error || "Ошибка сохранения");
      const newOwner = await res.json();
      setOwners(prev => prev.map(o => o.id === temp.id ? newOwner : o));
    } catch (err) {
      setOwners(prev => prev.filter(o => o.id !== temp.id));
      setSaveError(err instanceof Error ? err.message : "Ошибка сохранения");
    }
  };

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editOwner) return;
    const original = editOwner;
    const optimistic: Owner = { ...original, ...data };
    setEditOwner(null);
    setViewOwner(null);
    setSaveError(null);
    setOwners(prev => prev.map(o => o.id === original.id ? optimistic : o));
    try {
      const res = await fetch("/api/owners/" + original.id + "?category=" + category, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json()).error || "Ошибка сохранения");
      const updated = await res.json();
      setOwners(prev => prev.map(o => o.id === updated.id ? updated : o));
    } catch (err) {
      setOwners(prev => prev.map(o => o.id === original.id ? original : o));
      setSaveError(err instanceof Error ? err.message : "Ошибка сохранения");
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch("/api/owners/" + id + "?category=" + category, { method: "DELETE" });
    if (res.ok) setOwners(prev => prev.filter(o => o.id !== id));
  };

  const handleComplete = async (data: { contract: string; amount: number; completion_date: string }) => {
    if (!completeOwner) return;
    const original = completeOwner;
    const dealType = OWNER_TO_DEAL_TYPE[category];
    const typeLabel = OWNER_TO_DEAL_TYPE_LABEL[category];
    try {
      const updRes = await fetch("/api/owners/" + original.id + "?category=" + category, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Сделка" }),
      });
      if (!updRes.ok) throw new Error("Не удалось обновить собственника");

      const dealRes = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealType,
          category: "pokupka",
          type: typeLabel,
          name: original.name || "Сделка",
          client: original.name || "",
          amount: data.amount,
          stage: "Сделка закрыта",
          completed: "Завершено",
          date: data.completion_date,
          contract: data.contract,
          phone: original.phone || "",
          district: original.district || "",
          rooms: original.rooms || "",
          area: category === "doma" ? (original.house_area || "") : (original.area || ""),
          address: original.address || "",
          jk: original.jk || "",
          broker: original.broker || "",
          area_unit: category === "doma" ? "м²" : (original.area_unit || "сот"),
          notes: original.notes || "",
          completion_date: data.completion_date,
        }),
      });
      if (!dealRes.ok) throw new Error("Не удалось создать сделку");
      await dealRes.json();

      setOwners(prev => prev.map(o => o.id === original.id ? { ...o, status: "Сделка" } : o));
      setCompleteOwner(null);
      setViewOwner(null);
      setSaveError(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Ошибка");
      setCompleteOwner(null);
    }
  };

  const colCount = category === "kvartiry" ? 9 : category === "pomescheniya" ? 12 : category === "doma" ? 11 : 9;

  return (
    <div>
      {saveError && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <span>Не удалось сохранить: {saveError}</span>
          <button onClick={() => setSaveError(null)} className="text-red-500 hover:text-red-700 shrink-0"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          {onBack && (
            <button onClick={onBack} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium mb-2 rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all">
              <ArrowLeft className="w-4 h-4" />Назад к категориям
            </button>
          )}
          <h1 className="text-xl font-bold text-gray-900">Собственники · {OWNER_CATEGORY_LABELS[category]}</h1>
        </div>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" />Добавить собственника
        </Button>
      </div>

      {/* Search + Filters bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Поиск по имени, телефону, району, брокеру..."
            className="pl-10 h-9 text-sm bg-white"
          />
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
        <Button
          variant={showFilters || hasActiveFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-1"
        >
          <Filter className="w-4 h-4" />
          Фильтры
          {hasActiveFilters && <span className="ml-1 w-2 h-2 rounded-full bg-blue-500" />}
        </Button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-4 p-4 bg-white rounded-xl border shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-20 shrink-0">Статус</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: "", label: "Все" },
                ...OWNER_STATUSES.map(s => ({ value: s, label: s })),
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilterStatus(opt.value)}
                  className={
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all " +
                    (filterStatus === opt.value
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50")
                  }
                >
                  {opt.label}
                  {filterStatus === opt.value && <Check className="w-3 h-3 inline ml-1" />}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Собственник</label>
              <Input value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="Имя" className="h-9 text-sm bg-white" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Район</label>
              <Combobox value={filterDistrict} onChange={setFilterDistrict} options={uniqueDistricts} placeholder="Любой" />
            </div>
            {(category === "kvartiry" || category === "doma") && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Комнат</label>
                <Combobox value={filterRooms} onChange={setFilterRooms} options={roomsFilterOptions} placeholder="Любые" />
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Площадь, м²</label>
              <div className="flex items-center gap-2">
                <Input value={filterAreaMin} onChange={e => setFilterAreaMin(e.target.value)} placeholder="От" type="number" className="h-9 w-full text-sm" />
                <span className="text-xs text-gray-400">—</span>
                <Input value={filterAreaMax} onChange={e => setFilterAreaMax(e.target.value)} placeholder="До" type="number" className="h-9 w-full text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Адрес</label>
              <Input value={filterAddress} onChange={e => setFilterAddress(e.target.value)} placeholder="Улица, дом" className="h-9 text-sm bg-white" />
            </div>
            {category === "kvartiry" && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Жилой комплекс</label>
                <Combobox value={filterJk} onChange={setFilterJk} options={uniqueJk} placeholder="Любой" />
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Брокер</label>
              <Combobox value={filterBroker} onChange={setFilterBroker} options={brokerNames} placeholder={brokerNames.length ? "Любой" : "Нет сотрудников"} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Цена, ₸</label>
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

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <PillSettingsGear statuses={ownerStatusList} hidden={pillVis.hidden} onToggle={pillVis.toggle} onReset={pillVis.reset} />
        <button
          type="button"
          onClick={() => setFilterStatus("")}
          title="Снять фильтр по статусу"
          className="flex items-center gap-1.5 rounded-full bg-blue-600 text-white px-3 py-1 text-xs font-medium hover:bg-blue-700 transition-colors"
        >
          <span>Всего</span>
          <span className="font-bold">{owners.length}</span>
        </button>
        {visibleStatuses.map(s => {
          const count = stageBase.filter(o => (o.status || "Без статуса") === s).length;
          const active = filterStatus === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(active ? "" : s)}
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

      {/* Loading / Error */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
          <p className="text-gray-500 mt-2">Загрузка из Supabase...</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">
          Ошибка: {error}
          <button onClick={() => { setLoading(true); setError(null); fetchOwners(); }} className="ml-3 underline text-red-600 hover:text-red-800">Повторить</button>
        </div>
      )}

      {/* Owners table */}
      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="table-scroll overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
          <table className="w-full table-fixed text-left">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Дата</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Собственник</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Район</th>
                {category === "pomescheniya" && <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Тип</th>}
                {category === "pomescheniya" && <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Расположение</th>}
                {category === "pomescheniya" && <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Отделка</th>}
                {category === "doma" && <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Пл. дома</th>}
                {category === "doma" && <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Пл. участка</th>}
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Площадь</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Адрес</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Брокер</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Цена</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Статус</th>
                <th className="px-2 py-3 rounded-tr-xl sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 [&>tr:last-child>td:first-child]:rounded-bl-xl [&>tr:last-child>td:last-child]:rounded-br-xl">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="px-6 py-16 text-center text-gray-400">
                    <p className="text-lg">Нет собственников</p>
                    <p className="text-sm mt-1">{owners.length === 0 ? "Нажмите «Добавить собственника»" : "Попробуйте изменить фильтры"}</p>
                    {owners.length > 0 && (
                      <button onClick={resetAllFilters} className="mt-2 text-blue-500 hover:text-blue-600 text-sm">Сбросить фильтры</button>
                    )}
                  </td>
                </tr>
              )}
              {filtered.map(o => (
                <tr
                  key={o.id}
                  onClick={() => setViewOwner(o)}
                  className="cursor-pointer hover:bg-blue-50/40 transition-colors group"
                >
                  <td className="px-3 py-3 text-sm text-gray-500">{o.date ? formatDateOnly(o.date) : formatDateOnly(o.created_at)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                        {getInitials(o.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900">{o.name || "—"}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 shrink-0" />{o.phone ? maskKzPhone(o.phone) : "—"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600">{o.district || "—"}</td>
                  {category === "pomescheniya" && <td className="px-3 py-3 text-sm text-gray-600">{o.premise_type || "—"}</td>}
                  {category === "pomescheniya" && <td className="px-3 py-3 text-sm text-gray-500 break-words">{o.location_line || "—"}</td>}
                  {category === "pomescheniya" && <td className="px-3 py-3 text-sm text-gray-600">{o.finishing || "—"}</td>}
                  {category === "doma" && <td className="px-3 py-3 text-sm text-gray-600">{o.house_area ? o.house_area + " м²" : "—"}</td>}
                  {category === "doma" && <td className="px-3 py-3 text-sm text-gray-600">{o.land_area ? o.land_area + " сот" : "—"}</td>}
                  <td className="px-3 py-3 text-sm text-gray-600">
                    {o.area ? o.area + (category === "zemlya" ? " " + (o.area_unit || "сот") : " м²") : "—"}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-500 break-words">{o.address || "—"}</td>
                  <td className="px-3 py-3 text-sm text-gray-500 break-words">{o.broker || "—"}</td>
                  <td className="px-3 py-3 text-sm font-semibold text-gray-900" onClick={e => e.stopPropagation()}>
                    {o.price ? formatMoney(o.price) : "—"}
                  </td>
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <Badge className={"text-xs " + (completedColors[o.status || ""] || "bg-gray-100 text-gray-700")}>
                      {o.status || "—"}
                    </Badge>
                    {o.condition && <span className="block text-xs text-gray-500 mt-1">{o.condition}</span>}
                  </td>
                  <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center rounded-[min(var(--radius-md),12px)] border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none hover:bg-gray-100 hover:text-gray-700 size-7">
                        <MoreHorizontal className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => setViewOwner(o)}>
                          <Eye className="w-4 h-4 mr-2" />Просмотр
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditOwner(o)}>
                          <Edit3 className="w-4 h-4 mr-2" />Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(o.id)} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                          <Trash2 className="w-4 h-4 mr-2" />Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="border-t bg-gray-50/50 px-4 py-2.5 text-xs text-gray-400 flex items-center justify-between rounded-b-xl">
            <span>Показано: {filtered.length} из {owners.length} собственников</span>
            {hasActiveFilters && (
              <button onClick={resetAllFilters} className="text-blue-500 hover:text-blue-600">Сбросить всё</button>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showAdd && <OwnerFormModal category={category} onClose={() => setShowAdd(false)} onSave={handleAdd} />}
      {editOwner && <OwnerFormModal owner={editOwner} category={category} onClose={() => setEditOwner(null)} onSave={handleEdit} />}
      {viewOwner && <ViewOwnerModal owner={viewOwner} category={category} onClose={closeViewOwner} onEdit={() => { setEditOwner(viewOwner); setViewOwner(null); }} onComplete={() => setCompleteOwner(viewOwner)} />}
      {completeOwner && <OwnerCompleteDealModal owner={completeOwner} category={category} onClose={() => setCompleteOwner(null)} onDone={handleComplete} />}
    </div>
  );
}