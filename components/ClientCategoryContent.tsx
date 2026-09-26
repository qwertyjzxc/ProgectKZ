"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserPlus, MoreHorizontal, Trash2, Edit3, Filter, X, Eye, Phone, Check, ChevronDown, Loader2, ArrowLeft, ListTodo, Square, CheckSquare } from "lucide-react";
import { getRentCategoryLabel, type RentCategory } from "@/components/RentCategorySelector";
import Combobox from "@/components/Combobox";
import DatePicker from "@/components/DatePicker";
import ConfirmDialog from "@/components/ConfirmDialog";
import { maskKzPhone, phoneToWa } from "@/components/PhoneInput";
import MoneyInput from "@/components/MoneyInput";
import PillSettingsGear, { usePillVisibility } from "@/components/PillSettingsGear";
import { formatMoney } from "@/lib/format";
import { useProfile, profileName } from "@/lib/profile-context";

const RENT_TYPE_SINGULAR: Record<RentCategory, string> = {
  houses: "Земля",
  premises: "Помещение",
  apartments: "Квартира",
};

import { type Client, type ClientFormData } from "@/lib/client-types";

const CLIENT_STATUSES = [
  "Новый Клиент",
  "Запрос уточняется",
  "Подбор объектов",
  "Варианты отправлены",
  "Просмотр",
  "Переговоры",
  "Подготовка к сделке",
  "Сделка в процессе",
  "Сделка завершена",
  "Заморожен",
  "Приостановлен",
  "Закрыт без сделки",
];

import { completedColors, getInitials } from "@/lib/client-types";

const STATUS_STAT_COLORS: Record<string, string> = {
  "Новый Клиент": "text-sky-600",
  "Запрос уточняется": "text-cyan-600",
  "Подбор объектов": "text-blue-600",
  "Варианты отправлены": "text-indigo-600",
  "Просмотр": "text-violet-600",
  "Переговоры": "text-amber-600",
  "Подготовка к сделке": "text-orange-600",
  "Сделка в процессе": "text-yellow-600",
  "Сделка завершена": "text-green-600",
  "Заморожен": "text-blue-600",
  "Приостановлен": "text-gray-500",
  "Закрыт без сделки": "text-red-500",
  // старые статусы из данных — чтобы не были чёрными
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
  "Без статуса": "text-gray-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  arenda: "Аренда",
  prodaja: "Покупка",
};

import dynamic from "next/dynamic";

// Тяжёлые модалки — отдельными чанками: грузятся только при открытии,
// а не в бандле страницы (минус ~40% веса страницы клиентов).
const ViewClientModal = dynamic(() => import("@/components/ClientViewModal"), { ssr: false });
const ClientFormModal = dynamic(() => import("@/components/ClientFormModal"), { ssr: false });
const AssignTaskModal = dynamic(() => import("@/components/AssignTaskModal"), { ssr: false });
const CompleteDealModal = dynamic(() => import("@/components/CompleteDealModal"), { ssr: false });

// ====== MAIN CONTENT ======
// Перф: кэш списка в памяти модуля (stale-while-revalidate) — повторный вход
// на страницу рисуется мгновенно без повторной выгрузки ~3МБ, фоном данные обновляются.
// Мутации инвалидируют кэш, следующий монт тянет свежие данные.
const clientsCache: Record<string, { rows: Client[]; total: number; counts: { byType: Record<string, number>; byStatus: Record<string, number> } }> = {};
// distincts меняются редко (новый район/ЖК) — кэшируем на сессию
const distinctsCache: Record<string, { districts: string[]; jk: string[] }> = {};

// Размер страницы серверной пагинации. Живые CRM (react-admin, atomic-crm)
// держат 25 строк на страницу; у нас строки тяжёлые (11 колонок, меню) — берём 50.
const PAGE_SIZE = 50;

export default function ClientCategoryContent({ category, propertyType, onBack }: { category: "arenda" | "prodaja"; propertyType?: RentCategory; onBack?: () => void }) {
  const { currentProfile, allProfiles } = useProfile();
  const isAdmin = currentProfile?.role === "admin";
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [viewClient, setViewClient] = useState<Client | null>(null);
  const [assignClient, setAssignClient] = useState<Client | null>(null);
  const [completeClient, setCompleteClient] = useState<Client | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dupWarning, setDupWarning] = useState<Array<{ id: number; name: string; where: string }> | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Глубокая ссылка из уведомления: ?view=<id> открывает карточку клиента.
  // Строки может не быть на загруженной странице — тогда тянем карточку напрямую.
  const viewParam = searchParams.get("view");
  const [lastViewParam, setLastViewParam] = useState<string | null>(null);
  useEffect(() => {
    // URL уже почищен — сбрасываем guard, чтобы повторный клик по тому же
    // уведомлению снова открывал карточку
    if (!viewParam) {
      if (lastViewParam) setLastViewParam(null);
      return;
    }
    if (viewParam === lastViewParam || loading) return;
    const target = clients.find(c => c.id === Number(viewParam));
    if (target) {
      setLastViewParam(viewParam);
      setViewClient(target);
      return;
    }
    fetch("/api/clients/" + category + "/" + viewParam)
      .then(res => (res.ok ? res.json() : null))
      .then(d => {
        if (d && d.id) {
          setLastViewParam(viewParam);
          setViewClient(d);
        }
      })
      .catch(() => {});
  }, [viewParam, lastViewParam, loading, clients, category]);

  const closeViewClient = useCallback(() => {
    setViewClient(null);
    // lastViewParam НЕ сбрасываем здесь: router.replace асинхронен, и сброс
    // приводил к повторному открытию карточки (закрывать приходилось дважды).
    // Сброс происходит в эффекте выше, когда view уже убран из URL.
    const params = new URLSearchParams(searchParams.toString());
    if (params.has("view")) {
      params.delete("view");
      const qs = params.toString();
      router.replace(pathname + (qs ? "?" + qs : ""));
    }
  }, [searchParams, pathname, router]);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterCompleted, setFilterCompleted] = useState("");
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

  // Режим удаления
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dragRef = useRef(false);

  const hasActiveFilters = filterName || filterCompleted || filterDistrict || filterBroker || filterRooms || filterJk || filterAddress || filterAreaMin || filterAreaMax || filterAmountMin || filterAmountMax || filterDateFrom || filterDateTo;

  const resetAllFilters = () => {
    setFilterName("");
    setFilterCompleted("");
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

  useEffect(() => {
    const up = () => { dragRef.current = false; };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
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

  // Опции фильтров на всю категорию — с distincts-endpoint (а не из загруженной страницы)
  const [uniqueDistricts, setUniqueDistricts] = useState<string[]>([]);
  const [uniqueJk, setUniqueJk] = useState<string[]>([]);
  const roomsFilterOptions = ["1", "2", "3", "4", "5"];
  const brokerNames = useMemo(() => allProfiles.map(p => profileName(p)).filter(Boolean).sort(), [allProfiles]);

  // Тоталы с counts-endpoint: total — scope типа, byStatus — полный scope фильтров
  const [totalCount, setTotalCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<{ byType: Record<string, number>; byStatus: Record<string, number> }>({ byType: {}, byStatus: {} });
  const [loadingMore, setLoadingMore] = useState(false);
  // Есть ли ещё страницы: страница короче PAGE_SIZE = конец выборки.
  // Надёжнее сравнения с total (в нём и завершённые, которых activeOnly не отдаёт).
  const [hasMore, setHasMore] = useState(true);

  // types= для сервера — те же значения, которыми раньше фильтровался список типов
  const typesParam = useMemo(() => {
    if (!propertyType) return "";
    const label = RENT_TYPE_SINGULAR[propertyType];
    if (label === "Земля") return "Земля,Дома,Дом";
    if (label === "Помещение") return "Помещение,Помещения";
    return label;
  }, [propertyType]);

  const isDefaultView = !searchQuery.trim() && !filterName.trim() && !filterCompleted && !filterDistrict && !filterBroker && !filterRooms.trim() && !filterJk && !filterAddress.trim() && !filterAreaMin.trim() && !filterAreaMax.trim() && !filterAmountMin.trim() && !filterAmountMax.trim() && !filterDateFrom.trim() && !filterDateTo.trim();

  const buildListParams = useCallback((offset: number) => {
    const p = new URLSearchParams();
    p.set("limit", String(PAGE_SIZE));
    p.set("offset", String(offset));
    if (typesParam) p.set("types", typesParam);
    if (filterCompleted) p.set("completed", filterCompleted);
    else p.set("activeOnly", "1");
    if (searchQuery.trim()) p.set("search", searchQuery.trim());
    if (filterName.trim()) p.set("name", filterName.trim());
    if (filterDistrict) p.set("district", filterDistrict);
    if (filterBroker) p.set("broker", filterBroker);
    if (filterRooms.trim()) p.set("rooms", filterRooms.trim());
    if (filterJk) p.set("jk", filterJk);
    if (filterAddress.trim()) p.set("address", filterAddress.trim());
    if (filterAreaMin.trim()) p.set("areaMin", filterAreaMin.trim());
    if (filterAreaMax.trim()) p.set("areaMax", filterAreaMax.trim());
    if (filterAmountMin.trim()) p.set("amountMin", filterAmountMin.trim());
    if (filterAmountMax.trim()) p.set("amountMax", filterAmountMax.trim());
    if (filterDateFrom.trim()) p.set("dateFrom", filterDateFrom.trim());
    if (filterDateTo.trim()) p.set("dateTo", filterDateTo.trim());
    return p;
  }, [typesParam, filterCompleted, searchQuery, filterName, filterDistrict, filterBroker, filterRooms, filterJk, filterAddress, filterAreaMin, filterAreaMax, filterAmountMin, filterAmountMax, filterDateFrom, filterDateTo]);

  // Одна загрузка на всё: строки + тотал + разбивки приходят одним RPC.
  // keepPreviousData (как у react-query в живых CRM): при смене фильтра старые
  // строки остаются на экране, скелетон — только на холодном монте без данных.
  // Устаревшие запросы отменяем через AbortController, чтобы поздний ответ
  // не затёр свежий (гонка при быстрой печати).
  const listAbort = useRef<AbortController | null>(null);
  const clientsRef = useRef<Client[]>([]);
  useEffect(() => {
    clientsRef.current = clients;
  }, [clients]);

  const loadAll = useCallback(async (reset: boolean, offset: number) => {
    listAbort.current?.abort();
    const ctl = new AbortController();
    listAbort.current = ctl;
    const cacheKey = category + ":" + typesParam;
    const hadRows = clientsRef.current.length > 0;
    if (reset) {
      const cached = isDefaultView ? clientsCache[cacheKey] : undefined;
      if (cached) {
        setClients(cached.rows);
        setTotalCount(cached.total);
        setStatusCounts(cached.counts);
        setLoading(false);
      } else if (!hadRows) {
        setLoading(true);
      }
      setHasMore(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }
    try {
      const params = buildListParams(offset);
      const res = await fetch("/api/clients/" + category + "?" + params.toString(), { signal: ctl.signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка загрузки");
      const rows: Client[] = Array.isArray(data) ? data : data.rows || [];
      // Legacy-массив (на случай отката API): режем страницу на клиенте
      const page = Array.isArray(data) ? rows.slice(offset, offset + PAGE_SIZE) : rows;
      const total: number = Array.isArray(data) ? data.length : data.total || 0;
      const counts = Array.isArray(data)
        ? { byType: {} as Record<string, number>, byStatus: {} as Record<string, number> }
        : { byType: data.byType || {}, byStatus: data.byStatus || {} };
      if (reset) {
        setClients(page);
        setTotalCount(total);
        setStatusCounts(counts);
        if (isDefaultView && !Array.isArray(data)) clientsCache[cacheKey] = { rows: page, total, counts };
      } else {
        setClients(prev => [...prev, ...page]);
        if (page.length < PAGE_SIZE) setHasMore(false);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      if (reset && clientsRef.current.length === 0) setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      if (listAbort.current !== ctl) return;
      if (reset) setLoading(false);
      else setLoadingMore(false);
    }
  }, [category, typesParam, isDefaultView, buildListParams]);

  const loadDistincts = useCallback(async () => {
    const cached = distinctsCache[category];
    if (cached) {
      setUniqueDistricts(cached.districts);
      setUniqueJk(cached.jk);
      return;
    }
    try {
      const res = await fetch("/api/clients/" + category + "?distincts=1");
      const data = await res.json();
      if (res.ok) {
        const districts = Array.isArray(data.districts) ? data.districts : [];
        const jk = Array.isArray(data.jk) ? data.jk : [];
        setUniqueDistricts(districts);
        setUniqueJk(jk);
        distinctsCache[category] = { districts, jk };
      }
    } catch {
      // опции фильтров не должны ронять список
    }
  }, [category]);

  // Мутации инвалидируют кэш — следующий монт тянет свежие данные с сервера
  const invalidateClientsCache = useCallback(() => {
    Object.keys(clientsCache).forEach(k => {
      if (k.startsWith(category + ":")) delete clientsCache[k];
    });
    delete distinctsCache[category];
  }, [category]);

  // Немедленно: смена категории/типа (кэш рисует мгновенно)
  const lastImmediate = useRef(0);
  useEffect(() => {
    lastImmediate.current = Date.now();
    loadAll(true, 0);
    loadDistincts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, typesParam]);

  // Дебаунс 300мс: фильтры и поиск (пропускаем дубль сразу после немедленной загрузки)
  useEffect(() => {
    const t = setTimeout(() => {
      if (Date.now() - lastImmediate.current < 600) return;
      loadAll(true, 0);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterName, filterCompleted, filterDistrict, filterBroker, filterRooms, filterJk, filterAddress, filterAreaMin, filterAreaMax, filterAmountMin, filterAmountMax, filterDateFrom, filterDateTo]);

  const loadMore = useCallback(() => {
    loadAll(false, clients.length);
  }, [loadAll, clients.length]);

  // Фильтрация — на сервере; здесь только серверные итоги для пилюль.
  // ТЗ §7: по умолчанию только активные; завершённые — через пилюлю «Сделка завершена»
  const clientStatusList = useMemo(() => {
    return Object.entries(statusCounts.byType)
      .sort((a, b) => b[1] - a[1])
      .map(([s]) => s);
  }, [statusCounts.byType]);

  const pillVis = usePillVisibility("clients");
  const visibleStatuses = clientStatusList.filter(s => !pillVis.hidden.includes(s) || filterCompleted === s);

  const handleAdd = async (data: ClientFormData) => {
    setShowAdd(false);
    setSaveError(null);
    const temp: Client = { ...data, id: -Date.now(), created_at: new Date().toISOString() };
    setClients(prev => [temp, ...prev]);
    try {
      const res = await fetch("/api/clients/" + category, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json()).error || "Ошибка сохранения");
      const newClient = await res.json();
      setClients(prev => prev.map(c => c.id === temp.id ? newClient : c));
      invalidateClientsCache();
      loadAll(true, 0);
      if (Array.isArray(newClient.duplicateWarning) && newClient.duplicateWarning.length > 0) {
        setDupWarning(newClient.duplicateWarning);
      }
    } catch (err) {
      setClients(prev => prev.filter(c => c.id !== temp.id));
      setSaveError(err instanceof Error ? err.message : "Ошибка сохранения");
    }
  };

  const handleEdit = async (data: ClientFormData) => {
    if (!editClient) return;
    const original = editClient;
    const optimistic: Client = { ...original, ...data };
    setEditClient(null);
    setSaveError(null);
    setClients(prev => prev.map(c => c.id === original.id ? optimistic : c));
    try {
      const res = await fetch("/api/clients/" + category + "/" + original.id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json()).error || "Ошибка сохранения");
      const updated = await res.json();
      setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
      invalidateClientsCache();
      loadAll(true, 0);
    } catch (err) {
      setClients(prev => prev.map(c => c.id === original.id ? original : c));
      setSaveError(err instanceof Error ? err.message : "Ошибка сохранения");
    }
  };

  const handleDelete = async (id: number) => {
    // Оптимистично: строка исчезает сразу, сервер догоняет фоном
    setClients(prev => prev.filter(c => c.id !== id));
    invalidateClientsCache();
    try {
      const res = await fetch("/api/clients/" + category + "/" + id, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Ошибка удаления");
    } catch (err) {
      // Откат: перечитываем список с сервера
      loadAll(true, 0);
      setSaveError(err instanceof Error ? err.message : "Ошибка удаления");
      return;
    }
    loadAll(true, 0);
  };

  const allVisibleSelected = clients.length > 0 && clients.every(c => selectedIds.has(c.id));
  const handleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) clients.forEach(c => next.delete(c.id));
      else clients.forEach(c => next.add(c.id));
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    // Оптимистично: строки исчезают и режим закрывается сразу
    const removed = new Set(selectedIds);
    setClients(prev => prev.filter(c => !removed.has(c.id)));
    invalidateClientsCache();
    exitDeleteMode();
    setDeleting(true);
    try {
      const res = await fetch("/api/clients/" + category, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [...removed] }) });
      if (!res.ok) throw new Error((await res.json()).error || "Ошибка удаления");
    } catch (err) {
      loadAll(true, 0);
      setSaveError(err instanceof Error ? err.message : "Ошибка удаления");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
    loadAll(true, 0);
  };

  const categoryLabel = CATEGORY_LABELS[category] || category;

  const isHouses = propertyType === "houses";
  const isZemlyaSell = isHouses && category === "prodaja";
  const showRoomsCol = !isZemlyaSell && false;
  const showJkCol = !isHouses && false;

  return (
    <div>
      {saveError && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <span>Не удалось сохранить: {saveError}</span>
          <button onClick={() => setSaveError(null)} className="text-red-500 hover:text-red-700 shrink-0"><X className="w-4 h-4" /></button>
        </div>
      )}
      {dupWarning && dupWarning.length > 0 && (
        <div className="mb-4 flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <span>
            Похоже на дубль: такой телефон уже есть у {dupWarning.map(d => "«" + (d.name || "без имени") + "» (" + d.where + ")").join(", ")}. Клиент всё равно создан — проверьте и удалите лишнего при необходимости.
          </span>
          <button onClick={() => setDupWarning(null)} className="text-amber-500 hover:text-amber-700 shrink-0"><X className="w-4 h-4" /></button>
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
          <h1 className="text-xl font-bold text-gray-900">Клиенты · {categoryLabel}{propertyType ? " · " + getRentCategoryLabel(propertyType, category) : ""}</h1>
        </div>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setShowAdd(true)}>
          <UserPlus className="w-4 h-4" />Добавить клиента
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
                { value: "", label: "Все" },
                ...CLIENT_STATUSES.map(s => ({ value: s, label: s })),
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilterCompleted(opt.value)}
                  className={
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all " +
                    (filterCompleted === opt.value
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50")
                  }
                >
                  {opt.label}
                  {filterCompleted === opt.value && <Check className="w-3 h-3 inline ml-1" />}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Клиент</label>
              <Input value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="Имя" className="h-9 text-sm bg-white" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Район</label>
              <Combobox value={filterDistrict} onChange={setFilterDistrict} options={uniqueDistricts} placeholder="Любой" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Комнат</label>
              <Combobox value={filterRooms} onChange={setFilterRooms} options={roomsFilterOptions} placeholder="Любые" />
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
              <label className="text-xs text-gray-500 mb-1 block">Адрес</label>
              <Input value={filterAddress} onChange={e => setFilterAddress(e.target.value)} placeholder="Улица, дом" className="h-9 text-sm bg-white" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Жилой комплекс</label>
              <Combobox value={filterJk} onChange={setFilterJk} options={uniqueJk} placeholder="Любой" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Брокер</label>
              <Combobox value={filterBroker} onChange={setFilterBroker} options={brokerNames} placeholder={brokerNames.length ? "Любой" : "Нет сотрудников"} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Бюджет, ₸</label>
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
        <PillSettingsGear statuses={clientStatusList} hidden={pillVis.hidden} onToggle={pillVis.toggle} onReset={pillVis.reset} />
        <button
          type="button"
          onClick={() => setFilterCompleted("")}
          title="Снять фильтр по статусу"
          className="flex items-center gap-1.5 rounded-full bg-blue-600 text-white px-3 py-1 text-xs font-medium hover:bg-blue-700 transition-colors"
        >
          <span>Всего</span>
          <span className="font-bold">{totalCount}</span>
        </button>
        {visibleStatuses.map(s => {
          const count = statusCounts.byStatus[s] ?? 0;
          const active = filterCompleted === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilterCompleted(active ? "" : s)}
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

      {/* Loading / Error — скелетон только на холодном монте; при смене
          фильтра старые строки остаются (keepPreviousData), сверху — «Обновление…» */}
      {loading && clients.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
          <p className="text-gray-500 mt-2">Загрузка из Supabase...</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">
          Ошибка: {error}
          <button onClick={() => { setLoading(true); setError(null); loadAll(true, 0); }} className="ml-3 underline text-red-600 hover:text-red-800">Повторить</button>
        </div>
      )}

      {/* Clients table */}
      {(clients.length > 0 || (!loading && !error)) && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="table-scroll overflow-y-auto max-h-[calc(100vh-280px)]">
          <table className="w-full table-fixed text-center">
            <colgroup>
              <col className="w-[4%]" />
              <col className="w-[15%]" />
              {showRoomsCol && <col className="w-[7%]" />}
              <col className="w-[8%]" />
              <col className="w-[9%]" />
              {showJkCol && <col className="w-[8%]" />}
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[12%]" />
              <col className="w-[4%]" />
            </colgroup>
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide rounded-tl-xl sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300"></th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Клиент</th>
                {showRoomsCol && <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Комнат</th>}
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Площадь</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Предпочтения</th>
                {showJkCol && <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Жилой комплекс</th>}
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Брокер</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Бюджет</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Дата обращения</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Статус</th>
                <th className="px-2 py-3 rounded-tr-xl sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">
                  {deleteMode && (
                    <button onClick={handleSelectAll} className="text-gray-500 hover:text-blue-600 transition-colors" title={allVisibleSelected ? "Снять выделение" : "Выделить все"}>
                      {allVisibleSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                    </button>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 [&>tr:last-child>td:first-child]:rounded-bl-xl [&>tr:last-child>td:last-child]:rounded-br-xl">
              {clients.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-6 py-16 text-center text-gray-400">
                    <p className="text-lg">Нет клиентов</p>
                    <p className="text-sm mt-1">{totalCount === 0 ? "Нажмите «Добавить клиента»" : "Попробуйте изменить фильтры"}</p>
                    {totalCount > 0 && (
                      <button onClick={resetAllFilters} className="mt-2 text-blue-500 hover:text-blue-600 text-sm">Сбросить фильтры</button>
                    )}
                  </td>
                </tr>
              )}
              {clients.map(c => (
                <tr
                  key={c.id}
                  onContextMenu={e => handleRowContextMenu(e, c.id)}
                  onPointerDown={e => handleRowPointerDown(e, c.id)}
                  onPointerEnter={() => handleRowPointerEnter(c.id)}
                  onClick={() => { if (!deleteMode) setViewClient(c); }}
                  className={
                    (deleteMode ? "cursor-pointer " : "cursor-pointer ") +
                    (selectedIds.has(c.id) ? "bg-red-100 hover:bg-red-200 " : deleteMode ? "hover:bg-red-100/50 " : "hover:bg-blue-50/40 ") +
                    "transition-colors group"
                  }
                >
                  <td className="px-1 py-3" onClick={e => e.stopPropagation()}>
                    {c.phone && !c.phone_masked ? (
                      <a
                        href={`https://wa.me/${phoneToWa(c.phone)}`}
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
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-start gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                        {getInitials(c.name)}
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="text-sm font-medium text-gray-900">{c.name || "—"}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 shrink-0" />{c.phone_masked ? "Скрыт" : c.phone ? maskKzPhone(c.phone) : "—"}
                        </div>
                      </div>
                    </div>
                  </td>
                  {showRoomsCol && <td className="px-3 py-3 text-sm text-gray-600">{c.rooms || "—"}</td>}
                  <td className="px-3 py-3 text-sm text-gray-600">{c.area ? c.area + (c.type === "Земля" ? " " + (c.area_unit || "сот") : " м²") : "—"}</td>
                  <td className="px-3 py-3 text-sm text-gray-500 break-words"><span className="line-clamp-2" title={c.preferences || ""}>{c.preferences || "—"}</span></td>
                  {showJkCol && <td className="px-3 py-3 text-sm text-gray-500 break-words">{c.jk || "—"}</td>}
                  <td className="px-3 py-3 text-sm text-gray-500 break-words">{c.broker || "—"}</td>
                  <td className="px-3 py-3 text-sm font-semibold text-gray-900" onClick={e => e.stopPropagation()}>
                    {c.amount ? formatMoney(c.amount) : "—"}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-500">{c.date || "—"}</td>
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <Badge className={"text-xs " + (completedColors[c.completed] || "bg-gray-100 text-gray-700")}>
                      {c.completed || "—"}
                    </Badge>
                  </td>
                  <td className="px-1 py-3" onClick={e => e.stopPropagation()}>
                    {deleteMode ? (
                      <button
                        onPointerDown={e => e.stopPropagation()}
                        onContextMenu={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); toggleSelect(c.id); }}
                        className="text-gray-500 hover:text-blue-600 transition-colors"
                      >
                        {selectedIds.has(c.id) ? <CheckSquare className="w-4 h-4 text-red-500" /> : <Square className="w-4 h-4" />}
                      </button>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center rounded-[min(var(--radius-md),12px)] border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none hover:bg-gray-100 hover:text-gray-700 size-7">
                          <MoreHorizontal className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => setViewClient(c)}>
                            <Eye className="w-4 h-4 mr-2" />Просмотр
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setAssignClient(c)}>
                            <ListTodo className="w-4 h-4 mr-2" />Назначить задачу
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditClient(c)}>
                            <Edit3 className="w-4 h-4 mr-2" />Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(c.id)} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                            <Trash2 className="w-4 h-4 mr-2" />Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              ))}
              </tbody>
          </table>
          </div>
          <div className="border-t bg-gray-50/50 px-4 py-2.5 text-xs text-gray-400 flex items-center justify-between rounded-b-xl">
            <span>
              Показано: {clients.length} из {totalCount}
              {loading && clients.length > 0 && <span className="ml-2 text-blue-500">Обновление…</span>}
            </span>
            <div className="flex items-center gap-3">
              {hasMore && clients.length < totalCount && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? "Загрузка…" : `Показать ещё (${totalCount - clients.length})`}
                </button>
              )}
              {hasActiveFilters && (
                <button onClick={resetAllFilters} className="text-blue-500 hover:text-blue-600">Сбросить всё</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAdd && <ClientFormModal defaultType={propertyType ? (propertyType === "houses" && category === "arenda" ? "Дом" : RENT_TYPE_SINGULAR[propertyType]) : ""} category={category} onClose={() => setShowAdd(false)} onSave={handleAdd} />}
      {editClient && <ClientFormModal client={editClient} category={category} onClose={() => setEditClient(null)} onSave={handleEdit} />}
      {viewClient && <ViewClientModal client={viewClient} category={category} isAdmin={isAdmin} onClose={closeViewClient} onEdit={() => { setEditClient(viewClient); setViewClient(null); }} onAssign={() => setAssignClient(viewClient)} onComplete={() => setCompleteClient(viewClient)} />}
      {assignClient && <AssignTaskModal clientName={assignClient.name || ""} onClose={() => setAssignClient(null)} />}
      {completeClient && <CompleteDealModal client={completeClient} propertyType={propertyType} category={category} onClose={() => setCompleteClient(null)} onDone={() => { setCompleteClient(null); setViewClient(null); loadAll(true, 0); }} />}

      <ConfirmDialog
        open={confirmDelete}
        title="Удаление клиентов"
        message={`Удалить ${selectedIds.size} ${selectedIds.size === 1 ? "клиента" : selectedIds.size < 5 ? "клиентов" : "клиентов"}?`}
        hint="Действие необратимо."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}