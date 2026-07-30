"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserPlus, MoreHorizontal, Trash2, Edit3, Filter, X, Loader2, Eye, Phone, MapPin, Home, Users, CalendarDays, Banknote, FileText, User, Briefcase, Check } from "lucide-react";

interface Client {
  id: number;
  date: string;
  name: string;
  rooms: string;
  district: string;
  amount: number;
  furniture: string;
  rental_period: string;
  phone: string;
  who_lives: string;
  people_count: number;
  notes: string;
  completed: string;
  broker: string;
  created_at: string;
}

const completedColors: Record<string, string> = {
  "В процессе": "bg-yellow-100 text-yellow-800",
  "Завершено": "bg-green-100 text-green-800",
  "Отказ": "bg-red-100 text-red-800",
};

// ====== VIEW MODAL ======
function ViewClientModal({ client, onClose, onEdit }: { client: Client; onClose: () => void; onEdit: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-gray-900">{client.name || "Без имени"}</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}><Edit3 className="w-4 h-4 mr-1" />Редактировать</Button>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Badge className={"text-sm px-3 py-1 " + (completedColors[client.completed] || "bg-gray-100 text-gray-700")}>
              {client.completed || "Без статуса"}
            </Badge>
            <span className="text-sm text-gray-500 flex items-center gap-1"><CalendarDays className="w-4 h-4" />{client.date}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailItem icon={Phone} label="Телефон" value={client.phone} />
            <DetailItem icon={MapPin} label="Район" value={client.district} />
            <DetailItem icon={Home} label="Комнат" value={client.rooms} />
            <DetailItem icon={Banknote} label="Бюджет" value={client.amount ? client.amount.toLocaleString() + " ₸" : null} />
            <DetailItem icon={Briefcase} label="Меблировка" value={client.furniture} />
            <DetailItem icon={CalendarDays} label="Срок аренды" value={client.rental_period} />
            <DetailItem icon={User} label="Кто проживает" value={client.who_lives} />
            <DetailItem icon={Users} label="Кол-во человек" value={client.people_count} />
            <DetailItem icon={User} label="Брокер" value={client.broker} />
          </div>
          {client.notes && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><FileText className="w-3.5 h-3.5" />Заметки</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-blue-600" /></div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      </div>
    </div>
  );
}

// ====== FORM MODAL ======
function ClientFormModal({ client, onClose, onSave }: { client?: Client; onClose: () => void; onSave: (data: any) => void }) {
  const [date, setDate] = useState(client?.date || new Date().toLocaleDateString("ru-RU"));
  const [name, setName] = useState(client?.name || "");
  const [phone, setPhone] = useState(client?.phone || "");
  const [district, setDistrict] = useState(client?.district || "");
  const [rooms, setRooms] = useState(client?.rooms || "");
  const [amount, setAmount] = useState(client?.amount ? String(client.amount) : "");
  const [furniture, setFurniture] = useState(client?.furniture || "");
  const [rentalPeriod, setRentalPeriod] = useState(client?.rental_period || "");
  const [whoLives, setWhoLives] = useState(client?.who_lives || "");
  const [peopleCount, setPeopleCount] = useState(client?.people_count ? String(client.people_count) : "1");
  const [notes, setNotes] = useState(client?.notes || "");
  const [completed, setCompleted] = useState(client?.completed || "");
  const [broker, setBroker] = useState(client?.broker || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ date, name, phone, district, rooms, amount: parseInt(amount) || 0, furniture, rental_period: rentalPeriod, who_lives: whoLives, people_count: parseInt(peopleCount) || 1, notes, completed, broker });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-bold">{client ? "Редактировать клиента" : "Новый клиент"}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs text-gray-500 mb-1 block">Дата</label><Input value={date} onChange={e => setDate(e.target.value)} placeholder="ДД.ММ.ГГГГ" className="text-sm" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Имя</label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Фамилия Имя" className="text-sm" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Телефон</label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 777 123 45 67" className="text-sm" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Район</label><Input value={district} onChange={e => setDistrict(e.target.value)} placeholder="Район" className="text-sm" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Комнатность</label><Input value={rooms} onChange={e => setRooms(e.target.value)} placeholder="Кол-во комнат" className="text-sm" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Бюджет, ₸</label><Input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="0" className="text-sm" /></div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Меблировка</label>
              <select value={furniture} onChange={e => setFurniture(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm">
                <option value="">Не указано</option><option value="Полная">Полная</option><option value="Частичная">Частичная</option><option value="Без мебели">Без мебели</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Срок аренды</label>
              <select value={rentalPeriod} onChange={e => setRentalPeriod(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm">
                <option value="">Не указано</option><option value="Долгосрочно">Долгосрочно</option><option value="Краткосрочно">Краткосрочно</option><option value="Посуточно">Посуточно</option>
              </select>
            </div>
            <div><label className="text-xs text-gray-500 mb-1 block">Кто проживает</label><Input value={whoLives} onChange={e => setWhoLives(e.target.value)} placeholder="Семья, один, ..." className="text-sm" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Кол-во человек</label><Input value={peopleCount} onChange={e => setPeopleCount(e.target.value)} type="number" placeholder="1" className="text-sm" /></div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Статус</label>
              <select value={completed} onChange={e => setCompleted(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm">
                <option value="">Без статуса</option><option value="В процессе">В процессе</option><option value="Завершено">Завершено</option><option value="Отказ">Отказ</option>
              </select>
            </div>
            <div><label className="text-xs text-gray-500 mb-1 block">Брокер</label><Input value={broker} onChange={e => setBroker(e.target.value)} placeholder="Имя брокера" className="text-sm" /></div>
          </div>
          <div><label className="text-xs text-gray-500 mb-1 block">Заметки</label><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Дополнительная информация..." rows={3} className="w-full rounded-lg border px-3 py-2 text-sm resize-y" /></div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" type="button" onClick={onClose} size="sm">Отмена</Button>
            <Button type="submit" size="sm" className="bg-blue-600">{client ? "Сохранить" : "Добавить"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ====== MAIN PAGE CONTENT ======
function ClientsContent() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [viewClient, setViewClient] = useState<Client | null>(null);

  // Filter state (internal, no page reload)
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCompleted, setFilterCompleted] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/clients");
      const data = await res.json();
      if (Array.isArray(data)) setClients(data);
      else if (data.error) setError(data.error);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const filtered = useMemo(() => {
    let result = clients;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.district?.toLowerCase().includes(q) ||
        c.broker?.toLowerCase().includes(q)
      );
    }
    if (filterCompleted) result = result.filter(c => c.completed === filterCompleted);
    return result;
  }, [clients, searchQuery, filterCompleted]);

  const handleAdd = async (data: any) => {
    const res = await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) {
      const newClient = await res.json();
      setClients(prev => [newClient, ...prev]);
      setShowAdd(false);
    }
  };

  const handleEdit = async (data: any) => {
    if (!editClient) return;
    const res = await fetch("/api/clients/" + editClient.id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) {
      const updated = await res.json();
      setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
      setEditClient(null);
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch("/api/clients/" + id, { method: "DELETE" });
    if (res.ok) setClients(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Клиенты</h1>
          <p className="text-sm text-gray-500 mt-1">База клиентов Romanov Estate</p>
        </div>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setShowAdd(true)}>
          <UserPlus className="w-4 h-4" />Добавить клиента
        </Button>
      </div>

      {/* Search + Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
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
          variant={showFilters || filterCompleted ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-1"
        >
          <Filter className="w-4 h-4" />
          Фильтры
          {filterCompleted && <span className="ml-1 w-2 h-2 rounded-full bg-blue-500" />}
        </Button>
      </div>

      {/* Filter chips (beautiful) */}
      {showFilters && (
        <div className="mb-4 p-3 bg-white rounded-xl border shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: "", label: "Все" },
                { value: "В процессе", label: "В процессе", color: "border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100" },
                { value: "Завершено", label: "Завершено", color: "border-green-300 bg-green-50 text-green-700 hover:bg-green-100" },
                { value: "Отказ", label: "Отказ", color: "border-red-300 bg-red-50 text-red-700 hover:bg-red-100" },
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
            {filterCompleted && (
              <button onClick={() => setFilterCompleted("")} className="ml-auto text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                <X className="w-3 h-3" /> Сбросить
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">Всего</p><p className="text-2xl font-bold text-gray-900 mt-0.5">{clients.length}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">В процессе</p><p className="text-2xl font-bold text-yellow-600 mt-0.5">{clients.filter(c => c.completed === "В процессе").length}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">Завершено</p><p className="text-2xl font-bold text-green-600 mt-0.5">{clients.filter(c => c.completed === "Завершено").length}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">Отказы</p><p className="text-2xl font-bold text-red-500 mt-0.5">{clients.filter(c => c.completed === "Отказ").length}</p></div>
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
          <button onClick={fetchClients} className="ml-3 underline text-red-600 hover:text-red-800">Повторить</button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Клиент</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Телефон</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Район</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Брокер</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Статус</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Бюджет</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                      <p className="text-lg">Нет клиентов</p>
                      <p className="text-sm mt-1">{clients.length === 0 ? "Нажмите «Добавить клиента»" : "Попробуйте изменить фильтры"}</p>
                      {clients.length > 0 && (
                        <button onClick={() => { setSearchQuery(""); setFilterCompleted(""); }} className="mt-2 text-blue-500 hover:text-blue-600 text-sm">Сбросить фильтры</button>
                      )}
                    </td>
                  </tr>
                )}
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/60 transition-colors group cursor-pointer" onClick={() => setViewClient(c)}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.phone || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{c.district || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{c.broker || "—"}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <Badge className={"text-xs " + (completedColors[c.completed] || "bg-gray-100 text-gray-700")}>
                        {c.completed || "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium" onClick={e => e.stopPropagation()}>
                      {c.amount ? c.amount.toLocaleString() + " ₸" : "—"}
                    </td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center rounded-[min(var(--radius-md),12px)] border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none hover:bg-muted hover:text-foreground size-7 opacity-0 group-hover:opacity-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
                          <MoreHorizontal className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => setViewClient(c)}>
                            <Eye className="w-4 h-4 mr-2" />Просмотр
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditClient(c)}>
                            <Edit3 className="w-4 h-4 mr-2" />Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(c.id)} className="text-red-600 focus:text-red-700 focus:bg-red-50">
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
            Показано: {filtered.length} из {clients.length} клиентов
            {(searchQuery || filterCompleted) && (
              <button onClick={() => { setSearchQuery(""); setFilterCompleted(""); }} className="ml-3 text-blue-500 hover:text-blue-600">Сбросить всё</button>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showAdd && <ClientFormModal onClose={() => setShowAdd(false)} onSave={handleAdd} />}
      {editClient && <ClientFormModal client={editClient} onClose={() => setEditClient(null)} onSave={handleEdit} />}
      {viewClient && <ViewClientModal client={viewClient} onClose={() => setViewClient(null)} onEdit={() => { setEditClient(viewClient); setViewClient(null); }} />}
    </div>
  );
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<div className="p-6"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
      <ClientsContent />
    </Suspense>
  );
}
