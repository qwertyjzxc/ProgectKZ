"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserPlus, MoreHorizontal, Trash2, Edit3, Filter, X, Eye, Phone, MapPin, Home, Users, CalendarDays, Banknote, FileText, User, Briefcase, Check, ChevronDown, Loader2, ArrowLeft, Ruler, Building, ListTodo, History, Square, CheckSquare, type LucideIcon } from "lucide-react";
import { RENT_CATEGORY_LABELS, type RentCategory } from "@/components/RentCategorySelector";
import AssignTaskModal from "@/components/AssignTaskModal";
import Combobox from "@/components/Combobox";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import ConfirmDialog from "@/components/ConfirmDialog";
import PhoneInput, { maskKzPhone } from "@/components/PhoneInput";
import { SHYMKENT_DISTRICTS, SHYMKENT_JK } from "@/lib/shymkent";
import { useProfile, profileName } from "@/lib/profile-context";

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
  type: string;
  area: string;
  address: string;
  jk: string;
  contract: string;
  created_at: string;
}

const completedColors: Record<string, string> = {
  "В процессе": "bg-yellow-100 text-yellow-800",
  "Завершено": "bg-green-100 text-green-800",
  "Отказ": "bg-red-100 text-red-800",
};

const CATEGORY_LABELS: Record<string, string> = {
  arenda: "Аренда",
  prodaja: "Покупка",
};

type ClientFormData = Omit<Client, "id" | "created_at">;

// ====== VIEW MODAL ======
function CardSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function ViewClientModal({ client, category, isAdmin, onClose, onEdit, onAssign }: { client: Client; category: string; isAdmin: boolean; onClose: () => void; onEdit: () => void; onAssign: () => void }) {
  const [showActivity, setShowActivity] = useState(false);
  const [activity, setActivity] = useState<import("@/lib/activity").ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<import("@/lib/activity").ActivityEntry | null>(null);
  const clientTable = "clients_" + category;

  const loadActivity = useCallback(() => {
    setActivityLoading(true);
    fetch("/api/activity?client_table=" + clientTable + "&client_id=" + client.id)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setActivity(data); })
      .catch(() => {})
      .finally(() => setActivityLoading(false));
  }, [clientTable, client.id]);

  const toggleActivity = () => {
    const next = !showActivity;
    setShowActivity(next);
    if (next) loadActivity();
  };

  const handleDeleteActivity = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch("/api/activity/" + deleteTarget.id, { method: "DELETE" });
      if (!res.ok) throw new Error("Ошибка удаления");
      setActivity(prev => prev.filter(a => a.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900 truncate">{client.name || "Без имени"}</h2>
              <div className="flex items-center gap-3 mt-2">
                <Badge className={"text-sm px-3 py-1 " + (completedColors[client.completed] || "bg-gray-100 text-gray-700")}>
                  {client.completed || "Без статуса"}
                </Badge>
                <span className="text-sm text-gray-500 flex items-center gap-1"><CalendarDays className="w-4 h-4" />{client.date}</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button className="bg-blue-600 hover:bg-blue-700" size="sm" onClick={onAssign}>
                <ListTodo className="w-4 h-4 mr-1" />Назначить задачу
              </Button>
              <Button variant="outline" size="sm" onClick={toggleActivity}>
                <History className="w-4 h-4 mr-1" />Журнал
              </Button>
              <Button variant="outline" size="sm" onClick={onEdit}><Edit3 className="w-4 h-4 mr-1" />Редактировать</Button>
              <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <CardSection title="Объект">
            <DetailItem icon={Home} label="Тип недвижимости" value={client.type} />
            <DetailItem icon={MapPin} label="Район" value={client.district} />
            <DetailItem icon={MapPin} label="Адрес" value={client.address} />
            <DetailItem icon={Building} label="ЖК" value={client.jk} />
            <DetailItem icon={Home} label="Комнат" value={client.rooms} />
            <DetailItem icon={Ruler} label="Площадь" value={client.area ? client.area + " м²" : null} />
          </CardSection>
          <CardSection title="Договор и бюджет">
            <DetailItem icon={FileText} label="Номер договора" value={client.contract} />
            <DetailItem icon={Banknote} label="Бюджет" value={client.amount ? client.amount.toLocaleString() + " ₸" : null} />
            <DetailItem icon={Briefcase} label="Меблировка" value={client.furniture} />
            <DetailItem icon={CalendarDays} label="Срок аренды" value={client.rental_period} />
          </CardSection>
          <CardSection title="Контакт">
            <DetailItem icon={Phone} label="Телефон" value={client.phone} />
            <DetailItem icon={User} label="Кто проживает" value={client.who_lives} />
            <DetailItem icon={Users} label="Кол-во человек" value={client.people_count} />
            <DetailItem icon={User} label="Брокер" value={client.broker} />
          </CardSection>
          {client.notes && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><FileText className="w-3.5 h-3.5" />Заметки</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
          {showActivity && (
            <div className="border-t pt-5">
              <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Журнал действий</h3>
              {activityLoading ? (
                <div className="text-sm text-gray-400 flex items-center gap-2 py-2"><Loader2 className="w-4 h-4 animate-spin" />Загрузка...</div>
              ) : activity.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">Действий по клиенту пока нет</p>
              ) : (
                <div className="space-y-3">
                  {activity.map(a => (
                    <div key={a.id} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">{getInitials(a.actor_name)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-800">
                          <span className="font-medium">{a.actor_name || "Сотрудник"}</span> {a.message}
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteTarget(a)}
                              title="Удалить из журнала"
                              className="ml-1.5 p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors align-middle"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </p>
                        {a.changes && a.changes.length > 0 && (
                          <div className="mt-1.5 space-y-1 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                            {a.changes.map(ch => (
                              <p key={ch.field} className="text-xs text-gray-600 flex flex-wrap items-baseline gap-x-1.5">
                                <span className="text-gray-400">{ch.label}:</span>
                                <span className="text-gray-400 line-through">{ch.oldValue}</span>
                                <span className="text-gray-500">→</span>
                                <span className="font-medium text-gray-900">{ch.newValue}</span>
                              </p>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-400">{formatDateTime(a.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Удаление записи"
        message={deleteTarget ? "Удалить действие из журнала для этого клиента?" : ""}
        hint="Запись будет удалена без возможности восстановления."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        onConfirm={handleDeleteActivity}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr || "";
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function parseDateStr(s: string): number {
  const ru = (s || "").match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ru) return new Date(Number(ru[3]), Number(ru[2]) - 1, Number(ru[1])).getTime();
  const iso = (s || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).getTime();
  return NaN;
}

function toDateInputValue(v: string): string {
  const m = (v || "").match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v || "")) return v;
  return "";
}

function fromDateInputValue(v: string): string {
  const m = (v || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return v;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function DetailItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: React.ReactNode }) {
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

function getInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

// ====== FORM MODAL ======
function ClientFormModal({ client, onClose, onSave, defaultType }: { client?: Client; onClose: () => void; onSave: (data: ClientFormData) => void; defaultType?: string }) {
  const { currentProfile, allProfiles } = useProfile();
  const brokerNames = useMemo(() => allProfiles.map(p => profileName(p)).filter(Boolean).sort(), [allProfiles]);
  const [type, setType] = useState(client?.type || defaultType || "");
  const [area, setArea] = useState(client?.area || "");
  const [address, setAddress] = useState(client?.address || "");
  const [jk, setJk] = useState(client?.jk || "");
  const [contract, setContract] = useState(client?.contract || "");
  const [date, setDate] = useState(client?.date ? toDateInputValue(client.date) : new Date().toISOString().slice(0, 10));
  const [name, setName] = useState(client?.name || "");
  const [phone, setPhone] = useState(client?.phone ? maskKzPhone(client.phone) : "");
  const [district, setDistrict] = useState(client?.district || "");
  const [rooms, setRooms] = useState(client?.rooms || "");
  const [amount, setAmount] = useState(client?.amount ? String(client.amount) : "");
  const [furniture, setFurniture] = useState(client?.furniture || "");
  const [rentalPeriod, setRentalPeriod] = useState(client?.rental_period || "");
  const [whoLives, setWhoLives] = useState(client?.who_lives || "");
  const [peopleCount, setPeopleCount] = useState(client?.people_count ? String(client.people_count) : "1");
  const [notes, setNotes] = useState(client?.notes || "");
  const [completed, setCompleted] = useState(client?.completed || "");
  const [broker, setBroker] = useState(client ? client.broker : profileName(currentProfile));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ type, area, address, jk, contract, date: fromDateInputValue(date), name, phone, district, rooms, amount: parseInt(amount) || 0, furniture, rental_period: rentalPeriod, who_lives: whoLives, people_count: parseInt(peopleCount) || 1, notes, completed, broker });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b shrink-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-bold">{client ? "Редактировать клиента" : "Новый клиент"}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <form id="client-form" onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Тип недвижимости</label>
              <Select label="Не указано" value={type} onChange={setType} options={["Дома", "Помещения", "Квартиры"]} />
            </div>
            <div><label className="text-xs text-gray-500 mb-1 block">Дата</label><Input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-sm" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Имя</label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Фамилия Имя" className="text-sm" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Телефон</label><PhoneInput value={phone} onChange={setPhone} /></div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Район</label>
              <Combobox value={district} onChange={setDistrict} options={SHYMKENT_DISTRICTS} placeholder="Выберите район Шымкента" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Адрес</label>
              <AddressAutocomplete value={address} onChange={setAddress} placeholder="г. Шымкент, ул., дом, кв." />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">ЖК</label>
              <Combobox value={jk} onChange={setJk} options={SHYMKENT_JK} placeholder="Выберите или введите ЖК" />
            </div>
            <div><label className="text-xs text-gray-500 mb-1 block">Комнатность</label><Input value={rooms} onChange={e => setRooms(e.target.value)} placeholder="Кол-во комнат" className="text-sm" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Площадь, м²</label><Input value={area} onChange={e => setArea(e.target.value)} placeholder="120" className="text-sm" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Номер договора</label><Input value={contract} onChange={e => setContract(e.target.value)} placeholder="№ договора" className="text-sm" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Бюджет, ₸</label><Input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="0" className="text-sm" /></div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Меблировка</label>
              <Select label="Не указано" value={furniture} onChange={setFurniture} options={["Полная", "Частичная", "Без мебели"]} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Срок аренды</label>
              <Select label="Не указано" value={rentalPeriod} onChange={setRentalPeriod} options={["Долгосрочно", "Краткосрочно", "Посуточно"]} />
            </div>
            <div><label className="text-xs text-gray-500 mb-1 block">Кто проживает</label><Input value={whoLives} onChange={e => setWhoLives(e.target.value)} placeholder="Семья, один, ..." className="text-sm" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Кол-во человек</label><Input value={peopleCount} onChange={e => setPeopleCount(e.target.value)} type="number" placeholder="1" className="text-sm" /></div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Статус</label>
              <Select label="Без статуса" value={completed} onChange={setCompleted} options={["В процессе", "Завершено", "Отказ"]} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Брокер</label>
              <Combobox value={broker} onChange={setBroker} options={brokerNames} placeholder={brokerNames.length ? "Выберите сотрудника" : "Нет сотрудников — введите имя"} />
            </div>
          </div>
          <div><label className="text-xs text-gray-500 mb-1 block">Заметки</label><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Дополнительная информация..." rows={2} className="w-full rounded-lg border px-3 py-2 text-sm resize-y" /></div>
        </form>
        <div className="shrink-0 flex items-center justify-end gap-2 p-4 border-t bg-white">
          <Button variant="outline" type="button" onClick={onClose} className="px-6">Отмена</Button>
          <Button type="submit" form="client-form" className="bg-blue-600 px-8">{client ? "Сохранить" : "Добавить"}</Button>
        </div>
      </div>
    </div>
  );
}

// ====== FILTER SELECT COMPONENT ======
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-9 appearance-none rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-500"
      >
        <option value="">{label}</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
}

// ====== MAIN CONTENT ======
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
  const [saveError, setSaveError] = useState<string | null>(null);

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

  // Collect unique values for dropdowns
  const uniqueDistricts = useMemo(() => [...new Set(clients.map(c => c.district).filter(Boolean))].sort(), [clients]);
  const uniqueRooms = useMemo(() => [...new Set(clients.map(c => c.rooms).filter(Boolean))].sort(), [clients]);
  const uniqueJk = useMemo(() => [...new Set(clients.map(c => c.jk).filter(Boolean))].sort(), [clients]);
  const brokerNames = useMemo(() => allProfiles.map(p => profileName(p)).filter(Boolean).sort(), [allProfiles]);

  const categoryClients = useMemo(() => {
    if (!propertyType) return clients;
    const label = RENT_CATEGORY_LABELS[propertyType];
    return clients.filter(c => c.type === label);
  }, [clients, propertyType]);

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

  const fetchClients = useCallback(() => {
    fetch("/api/clients/" + category)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setClients(data);
        else if (data.error) setError(data.error);
      })
      .catch(err => setError(err instanceof Error ? err.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [category]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const filtered = useMemo(() => {
    let result = categoryClients;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.district?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q) ||
        c.jk?.toLowerCase().includes(q) ||
        c.broker?.toLowerCase().includes(q)
      );
    }
    if (filterName) {
      const q = filterName.toLowerCase();
      result = result.filter(c => c.name?.toLowerCase().includes(q));
    }
    if (filterCompleted) result = result.filter(c => c.completed === filterCompleted);
    if (filterDistrict) result = result.filter(c => c.district === filterDistrict);
    if (filterBroker) result = result.filter(c => c.broker === filterBroker);
    if (filterRooms) result = result.filter(c => c.rooms === filterRooms);
    if (filterJk) result = result.filter(c => c.jk === filterJk);
    if (filterAddress) {
      const q = filterAddress.toLowerCase();
      result = result.filter(c => c.address?.toLowerCase().includes(q));
    }
    if (filterAreaMin) result = result.filter(c => Number(c.area) >= Number(filterAreaMin));
    if (filterAreaMax) result = result.filter(c => Number(c.area) <= Number(filterAreaMax));
    if (filterAmountMin) result = result.filter(c => c.amount >= Number(filterAmountMin));
    if (filterAmountMax) result = result.filter(c => c.amount <= Number(filterAmountMax));
    if (filterDateFrom) {
      const t = parseDateStr(filterDateFrom);
      if (!isNaN(t)) result = result.filter(c => parseDateStr(c.date) >= t);
    }
    if (filterDateTo) {
      const t = parseDateStr(filterDateTo);
      if (!isNaN(t)) result = result.filter(c => parseDateStr(c.date) <= t);
    }
    return result;
  }, [categoryClients, searchQuery, filterName, filterCompleted, filterDistrict, filterBroker, filterRooms, filterJk, filterAddress, filterAreaMin, filterAreaMax, filterAmountMin, filterAmountMax, filterDateFrom, filterDateTo]);

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
    } catch (err) {
      setClients(prev => prev.map(c => c.id === original.id ? original : c));
      setSaveError(err instanceof Error ? err.message : "Ошибка сохранения");
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch("/api/clients/" + category + "/" + id, { method: "DELETE" });
    if (res.ok) setClients(prev => prev.filter(c => c.id !== id));
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every(c => selectedIds.has(c.id));
  const handleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) filtered.forEach(c => next.delete(c.id));
      else filtered.forEach(c => next.add(c.id));
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/clients/" + category, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [...selectedIds] }) });
      if (res.ok) {
        setClients(prev => prev.filter(c => !selectedIds.has(c.id)));
        exitDeleteMode();
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const categoryLabel = CATEGORY_LABELS[category] || category;

  return (
    <div>
      {saveError && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <span>Не удалось сохранить: {saveError}</span>
          <button onClick={() => setSaveError(null)} className="text-red-500 hover:text-red-700 shrink-0"><X className="w-4 h-4" /></button>
        </div>
      )}
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          {onBack && (
            <button onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all">
              <ArrowLeft className="w-4 h-4" />Назад к категориям
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-900">Клиенты · {categoryLabel}{propertyType ? " · " + RENT_CATEGORY_LABELS[propertyType] : ""}</h1>
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
                { value: "В процессе", label: "В процессе" },
                { value: "Завершено", label: "Завершено" },
                { value: "Отказ", label: "Отказ" },
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
              <Combobox value={filterRooms} onChange={setFilterRooms} options={uniqueRooms} placeholder="Любые" />
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
              <label className="text-xs text-gray-500 mb-1 block">ЖК</label>
              <Combobox value={filterJk} onChange={setFilterJk} options={uniqueJk} placeholder="Любой" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Брокер</label>
              <Combobox value={filterBroker} onChange={setFilterBroker} options={brokerNames} placeholder={brokerNames.length ? "Любой" : "Нет сотрудников"} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Бюджет, ₸</label>
              <div className="flex items-center gap-2">
                <Input value={filterAmountMin} onChange={e => setFilterAmountMin(e.target.value)} placeholder="От" type="number" className="h-9 w-full text-sm" />
                <span className="text-xs text-gray-400">—</span>
                <Input value={filterAmountMax} onChange={e => setFilterAmountMax(e.target.value)} placeholder="До" type="number" className="h-9 w-full text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Дата</label>
              <div className="flex items-center gap-2">
                <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="h-9 w-full text-sm" />
                <span className="text-xs text-gray-400">—</span>
                <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="h-9 w-full text-sm" />
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">Всего</p><p className="text-2xl font-bold text-gray-900 mt-0.5">{categoryClients.length}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">В процессе</p><p className="text-2xl font-bold text-yellow-600 mt-0.5">{categoryClients.filter(c => c.completed === "В процессе").length}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">Завершено</p><p className="text-2xl font-bold text-green-600 mt-0.5">{categoryClients.filter(c => c.completed === "Завершено").length}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">Отказы</p><p className="text-2xl font-bold text-red-500 mt-0.5">{categoryClients.filter(c => c.completed === "Отказ").length}</p></div>
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
          <button onClick={() => { setLoading(true); setError(null); fetchClients(); }} className="ml-3 underline text-red-600 hover:text-red-800">Повторить</button>
        </div>
      )}

      {/* Clients table */}
      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="overflow-y-auto max-h-[60vh]">
          <table className="w-full table-fixed text-center">
            <colgroup>
              <col className="w-[15%]" />
              <col className="w-[9%]" />
              <col className="w-[7%]" />
              <col className="w-[8%]" />
              <col className="w-[12%]" />
              <col className="w-[9%]" />
              <col className="w-[9%]" />
              <col className="w-[11%]" />
              <col className="w-[8%]" />
              <col className="w-[9%]" />
              <col className="w-[3%]" />
            </colgroup>
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide rounded-tl-xl sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Клиент</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Район</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Комнат</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Площадь</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Адрес</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">ЖК</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Брокер</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Бюджет</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Дата</th>
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-6 py-16 text-center text-gray-400">
                    <p className="text-lg">Нет клиентов</p>
                    <p className="text-sm mt-1">{categoryClients.length === 0 ? "Нажмите «Добавить клиента»" : "Попробуйте изменить фильтры"}</p>
                    {categoryClients.length > 0 && (
                      <button onClick={resetAllFilters} className="mt-2 text-blue-500 hover:text-blue-600 text-sm">Сбросить фильтры</button>
                    )}
                  </td>
                </tr>
              )}
              {filtered.map(c => (
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
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-start gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                        {getInitials(c.name)}
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="text-sm font-medium text-gray-900">{c.name || "—"}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 shrink-0" />{c.phone || "—"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600 break-words">{c.district || "—"}</td>
                  <td className="px-3 py-3 text-sm text-gray-600">{c.rooms || "—"}</td>
                  <td className="px-3 py-3 text-sm text-gray-600">{c.area ? c.area + " м²" : "—"}</td>
                  <td className="px-3 py-3 text-sm text-gray-500 break-words">{c.address || "—"}</td>
                  <td className="px-3 py-3 text-sm text-gray-500 break-words">{c.jk || "—"}</td>
                  <td className="px-3 py-3 text-sm text-gray-500 break-words">{c.broker || "—"}</td>
                  <td className="px-3 py-3 text-sm font-semibold text-gray-900" onClick={e => e.stopPropagation()}>
                    {c.amount ? c.amount.toLocaleString() + " ₸" : "—"}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-500">{c.date || "—"}</td>
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <Badge className={"text-xs " + (completedColors[c.completed] || "bg-gray-100 text-gray-700")}>
                      {c.completed || "—"}
                    </Badge>
                  </td>
                  <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
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
            <span>Показано: {filtered.length} из {categoryClients.length} клиентов</span>
            {hasActiveFilters && (
              <button onClick={resetAllFilters} className="text-blue-500 hover:text-blue-600">Сбросить всё</button>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showAdd && <ClientFormModal defaultType={propertyType ? RENT_CATEGORY_LABELS[propertyType] : ""} onClose={() => setShowAdd(false)} onSave={handleAdd} />}
      {editClient && <ClientFormModal client={editClient} onClose={() => setEditClient(null)} onSave={handleEdit} />}
      {viewClient && <ViewClientModal client={viewClient} category={category} isAdmin={isAdmin} onClose={() => setViewClient(null)} onEdit={() => { setEditClient(viewClient); setViewClient(null); }} onAssign={() => setAssignClient(viewClient)} />}
      {assignClient && <AssignTaskModal clientName={assignClient.name || ""} onClose={() => setAssignClient(null)} />}

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