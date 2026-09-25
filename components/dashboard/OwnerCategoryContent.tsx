"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useEscapeKey } from "@/lib/use-escape";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Trash2, Edit3, Filter, X, Eye, Phone, MapPin, Home, CalendarDays, Banknote, FileText, Paperclip, User, Ruler, Building, Building2, Loader2, ArrowLeft, Check, ChevronDown, CheckSquare, Square, CheckCircle2, type LucideIcon } from "lucide-react";
import Combobox from "@/components/Combobox";
import DatePicker from "@/components/DatePicker";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import ConfirmDialog from "@/components/ConfirmDialog";
import PhoneInput, { maskKzPhone, phoneToWa } from "@/components/PhoneInput";
import MoneyInput from "@/components/MoneyInput";
import FileUploader, { type AttachmentFile } from "@/components/FileUploader";
import PillSettingsGear, { usePillVisibility } from "@/components/PillSettingsGear";
import { formatMoney } from "@/lib/format";
import { SHYMKENT_DISTRICTS, SHYMKENT_JK } from "@/lib/shymkent";
import { useProfile, profileName } from "@/lib/profile-context";
import { OWNER_CATEGORY_LABELS, type OwnerCategory } from "@/components/dashboard/OwnerCategorySelector";

interface Owner {
  id: number;
  name: string;
  phone?: string;
  district?: string;
  address?: string;
  jk?: string;
  rooms?: string;
  area?: string;
  area_unit?: string;
  house_area?: string;
  land_area?: string;
  price?: number;
  contract_type?: string;
  contract_kind?: string;
  status?: string;
  condition?: string;
  location_line?: string;
  premise_type?: string;
  finishing?: string;
  notes?: string;
  broker?: string;
  documents?: string;
  date?: string;
  created_at: string;
}

const OWNER_STATUSES = ["Новый собственник", "Оценка объекта", "Заключение договора", "Упаковка + Маркетинг", "Сделка"];

const completedColors: Record<string, string> = {
  "Новый собственник": "bg-violet-100 text-violet-800",
  "Оценка объекта": "bg-sky-100 text-sky-800",
  "Заключение договора": "bg-indigo-100 text-indigo-800",
  "Упаковка + Маркетинг": "bg-teal-100 text-teal-800",
  "Сделка": "bg-green-100 text-green-800",
};

const STATUS_STAT_COLORS: Record<string, string> = {
  "Новый собственник": "text-violet-600",
  "Оценка объекта": "text-sky-600",
  "Заключение договора": "text-indigo-600",
  "Упаковка + Маркетинг": "text-teal-600",
  "Сделка": "text-green-600",
};

const CONDITIONS = ["Новое", "Хорошее", "Требует ремонта"];
const LOCATION_LINES = ["1 линия (вдоль главной дороги)", "2 линия (второстепенная дорога, во дворе)"];
const PREMISE_TYPES = ["Отдельно стоящее здание", "В ЖК"];
const FINISHING_TYPES = ["Черновая", "С ремонтом"];
const CONTRACT_KINDS = ["Эксклюзивный", "Стандартный"];

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

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr || "";
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDateOnly(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr || "";
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

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
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-blue-600" /></div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{typeof value === 'number' ? value.toLocaleString("ru-RU") : value}</p>
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

function CardSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50/60 rounded-xl p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

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

// ====== FORM MODAL ======
function OwnerFormModal({ owner, category, onClose, onSave }: { owner?: Owner; category: OwnerCategory; onClose: () => void; onSave: (data: Record<string, unknown>) => void }) {
  useEscapeKey(onClose);
  const { currentProfile, allProfiles } = useProfile();
  const brokerNames = useMemo(() => allProfiles.map(p => profileName(p)).filter(Boolean).sort(), [allProfiles]);
  const [districtOptions, setDistrictOptions] = useState<string[]>(SHYMKENT_DISTRICTS);
  const [jkOptions, setJkOptions] = useState<string[]>(SHYMKENT_JK);
  const [name, setName] = useState(owner?.name || "");
  const [phone, setPhone] = useState(owner?.phone || "");
  const [district, setDistrict] = useState(owner?.district || "");
  const [address, setAddress] = useState(owner?.address || "");
  const [jk, setJk] = useState(owner?.jk || "");
  const [rooms, setRooms] = useState(owner?.rooms || "");
  const [area, setArea] = useState(owner?.area || "");
  const [areaUnit, setAreaUnit] = useState(owner?.area_unit || "сот");
  const [houseArea, setHouseArea] = useState(owner?.house_area || "");
  const [landArea, setLandArea] = useState(owner?.land_area || "");
  const [price, setPrice] = useState(owner?.price ? String(owner.price) : "");
  const [condition, setCondition] = useState(owner?.condition || "");
  const [locationLine, setLocationLine] = useState(owner?.location_line || "");
  const [premiseType, setPremiseType] = useState(owner?.premise_type || "");
  const [finishing, setFinishing] = useState(owner?.finishing || "");
  const [contractType, setContractType] = useState(owner?.contract_type || "");
  const [contractKind, setContractKind] = useState(owner?.contract_kind || "");
  const [status, setStatus] = useState(owner?.status || "Новый собственник");
  const [broker, setBroker] = useState(owner ? owner.broker || "" : profileName(currentProfile) || "");
  const [date, setDate] = useState(owner?.date ? toDateInputValue(owner.date) : new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(owner?.notes || "");
  const [documents, setDocuments] = useState<AttachmentFile[]>(() => {
    try {
      const p = JSON.parse(owner?.documents || "[]");
      return Array.isArray(p) ? p : [];
    } catch {
      return owner?.documents ? [{ name: owner.documents, url: owner.documents }] : [];
    }
  });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetch("/api/districts").then(r => r.json()).then((d: { name: string }[]) => { if (d.length) setDistrictOptions(d.map(x => x.name)); }).catch(() => {});
    fetch("/api/residential-complexes").then(r => r.json()).then((c: { name: string }[]) => { if (c.length) setJkOptions(c.map(x => x.name)); }).catch(() => {});
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setFormError("Введите имя собственника"); return; }
    setFormError("");
    const payload: Record<string, unknown> = {
      name, phone, district, address, rooms, area,
      area_unit: category === "zemlya" ? areaUnit : areaUnit,
      house_area: category === "doma" ? houseArea : "",
      land_area: category === "doma" ? landArea : "",
      price: parseInt(price) || 0,
      condition, location_line: locationLine,
      premise_type: premiseType, finishing,
      contract_type: contractType, contract_kind: contractKind,
      status, broker, date: fromDateInputValue(date), notes, documents: JSON.stringify(documents),
    };
    if (category === "kvartiry") payload.jk = jk;
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b shrink-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-bold">{owner ? "Редактировать собственника" : "Новый собственник"}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <form id="owner-form" onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500 mb-1 block">Имя собственника *</label><Input value={name} onChange={e => setName(e.target.value)} placeholder="ФИО" className="text-sm" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Телефон</label><PhoneInput value={phone} onChange={setPhone} /></div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Район</label>
              <Combobox value={district} onChange={setDistrict} options={districtOptions} placeholder="Выберите район Шымкента" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Адрес</label>
              <AddressAutocomplete value={address} onChange={setAddress} placeholder="г. Шымкент, ул., дом" />
            </div>
            <div><label className="text-xs text-gray-500 mb-1 block">Дата обращения</label><Input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-sm" /></div>
            {category === "kvartiry" && (
              <>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Жилой комплекс</label>
                  <Combobox value={jk} onChange={setJk} options={jkOptions} placeholder="Выберите или введите жилой комплекс" />
                </div>
                <div><label className="text-xs text-gray-500 mb-1 block">Кол-во комнат</label><Input value={rooms} onChange={e => setRooms(e.target.value)} placeholder="Кол-во комнат" className="text-sm" /></div>
              </>
            )}
            {category === "doma" && (
              <>
                <div><label className="text-xs text-gray-500 mb-1 block">Кол-во комнат</label><Input value={rooms} onChange={e => setRooms(e.target.value)} placeholder="Кол-во комнат" className="text-sm" /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">Площадь дома, м²</label><Input value={houseArea} onChange={e => setHouseArea(e.target.value)} placeholder="120" className="text-sm" /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">Площадь участка, сот</label><Input value={landArea} onChange={e => setLandArea(e.target.value)} placeholder="10" className="text-sm" /></div>
              </>
            )}
            {category === "pomescheniya" && (
              <>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Тип помещения</label>
                  <Select label="Не указано" value={premiseType} onChange={setPremiseType} options={PREMISE_TYPES} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Расположение коммерции</label>
                  <Select label="Не указано" value={locationLine} onChange={setLocationLine} options={LOCATION_LINES} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Отделка</label>
                  <Select label="Не указано" value={finishing} onChange={setFinishing} options={FINISHING_TYPES} />
                </div>
              </>
            )}
            {(category === "zemlya") && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Площадь</label>
                <div className="flex gap-2">
                  <Input value={area} onChange={e => setArea(e.target.value)} type="number" placeholder="10" className="text-sm" />
                  <select value={areaUnit} onChange={e => setAreaUnit(e.target.value)} className="h-9 rounded-lg border px-2 text-sm shrink-0">
                    <option value="сот">Сотки</option>
                    <option value="га">Гектары</option>
                  </select>
                </div>
              </div>
            )}
            {(category === "kvartiry" || category === "pomescheniya") && <div><label className="text-xs text-gray-500 mb-1 block">Площадь, м²</label><Input value={area} onChange={e => setArea(e.target.value)} placeholder="120" className="text-sm" /></div>}
            <div><label className="text-xs text-gray-500 mb-1 block">Цена, ₸</label><MoneyInput value={price} onChange={setPrice} placeholder="20 000 000" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Тип договора</label><Input value={contractType} onChange={e => setContractType(e.target.value)} placeholder="Агентский, ..." className="text-sm" /></div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Вид договора</label>
              <Select label="Не указано" value={contractKind} onChange={setContractKind} options={CONTRACT_KINDS} />
            </div>
            {(category === "kvartiry" || category === "doma") && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Состояние</label>
                <Select label="Не указано" value={condition} onChange={setCondition} options={CONDITIONS} />
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Статус</label>
              <Select label="Без статуса" value={status} onChange={setStatus} options={OWNER_STATUSES} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Брокер</label>
              <Combobox value={broker} onChange={setBroker} options={brokerNames} placeholder={brokerNames.length ? "Выберите сотрудника" : "Нет сотрудников — введите имя"} />
            </div>
          </div>
          <div><label className="text-xs text-gray-500 mb-1 block">Заметки</label><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Дополнительная информация..." rows={2} className="w-full rounded-lg border px-3 py-2 text-sm resize-y" /></div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <FileUploader title="Документы" files={documents} onChange={setDocuments} />
        </form>
        <div className="shrink-0 flex items-center justify-end gap-2 p-4 border-t bg-white">
          <Button variant="outline" type="button" onClick={onClose} className="px-6">Отмена</Button>
          <Button type="submit" form="owner-form" className="bg-blue-600 px-8">{owner ? "Сохранить" : "Добавить"}</Button>
        </div>
      </div>
    </div>
  );
}

// ====== COMPLETE DEAL MODAL ======
function OwnerCompleteDealModal({ owner, category, onClose, onDone }: { owner: Owner; category: OwnerCategory; onClose: () => void; onDone: (data: { contract: string; amount: number; completion_date: string }) => void }) {
  const [contract, setContract] = useState("");
  useEscapeKey(onClose);
  const [amount, setAmount] = useState(owner.price ? String(owner.price) : "");  const [completionDate, setCompletionDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract.trim()) return setError("Укажите номер договора");
    if (!amount) return setError("Укажите сумму сделки");
    setLoading(true);
    setError("");
    onDone({
      contract: contract.trim(),
      amount: parseFloat(amount) || 0,
      completion_date: completionDate,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Завершить сделку</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="text-sm text-gray-500 space-y-1">
            <p>Собственник: <span className="font-medium text-gray-800">{owner.name || "Без имени"}</span></p>
            <p>Категория: <span className="font-medium text-gray-800">{OWNER_CATEGORY_LABELS[category]}</span></p>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Номер договора *</label>
            <Input value={contract} onChange={e => setContract(e.target.value)} placeholder="Например: ПК-2026-001" className="text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Сумма сделки, ₸ *</label>
            <MoneyInput value={amount} onChange={setAmount} placeholder="25 000 000" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Дата завершения</label>
            <DatePicker value={completionDate} onChange={setCompletionDate} placeholder="Выберите дату" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" type="button" onClick={onClose} size="sm">Отмена</Button>
            <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700 gap-2" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {loading ? "Завершение..." : "Завершить"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ====== VIEW MODAL ======
function ViewOwnerModal({ owner, category, onClose, onEdit, onComplete }: { owner: Owner; category: OwnerCategory; onClose: () => void; onEdit: () => void; onComplete: () => void }) {
  useEscapeKey(onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b shrink-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900 truncate">{owner.name || "Без имени"}</h2>
              <div className="flex items-center gap-3 mt-2">
                <Badge className={"text-sm px-3 py-1 " + (completedColors[owner.status || ""] || "bg-gray-100 text-gray-700")}>
                  {owner.status || "Без статуса"}
                </Badge>
                <span className="text-sm text-gray-500 flex items-center gap-1"><CalendarDays className="w-4 h-4" />{owner.date ? formatDateOnly(owner.date) : formatDateOnly(owner.created_at)}</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {owner.status !== "Сделка" && (
                <Button className="bg-green-600 hover:bg-green-700" size="sm" onClick={onComplete}>
                  <CheckCircle2 className="w-4 h-4 mr-1" />Завершить сделку
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onEdit}><Edit3 className="w-4 h-4 mr-1" />Редактировать</Button>
              <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          <CardSection title="Объект">
            <DetailItem icon={Home} label="Тип недвижимости" value={OWNER_CATEGORY_LABELS[category]} />
            <DetailItem icon={MapPin} label="Район" value={owner.district} />
            <DetailItem icon={MapPin} label="Адрес" value={owner.address} />
            {category === "kvartiry" && <DetailItem icon={Building} label="Жилой комплекс" value={owner.jk} />}
            {(category === "kvartiry" || category === "doma") && <DetailItem icon={Home} label="Кол-во комнат" value={owner.rooms} />}
            {category === "kvartiry" && <DetailItem icon={Ruler} label="Площадь" value={owner.area ? owner.area + " м²" : null} />}
            {category === "pomescheniya" && (
              <>
                <DetailItem icon={Ruler} label="Площадь" value={owner.area ? owner.area + " м²" : null} />
                <DetailItem icon={Building2} label="Тип помещения" value={owner.premise_type} />
                <DetailItem icon={MapPin} label="Расположение коммерции" value={owner.location_line} />
                <DetailItem icon={Home} label="Отделка" value={owner.finishing} />
              </>
            )}
            {category === "doma" && (
              <>
                <DetailItem icon={Ruler} label="Площадь дома" value={owner.house_area ? owner.house_area + " м²" : null} />
                <DetailItem icon={Ruler} label="Площадь участка" value={owner.land_area ? owner.land_area + " сот" : null} />
              </>
            )}
            {category === "zemlya" && <DetailItem icon={Ruler} label="Площадь" value={owner.area ? owner.area + " " + (owner.area_unit || "сот") : null} />}
            {owner.condition && <DetailItem icon={Home} label="Состояние" value={owner.condition} />}
          </CardSection>
          <CardSection title="Договор и цена">
            <DetailItem icon={Banknote} label="Цена" value={owner.price ? formatMoney(owner.price) : null} />
            <DetailItem icon={CalendarDays} label="Дата обращения" value={owner.date ? formatDateOnly(owner.date) : formatDateOnly(owner.created_at)} />
            <DetailItem icon={FileText} label="Тип договора" value={owner.contract_type} />
            {owner.contract_kind && <DetailItem icon={FileText} label="Вид договора" value={owner.contract_kind} />}
          </CardSection>
          <CardSection title="Контакт">
            <DetailItem icon={Phone} label="Телефон" value={owner.phone ? maskKzPhone(owner.phone) : null} />
            <DetailItem icon={User} label="Брокер" value={owner.broker} />
          </CardSection>
          {owner.notes && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><FileText className="w-3.5 h-3.5" />Заметки</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{owner.notes}</p>
            </div>
          )}
          {(owner.documents || "").trim() && ((() => {
            try {
              const docs = JSON.parse(owner.documents || "[]");
              if (!Array.isArray(docs) || !docs.length) return null;
              return (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" />Документы</p>
                  <ul className="space-y-1.5">
                    {docs.map((d: { name: string; url: string }, i: number) => (
                      <li key={i}>
                        <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1.5 truncate"><FileText className="w-3.5 h-3.5 shrink-0" />{d.name}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            } catch {
              return null;
            }
          })())}
        </div>
      </div>
    </div>
  );
}

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