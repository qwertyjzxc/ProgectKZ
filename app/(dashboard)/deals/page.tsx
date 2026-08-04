"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Trash2, Edit3, Filter, X, Loader2, Check, Banknote, CalendarDays } from "lucide-react";

interface Deal {
  id: number;
  name: string;
  client: string;
  amount: number;
  stage: string;
  date: string;
  created_at: string;
}

type EditableDeal = Pick<Deal, 'id' | 'name' | 'client' | 'amount' | 'stage' | 'date'>;

const stageColors: Record<string, string> = {
  "Сделка закрыта": "bg-green-100 text-green-800",
  "Переговоры": "bg-blue-100 text-blue-800",
  "Показ": "bg-yellow-100 text-yellow-800",
  "Ожидание": "bg-gray-100 text-gray-700",
  "Первичный контакт": "bg-purple-100 text-purple-800",
};

function DealFormModal({ deal, onClose, onSave }: { deal?: EditableDeal; onClose: () => void; onSave: (d: any) => void }) {
  const [name, setName] = useState(deal?.name || "");
  const [client, setClient] = useState(deal?.client || "");
  const [amount, setAmount] = useState(deal?.amount ? String(deal.amount) : "");
  const [stage, setStage] = useState(deal?.stage || "Первичный контакт");
  const [date, setDate] = useState(deal?.date || new Date().toLocaleDateString("ru-RU"));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      client,
      amount: parseInt(amount) || 0,
      stage,
      date,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">{deal ? "Редактировать сделку" : "Новая сделка"}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Название сделки" required className="text-sm" />
          <Input value={client} onChange={e => setClient(e.target.value)} placeholder="Клиент" className="text-sm" />
          <div className="relative">
            <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="Сумма, ₸" className="text-sm pl-9" />
            <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <div className="relative">
            <Input value={date} onChange={e => setDate(e.target.value)} placeholder="ДД.ММ.ГГГГ" className="text-sm pl-9" />
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <select value={stage} onChange={e => setStage(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm">
            <option>Первичный контакт</option>
            <option>Переговоры</option>
            <option>Показ</option>
            <option>Ожидание</option>
            <option>Сделка закрыта</option>
          </select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={onClose} size="sm">Отмена</Button>
            <Button type="submit" size="sm" className="bg-blue-600">{deal ? "Сохранить" : "Добавить"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DealsContent() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editDeal, setEditDeal] = useState<EditableDeal | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/deals");
      const data = await res.json();
      if (Array.isArray(data)) setDeals(data);
      else if (data.error) setError(data.error);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDeals(); }, []);

  const filtered = useMemo(() => {
    let result = deals;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => d.name?.toLowerCase().includes(q) || d.client?.toLowerCase().includes(q));
    }
    if (filterStage) result = result.filter(d => d.stage === filterStage);
    return result;
  }, [deals, searchQuery, filterStage]);

  const handleAdd = async (data: any) => {
    const res = await fetch("/api/deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) {
      const newDeal = await res.json();
      setDeals(prev => [newDeal, ...prev]);
      setShowAdd(false);
    }
  };

  const handleEdit = async (data: any) => {
    if (!editDeal) return;
    const res = await fetch("/api/deals/" + editDeal.id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) {
      const updated = await res.json();
      setDeals(prev => prev.map(d => d.id === updated.id ? updated : d));
      setEditDeal(null);
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch("/api/deals/" + id, { method: "DELETE" });
    if (res.ok) setDeals(prev => prev.filter(d => d.id !== id));
  };

  const closedDeals = deals.filter(d => d.stage === "Сделка закрыта");
  const closedAmount = closedDeals.reduce((s, d) => s + (d.amount || 0), 0);
  const conversion = deals.length > 0 ? ((closedDeals.length / deals.length) * 100).toFixed(0) : "0";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Сделки</h1>
          <p className="text-sm text-gray-500 mt-1">Воронка продаж Romanov Estate</p>
        </div>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" />Новая сделка
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск по названию, клиенту..." className="pl-10 h-9 text-sm bg-white" />
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
        <Button variant={showFilters || filterStage ? "default" : "outline"} size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1"><Filter className="w-4 h-4" />Фильтры{filterStage && <span className="ml-1 w-2 h-2 rounded-full bg-blue-500" />}</Button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-4 p-3 bg-white rounded-xl border shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Этап</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: "", label: "Все" },
                { value: "Первичный контакт", label: "Первичный" },
                { value: "Переговоры", label: "Переговоры" },
                { value: "Показ", label: "Показ" },
                { value: "Ожидание", label: "Ожидание" },
                { value: "Сделка закрыта", label: "Закрыто" },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilterStage(opt.value)}
                  className={"px-3 py-1.5 rounded-full text-xs font-medium border transition-all " + (filterStage === opt.value ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50")}
                >
                  {opt.label}
                  {filterStage === opt.value && <Check className="w-3 h-3 inline ml-1" />}
                </button>
              ))}
            </div>
          </div>
          {filterStage && (
            <button onClick={() => setFilterStage("")} className="mt-3 text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"><X className="w-3 h-3" />Сбросить</button>
          )}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">Всего сделок</p><p className="text-2xl font-bold text-gray-900 mt-0.5">{deals.length}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">Закрыто</p><p className="text-2xl font-bold text-green-600 mt-0.5">{closedDeals.length}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">Сумма закрытых</p><p className="text-2xl font-bold text-green-600 mt-0.5">{(closedAmount/1000000).toFixed(1)}M ₸</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">Конверсия</p><p className="text-2xl font-bold text-blue-600 mt-0.5">{conversion}%</p></div>
      </div>

      {loading && <div className="bg-white rounded-xl shadow-sm border p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /><p className="text-gray-500 mt-2">Загрузка из Supabase...</p></div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">Ошибка: {error}<button onClick={fetchDeals} className="ml-3 underline text-red-600 hover:text-red-800">Повторить</button></div>}

      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Сделка</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Клиент</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Сумма</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Этап</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Дата</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                      <p className="text-lg">Нет сделок</p>
                      <p className="text-sm mt-1">{deals.length === 0 ? "Нажмите «Новая сделка»" : "Попробуйте изменить фильтры"}</p>
                      {deals.length > 0 && <button onClick={() => { setSearchQuery(""); setFilterStage(""); }} className="mt-2 text-blue-500 hover:text-blue-600 text-sm">Сбросить фильтры</button>}
                    </td>
                  </tr>
                )}
                {filtered.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.client || "—"}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {d.amount ? d.amount >= 1000000 ? (d.amount/1000000).toFixed(1) + " M ₸" : d.amount.toLocaleString() + " ₸" : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={"text-xs " + (stageColors[d.stage] || "bg-gray-100 text-gray-700")}>
                        {d.stage || "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{d.date || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center rounded-[min(var(--radius-md),12px)] border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none hover:bg-muted hover:text-foreground size-7 opacity-0 group-hover:opacity-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
                          <MoreHorizontal className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => setEditDeal({ id: d.id, name: d.name, client: d.client, amount: d.amount, stage: d.stage, date: d.date })}>
                            <Edit3 className="w-4 h-4 mr-2" />Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(d.id)} className="text-red-600 focus:text-red-700 focus:bg-red-50">
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
          <div className="border-t bg-gray-50/50 px-4 py-2 text-xs text-gray-400">
            Показано: {filtered.length} из {deals.length} сделок • Закрыто: {closedDeals.length} • Конверсия: {conversion}%
            {(searchQuery || filterStage) && <button onClick={() => { setSearchQuery(""); setFilterStage(""); }} className="ml-3 text-blue-500 hover:text-blue-600">Сбросить всё</button>}
          </div>
        </div>
      )}

      {showAdd && <DealFormModal onClose={() => setShowAdd(false)} onSave={handleAdd} />}
      {editDeal && <DealFormModal deal={editDeal} onClose={() => setEditDeal(null)} onSave={handleEdit} />}
    </div>
  );
}

export default function DealsPage() {
  return (
    <Suspense fallback={<div className="p-6"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
      <DealsContent />
    </Suspense>
  );
}
