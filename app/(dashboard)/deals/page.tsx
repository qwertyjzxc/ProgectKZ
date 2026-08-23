"use client";

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Combobox from "@/components/Combobox";
import { SHYMKENT_DISTRICTS, SHYMKENT_JK } from "@/lib/shymkent";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Trash2, Edit3, Filter, X, Loader2, Check, Banknote, CalendarDays, Square, CheckSquare, ArrowLeft, History, ListTodo, Upload, FileText } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import DealCategorySelector from "@/components/DealCategorySelector";
import DealTypeSelector, { DEAL_CATEGORY_LABELS } from "@/components/DealTypeSelector";
import AssignTaskModal from "@/components/AssignTaskModal";
import type { ActivityEntry } from "@/lib/activity";

interface Deal {
  id: number;
  name: string;
  client: string;
  amount: number;
  stage: string;
  date: string;
  type: string;
  category: string;
  area?: string;
  area_unit?: string;
  address?: string;
  jk?: string;
  contract?: string;
  phone?: string;
  district?: string;
  rooms?: string;
  furniture?: string;
  rental_period?: string;
  who_lives?: string;
  people_count?: number;
  notes?: string;
  completed?: string;
  broker?: string;
  layout?: string;
  renter_type?: string;
  payment?: string;
  plot_type?: string;
  purpose?: string;
  communications?: string;
  access?: string;
  plot_shape?: string;
  relief?: string;
  documents?: string;
  restrictions?: string;
  finishing?: string;
  created_at: string;
}

type EditableDeal = Pick<Deal, 'id' | 'name' | 'client' | 'amount' | 'stage' | 'date' | 'type' | 'category'>;
type DealFormData = Pick<Deal, 'name' | 'client' | 'amount' | 'stage' | 'date' | 'type' | 'category'>;

const stageColors: Record<string, string> = {
  "Сделка закрыта": "bg-green-100 text-green-800",
  "Переговоры": "bg-blue-100 text-blue-800",
  "Показ": "bg-yellow-100 text-yellow-800",
  "Ожидание": "bg-gray-100 text-gray-700",
  "Первичный контакт": "bg-purple-100 text-purple-800",
};

const DEAL_STATUSES = [
  "В процессе", "Завершено", "Отказ",
  "Заморожено", "Подписание договора", "Оплата",
  "VIP Клиент", "Перспективный", "Думает", "Проблемный",
  "Новый собственник", "Оценка объекта", "Заключение договора", "Упаковка + Маркетинг", "Сделка",
];

const completedColors: Record<string, string> = {
  "В процессе": "bg-yellow-100 text-yellow-800",
  "Завершено": "bg-green-100 text-green-800",
  "Отказ": "bg-red-100 text-red-800",
  "Заморожено": "bg-blue-100 text-blue-800",
  "Подписание договора": "bg-indigo-100 text-indigo-800",
  "Оплата": "bg-cyan-100 text-cyan-800",
  "VIP Клиент": "bg-amber-100 text-amber-800",
  "Перспективный": "bg-emerald-100 text-emerald-800",
  "Думает": "bg-orange-100 text-orange-800",
  "Проблемный": "bg-rose-100 text-rose-800",
  "Новый собственник": "bg-violet-100 text-violet-800",
  "Оценка объекта": "bg-sky-100 text-sky-800",
  "Заключение договора": "bg-indigo-100 text-indigo-800",
  "Упаковка + Маркетинг": "bg-teal-100 text-teal-800",
  "Сделка": "bg-green-100 text-green-800",
};

const TYPE_LABELS: Record<string, string> = {
  kvartiry: "Квартиры",
  pomescheniya: "Помещения",
  zemlya: "Земля",
};

const COMMUNICATIONS_OPTIONS = ["Свет", "Вода", "Газ", "Интернет"];

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr || "";
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

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

function DealFormModal({ deal, onClose, onSave, dealType, category }: { deal?: EditableDeal; onClose: () => void; onSave: (d: any) => void; dealType?: string; category?: string }) {
  const [type, setType] = useState((deal as any)?.type || "Квартира");
  const [area, setArea] = useState((deal as any)?.area || "");
  const [areaUnit, setAreaUnit] = useState((deal as any)?.area_unit || "сот");
  const [address, setAddress] = useState((deal as any)?.address || "");
  const [jk, setJk] = useState((deal as any)?.jk || "");
  const [contract, setContract] = useState((deal as any)?.contract || "");
  const [date, setDate] = useState(deal?.date || new Date().toLocaleString("ru-RU").replace(",", "").slice(0, 16));
  const [name, setName] = useState(deal?.name || "");
  const [phone, setPhone] = useState((deal as any)?.phone || "");
  const [district, setDistrict] = useState((deal as any)?.district || "");
  const [districtOptions, setDistrictOptions] = useState<string[]>(SHYMKENT_DISTRICTS);
  const [jkOptions, setJkOptions] = useState<string[]>(SHYMKENT_JK);
  const [rooms, setRooms] = useState((deal as any)?.rooms || "");
  const [amount, setAmount] = useState(deal?.amount ? String(deal.amount) : "");
  const [furniture, setFurniture] = useState((deal as any)?.furniture || "");
  const [rentalPeriod, setRentalPeriod] = useState((deal as any)?.rental_period || "");
  const [whoLives, setWhoLives] = useState((deal as any)?.who_lives || "");
  const [peopleCount, setPeopleCount] = useState((deal as any)?.people_count ? String((deal as any).people_count) : "1");
  const [notes, setNotes] = useState((deal as any)?.notes || "");
  const [completed, setCompleted] = useState((deal as any)?.completed || "В процессе");
  const [broker, setBroker] = useState((deal as any)?.broker || "");
  const [layout, setLayout] = useState((deal as any)?.layout || "");
  const [renterType, setRenterType] = useState((deal as any)?.renter_type || "");
  const [payment, setPayment] = useState((deal as any)?.payment || "");
  const [finishing, setFinishing] = useState((deal as any)?.finishing || "");
  const [premiseType, setPremiseType] = useState((deal as any)?.premise_type || "Отдельно стоящее здание");
  const [plotType, setPlotType] = useState((deal as any)?.plot_type || "");
  const [purpose, setPurpose] = useState((deal as any)?.purpose || "");
  const [communications, setCommunications] = useState<string[]>(() => {
    const raw = (deal as any)?.communications;
    return raw ? String(raw).split(",").map((s: string) => s.trim()).filter(Boolean) : [];
  });
  const [access, setAccess] = useState((deal as any)?.access || "");
  const [plotShape, setPlotShape] = useState((deal as any)?.plot_shape || "");
  const [relief, setRelief] = useState((deal as any)?.relief || "");
  const [documents, setDocuments] = useState<{ name: string; url: string }[]>(() => {
    const raw = (deal as any)?.documents;
    if (!raw) return [];
    try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return raw ? [{ name: raw, url: raw }] : []; }
  });
  const [docUploading, setDocUploading] = useState(false);
  const [restrictions, setRestrictions] = useState((deal as any)?.restrictions || "");
  const dealCategory = (deal as any)?.category || category || "arenda";
  const isPomescheniya = (dealType || (deal as any)?.dealType) === "pomescheniya";
  const isZemlya = (dealType || (deal as any)?.dealType) === "zemlya";

  const toggleCommunications = (opt: string) => {
    setCommunications(prev => (prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]));
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setDocUploading(true);
    try {
      const fd = new FormData();
      for (const f of Array.from(files)) fd.append("files", f);
      const res = await fetch("/api/deals/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.files?.length) setDocuments(prev => [...prev, ...data.files]);
    } catch { /* ignore */ }
    setDocUploading(false);
    e.target.value = "";
  };

  useEffect(() => {
    fetch("/api/districts")
      .then(r => r.json())
      .then((data: { name: string }[]) => { if (data.length) setDistrictOptions(data.map(d => d.name)); })
      .catch(() => {});
    fetch("/api/residential-complexes")
      .then(r => r.json())
      .then((data: { name: string }[]) => { if (data.length) setJkOptions(data.map(j => j.name)); })
      .catch(() => {});
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      type, area, address, jk, contract, date, name, phone, district, rooms,
      amount: parseInt(amount) || 0, furniture, rental_period: rentalPeriod,
      who_lives: whoLives, people_count: parseInt(peopleCount) || 1, notes, completed, broker,
      layout, renter_type: renterType, payment, finishing, premise_type: premiseType,
      plot_type: plotType, purpose, communications: communications.join(", "), access, plot_shape: plotShape, relief, documents: JSON.stringify(documents), restrictions,
      area_unit: areaUnit,
      stage: "Первичный контакт",
      category: dealCategory, dealType: dealType || "kvartiry",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="text-lg font-bold">{deal ? "Редактировать сделку" : "Новая сделка"}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500 mb-1 block">Имя</label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Фамилия Имя" required className="text-sm" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Телефон</label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7..." className="text-sm" /></div>
            <div>
              {isZemlya ? (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Тип недвижимости</label>
                  <Input value="Участок" disabled className="text-sm" />
                </div>
              ) : isPomescheniya ? (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Тип помещения</label>
                  <select value={premiseType} onChange={e => { setPremiseType(e.target.value); if (e.target.value === "Отдельно стоящее здание") setFinishing("С ремонтом"); }} className="w-full h-9 rounded-lg border px-3 text-sm"><option>Отдельно стоящее здание</option><option>В Жилом Комплексе</option></select>
                </div>
              ) : (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Тип недвижимости</label>
                  <select value={type} onChange={e => setType(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option>Квартира</option><option>Дома</option><option>Помещения</option></select>
                </div>
              )}
            </div>
            <div><label className="text-xs text-gray-500 mb-1 block">Дата и время</label><Input value={date} readOnly className="text-sm bg-gray-50 cursor-not-allowed" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Район</label><Combobox value={district} onChange={setDistrict} options={districtOptions} placeholder="Выберите район" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Адрес</label><Input value={address} onChange={e => setAddress(e.target.value)} placeholder="ул., дом, кв." className="text-sm" /></div>
            {!isPomescheniya && !isZemlya && <div><label className="text-xs text-gray-500 mb-1 block">Жилой комплекс</label><Combobox value={jk} onChange={setJk} options={jkOptions} placeholder="Выберите ЖК" /></div>}
            {!isPomescheniya && !isZemlya && <div><label className="text-xs text-gray-500 mb-1 block">Кол-во комнат</label><Input value={rooms} onChange={e => setRooms(e.target.value)} placeholder="2" className="text-sm" /></div>}
            {isZemlya ? (
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
            ) : (
              <div><label className="text-xs text-gray-500 mb-1 block">Площадь, м²</label><Input value={area} onChange={e => setArea(e.target.value)} placeholder="120" className="text-sm" /></div>
            )}
            <div><label className="text-xs text-gray-500 mb-1 block">Бюджет, ₸</label><Input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="25000000" className="text-sm" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Номер договора</label><Input value={contract} onChange={e => setContract(e.target.value)} placeholder="№ договора" className="text-sm" /></div>
            {isZemlya ? (
              <>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Участок под</label>
                  <select value={plotType} onChange={e => setPlotType(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Не указано</option><option>Бизнес</option><option>ИЖС</option></select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Назначение</label>
                  <select value={purpose} onChange={e => setPurpose(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Не указано</option><option>ИЖС</option><option>Коммерция</option><option>Производство</option></select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Коммуникации</label>
                  <div className="flex flex-wrap gap-2">
                    {COMMUNICATIONS_OPTIONS.map(opt => {
                      const checked = communications.includes(opt);
                      return (
                        <label key={opt} className={"flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm cursor-pointer select-none transition-colors " + (checked ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300")}>
                          <input type="checkbox" checked={checked} onChange={() => toggleCommunications(opt)} className="accent-blue-600 w-4 h-4" />
                          {opt}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Подъездные пути</label>
                  <select value={access} onChange={e => setAccess(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Не указано</option><option>Вдоль дороги</option><option>Внутри</option></select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Форма участка</label>
                  <select value={plotShape} onChange={e => setPlotShape(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Не указано</option><option>Ровный</option><option>Прямоугольный</option><option>Нестандартная форма</option></select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Рельеф</label>
                  <select value={relief} onChange={e => setRelief(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Не указано</option><option>Ровный</option><option>Есть холмы</option></select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Документы</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 space-y-2">
                    {documents.length > 0 && (
                      <div className="space-y-1.5">
                        {documents.map((doc, i) => (
                          <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 group">
                            <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate flex-1">{doc.name}</a>
                            <button type="button" onClick={() => setDocuments(prev => prev.filter((_, idx) => idx !== i))} className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label className={"flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors " + (docUploading ? "bg-gray-50 text-gray-400" : "hover:bg-blue-50 hover:border-blue-300 text-gray-500 hover:text-blue-600")}>
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">{docUploading ? "Загрузка..." : "Загрузить файл"}</span>
                      <input type="file" multiple className="hidden" onChange={handleDocUpload} disabled={docUploading} />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Ограничения</label>
                  <select value={restrictions} onChange={e => setRestrictions(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Не указано</option><option>Делимый</option><option>Неделимый</option></select>
                </div>
              </>
            ) : isPomescheniya ? (
              <>
                {premiseType === "В Жилом Комплексе" && (
                  <div><label className="text-xs text-gray-500 mb-1 block">Жилой комплекс</label><Combobox value={jk} onChange={setJk} options={jkOptions} placeholder="Выберите ЖК" /></div>
                )}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Отделка</label>
                  <select value={finishing} onChange={e => setFinishing(e.target.value)} disabled={premiseType === "Отдельно стоящее здание"} className="w-full h-9 rounded-lg border px-3 text-sm disabled:bg-gray-100"><option value="">Не указано</option><option>Черновая</option><option>С ремонтом</option></select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Планировка</label>
                  <select value={layout} onChange={e => setLayout(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Не указано</option><option>Open space</option><option>Кабинетная система</option></select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Меблировка</label>
                  <select value={furniture} onChange={e => setFurniture(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Не указано</option><option>Есть</option><option>Отсутствует</option><option>Частично</option></select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Кто арендует</label>
                  <select value={renterType} onChange={e => setRenterType(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Не указано</option><option>Физ лицо</option><option>Юр лицо</option></select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Способ оплаты</label>
                  <select value={payment} onChange={e => setPayment(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Не указано</option><option>Наличные</option><option>Перевод</option></select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Меблировка</label>
                  <select value={furniture} onChange={e => setFurniture(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Не указано</option><option>Полная</option><option>Частичная</option><option>Без мебели</option></select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Срок аренды</label>
                  <select value={rentalPeriod} onChange={e => setRentalPeriod(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Не указано</option><option>Долгосрочно</option><option>Краткосрочно</option><option>Посуточно</option></select>
                </div>
                <div><label className="text-xs text-gray-500 mb-1 block">Кто будет проживать</label><Input value={whoLives} onChange={e => setWhoLives(e.target.value)} placeholder="Семья, один..." className="text-sm" /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">Кол-во человек</label><Input value={peopleCount} onChange={e => setPeopleCount(e.target.value)} type="number" placeholder="1" className="text-sm" /></div>
              </>
            )}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Статус</label>
              <select value={completed} onChange={e => setCompleted(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Без статуса</option>{DEAL_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
            </div>
            <div><label className="text-xs text-gray-500 mb-1 block">Брокер</label><Input value={broker} onChange={e => setBroker(e.target.value)} placeholder="Имя брокера" className="text-sm" /></div>
          </div>
          <div><label className="text-xs text-gray-500 mb-1 block">Заметки</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Заметки..." className="w-full rounded-lg border px-3 py-2 text-sm resize-y" /></div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" type="button" onClick={onClose} size="sm">Отмена</Button>
            <Button type="submit" size="sm" className="bg-blue-600">{deal ? "Сохранить" : "Добавить"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DealsContent({ dealType, category, onBack }: { dealType?: string; category?: string; onBack?: () => void }) {
  const isPomescheniya = dealType === "pomescheniya";
  const isZemlya = dealType === "zemlya";
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editDeal, setEditDeal] = useState<EditableDeal | null>(null);
  const [viewDeal, setViewDeal] = useState<Deal | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState("");
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
  const totalCols = (isZemlya ? 11 : isPomescheniya ? 14 : 12) + (deleteMode ? 1 : 0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityDeleteTarget, setActivityDeleteTarget] = useState<ActivityEntry | null>(null);
  const [showTask, setShowTask] = useState(false);
  const dragRef = useRef(false);

  useEffect(() => {
    const up = () => { dragRef.current = false; };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  useEffect(() => {
    fetch("/api/districts")
      .then(r => r.json())
      .then((data: { name: string }[]) => { if (data.length) setDistrictOptions(data.map(d => d.name)); })
      .catch(() => {});
    fetch("/api/residential-complexes")
      .then(r => r.json())
      .then((data: { name: string }[]) => { if (data.length) setJkOptions(data.map(j => j.name)); })
      .catch(() => {});
  }, []);

  const loadActivity = useCallback((dealId: number) => {
    setActivityLoading(true);
    fetch("/api/activity?client_table=deals&client_id=" + dealId)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setActivity(data); })
      .catch(() => {})
      .finally(() => setActivityLoading(false));
  }, []);

  useEffect(() => {
    if (viewDeal) loadActivity(viewDeal.id);
  }, [viewDeal, loadActivity]);

  const handleDeleteActivity = async () => {
    if (!activityDeleteTarget) return;
    try {
      const res = await fetch("/api/activity/" + activityDeleteTarget.id, { method: "DELETE" });
      if (!res.ok) throw new Error("Ошибка удаления");
      setActivity(prev => prev.filter(a => a.id !== activityDeleteTarget.id));
      setActivityDeleteTarget(null);
    } catch {
      // ignore
    }
  };

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

  const filtered = useMemo(() => {
    let result = deals;
    if (searchQuery) {
      result = result.filter(d =>
        smartMatch(d.name, searchQuery) || smartMatch(d.phone, searchQuery) || smartMatch(d.district, searchQuery) || smartMatch(d.broker, searchQuery)
      );
    }
    if (filterClient) {
      result = result.filter(d => smartMatch(d.name, filterClient));
    }
    if (filterDistrict) {
      result = result.filter(d => smartMatch(d.district, filterDistrict));
    }
    if (filterRooms) result = result.filter(d => d.rooms === filterRooms);
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
    if (filterStage) result = result.filter(d => d.completed === filterStage);
    if (filterDateFrom) {
      const t = parseDateStr(filterDateFrom);
      if (!isNaN(t)) result = result.filter(d => parseDateStr(d.date) >= t);
    }
    if (filterDateTo) {
      const t = parseDateStr(filterDateTo);
      if (!isNaN(t)) result = result.filter(d => parseDateStr(d.date) <= t);
    }
    return result;
  }, [deals, searchQuery, filterClient, filterDistrict, filterRooms, filterAreaMin, filterAreaMax, filterAddress, filterJk, filterBroker, filterAmountMin, filterAmountMax, filterStage, filterDateFrom, filterDateTo]);

  const handleAdd = async (data: DealFormData) => {
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

  const handleEdit = async (data: DealFormData) => {
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

  const closedDeals = deals.filter(d => d.completed === "Завершено");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all">
              <ArrowLeft className="w-4 h-4" />Назад
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-900">Сделки</h1>
          {category && (
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">{DEAL_CATEGORY_LABELS[category] || category}</span>
              {dealType && <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">{TYPE_LABELS[dealType] || dealType}</span>}
            </div>
          )}
        </div>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" />Новая сделка
        </Button>
      </div>

      {saveError && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <span>Не удалось сохранить: {saveError}</span>
          <button onClick={() => setSaveError(null)} className="text-red-500 hover:text-red-700 shrink-0"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск по названию, клиенту..." className="pl-10 h-9 text-sm bg-white" />
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
                { value: "", label: "Все" },
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
              <Input value={filterRooms} onChange={e => setFilterRooms(e.target.value)} placeholder="Кол-во" className="h-9 text-sm bg-white" />
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

      {loading && <div className="bg-white rounded-xl shadow-sm border p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /><p className="text-gray-500 mt-2">Загрузка из Supabase...</p></div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">Ошибка: {error}<button onClick={() => { setLoading(true); setError(null); fetchDeals(); }} className="ml-3 underline text-red-600 hover:text-red-800">Повторить</button></div>}

      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border">
            <div className="overflow-y-auto max-h-[60vh]">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {deleteMode && (
                    <th className="px-4 py-3 w-10 sticky top-0 bg-gray-50 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-200">
                      <button onClick={handleSelectAll} className="text-gray-500 hover:text-blue-600 transition-colors" title={allVisibleSelected ? "Снять выделение" : "Выделить все"}>
                        {allVisibleSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                      </button>
                    </th>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase rounded-tl-xl sticky top-0 bg-gray-50 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-200"></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase sticky top-0 bg-gray-50 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-200">Клиент</th>
                  {isZemlya ? (
                    <>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase sticky top-0 bg-gray-50 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-200">Телефон</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase sticky top-0 bg-gray-50 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-200">Участок под</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase sticky top-0 bg-gray-50 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-200">Район</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase sticky top-0 bg-gray-50 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-200">Площадь</th>
                    </>
                  ) : isPomescheniya ? (
                    <>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase sticky top-0 bg-gray-50 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-200">Район</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase sticky top-0 bg-gray-50 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-200">Площадь</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell sticky top-0 bg-gray-50 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-200">Адрес</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase sticky top-0 bg-gray-50 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-200">Планировка</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase sticky top-0 bg-gray-50 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-200">Меблировка</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase sticky top-0 bg-gray-50 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-200">Кто арендует</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase sticky top-0 bg-gray-50 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-200">Оплата</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase sticky top-0 bg-gray-50 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-200">Район</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase sticky top-0 bg-gray-50 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-200">Комнат</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase sticky top-0 bg-gray-50 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-200">Площадь</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell sticky top-0 bg-gray-50 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-200">Адрес</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell sticky top-0 bg-gray-50 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-200">Жилой комплекс</th>
                    </>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase sticky top-0 bg-gray-50 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-200">Брокер</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase sticky top-0 bg-gray-50 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-200">Бюджет</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell sticky top-0 bg-gray-50 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-200">Дата</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase sticky top-0 bg-gray-50 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-200">Статус</th>
                  <th className="px-4 py-3 w-12 sticky top-0 bg-gray-50 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-200 rounded-tr-xl"></th>
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
                    onClick={() => { if (!deleteMode) setViewDeal(d); }}
                    className={
                      (deleteMode ? "cursor-pointer " : "cursor-pointer ") +
                      (isSelected ? "bg-red-100 hover:bg-red-200 " : deleteMode ? "hover:bg-red-100/50 " : "hover:bg-gray-50/60 ") +
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
                          href={`https://wa.me/${d.phone.replace(/[^0-9]/g, "").replace(/^8/, "7")}`}
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
                        <td className="px-4 py-3 text-sm text-gray-600">{d.phone || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{d.plot_type || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{d.district || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{d.area ? d.area + " " + (d.area_unit || "сот") : "—"}</td>
                      </>
                    ) : (
                      <td className="px-4 py-3 text-sm text-gray-600">{d.district || "—"}</td>
                    )}
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
                        <td className="px-4 py-3 text-sm text-gray-600">{d.rooms || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{d.area ? d.area + " м²" : "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{d.address || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{d.jk || "—"}</td>
                      </>
                    )}
                    <td className="px-4 py-3 text-sm text-gray-600">{d.broker || "—"}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {d.amount ? d.amount >= 1000000 ? (d.amount/1000000).toFixed(1) + " M ₸" : d.amount.toLocaleString() + " ₸" : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{d.date || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge className={"text-xs " + (completedColors[d.completed || ""] || "bg-gray-100 text-gray-700")}>
                        {d.completed || "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!deleteMode && (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center rounded-[min(var(--radius-md),12px)] border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none hover:bg-muted hover:text-foreground size-7 opacity-0 group-hover:opacity-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
                            <MoreHorizontal className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => setEditDeal({ ...d } as EditableDeal)}>
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
          <div className="border-t bg-gray-50/50 px-4 py-2 text-xs text-gray-400 rounded-b-xl">
            Показано: {filtered.length} из {deals.length} сделок
            {hasActiveFilters && <button onClick={resetAllFilters} className="ml-3 text-blue-500 hover:text-blue-600">Сбросить всё</button>}
          </div>
        </div>
      )}

      {showAdd && <DealFormModal onClose={() => setShowAdd(false)} onSave={handleAdd} dealType={dealType} category={category} />}
      {editDeal && <DealFormModal deal={editDeal} onClose={() => setEditDeal(null)} onSave={handleEdit} />}

      {viewDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onMouseDown={e => { if (e.target === e.currentTarget) setViewDeal(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b shrink-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-lg font-bold">Карточка сделки</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowTask(true)}>
                  <ListTodo className="w-4 h-4 mr-1" />Назначить задачу
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setViewDeal(null)}><X className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="flex-1 min-h-0 flex overflow-hidden">
              <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-lg font-bold shrink-0">
                    {(viewDeal.name || "?")[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{viewDeal.name || "—"}</h3>
                    <p className="text-sm text-gray-500">{viewDeal.client || "Без клиента"}</p>
                  </div>
                  <div className="ml-auto">
                    {viewDeal.completed && (
                      <span className={"inline-block px-3 py-1 rounded-full text-xs font-medium " + (completedColors[viewDeal.completed] || "bg-gray-100 text-gray-700")}>
                        {viewDeal.completed}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide">Стадия</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.stage || "—"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide">Сумма</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.amount ? viewDeal.amount.toLocaleString() + " ₸" : "—"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide">Дата</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.date || "—"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide">Брокер</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.broker || "—"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide">Район</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.district || "—"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide">Адрес</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.address || "—"}</p>
                  </div>
                  {!isZemlya && (
                    <>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Комнаты</p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.rooms || "—"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Площадь</p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.area ? viewDeal.area + " " + (viewDeal.area_unit || "м²") : "—"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">ЖК</p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.jk || "—"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Телефон</p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.phone || "—"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Номер договора</p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.contract || "—"}</p>
                      </div>
                    </>
                  )}
                  {!isPomescheniya && !isZemlya && (
                    <>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Меблировка</p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.furniture || "—"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Срок аренды</p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.rental_period || "—"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Кто проживает</p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.who_lives || "—"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Кол-во человек</p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.people_count || "—"}</p>
                      </div>
                    </>
                  )}
                  {isZemlya && (
                    <>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Тип участка</p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.plot_type || "—"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Назначение</p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.purpose || "—"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Коммуникации</p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.communications || "—"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Подъезд</p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.access || "—"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Форма участка</p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.plot_shape || "—"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Рельеф</p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.relief || "—"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Документы</p>
                        {(() => {
                          const docs = (() => { try { const p = JSON.parse(viewDeal.documents || "[]"); return Array.isArray(p) ? p : []; } catch { return viewDeal.documents ? [{ name: viewDeal.documents, url: viewDeal.documents }] : []; } })();
                          return docs.length ? (
                            <div className="space-y-1 mt-1">
                              {docs.map((d: { name: string; url: string }, i: number) => (
                                <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"><FileText className="w-3.5 h-3.5 shrink-0" />{d.name}</a>
                              ))}
                            </div>
                          ) : <p className="text-sm font-medium text-gray-800 mt-0.5">—</p>;
                        })()}
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Ограничения</p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.restrictions || "—"}</p>
                      </div>
                    </>
                  )}
                  {isPomescheniya && (
                    <>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Отделка</p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.finishing || "—"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Планировка</p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.layout || "—"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Меблировка</p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.furniture || "—"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Тип арендатора</p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.renter_type || "—"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Оплата</p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{viewDeal.payment || "—"}</p>
                      </div>
                    </>
                  )}
                </div>

                {viewDeal.notes && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide">Заметки</p>
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{viewDeal.notes}</p>
                  </div>
                )}
              </div>
              <div className="w-[320px] shrink-0 border-l bg-gray-50/80 flex flex-col">
                <div className="px-4 py-3 border-b shrink-0">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><History className="w-3.5 h-3.5" />Журнал действий</h3>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                  {activityLoading ? (
                    <div className="text-sm text-gray-400 flex items-center gap-2 py-2"><Loader2 className="w-4 h-4 animate-spin" />Загрузка...</div>
                  ) : activity.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">Действий пока нет</p>
                  ) : (
                    activity.map(a => (
                      <div key={a.id} className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0">{getInitials(a.actor_name)}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-800 leading-relaxed">
                            <span className="font-medium">{a.actor_name || "Сотрудник"}</span>{" "}{a.message}
                            <button
                              onClick={() => setActivityDeleteTarget(a)}
                              title="Удалить"
                              className="ml-1 p-0.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors align-middle opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </p>
                          {a.changes && a.changes.length > 0 && (
                            <div className="mt-1 space-y-0.5 rounded bg-white border border-gray-100 px-2 py-1.5">
                              {a.changes.map(ch => (
                                <p key={ch.field} className="text-[11px] text-gray-500 flex flex-wrap items-baseline gap-x-1">
                                  <span className="text-gray-400">{ch.label}:</span>
                                  <span className="text-gray-400 line-through">{ch.oldValue}</span>
                                  <span>→</span>
                                  <span className="font-medium text-gray-700">{ch.newValue}</span>
                                </p>
                              ))}
                            </div>
                          )}
                          <p className="text-[11px] text-gray-400 mt-0.5">{formatDateTime(a.created_at)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t shrink-0">
              <Button variant="outline" size="sm" onClick={() => { setViewDeal(null); setEditDeal({ ...viewDeal } as EditableDeal); }}>Редактировать</Button>
              <Button variant="ghost" size="sm" onClick={() => setViewDeal(null)}>Закрыть</Button>
            </div>
          </div>
        </div>
      )}

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
        <AssignTaskModal clientName={viewDeal.name || ""} onClose={() => setShowTask(false)} />
      )}

      <ConfirmDialog
        open={!!activityDeleteTarget}
        title="Удаление записи"
        message={activityDeleteTarget ? "Удалить действие из журнала для этой сделки?" : ""}
        hint="Запись будет удалена без возможности восстановления."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        onConfirm={handleDeleteActivity}
        onCancel={() => setActivityDeleteTarget(null)}
      />
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
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const typeParam = searchParams.get("type");

  const selectedCategory: string | null = VALID_CATEGORIES.includes(categoryParam ?? "") ? categoryParam! : null;
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
