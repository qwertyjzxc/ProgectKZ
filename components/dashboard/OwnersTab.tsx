"use client";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, X, Phone, User, Search, Trash2, Edit3 } from "lucide-react";
import { SHYMKENT_DISTRICTS } from "@/lib/shymkent";
import ConfirmDialog from "@/components/ConfirmDialog";
import PhoneInput, { maskKzPhone } from "@/components/PhoneInput";
import MoneyInput from "@/components/MoneyInput";
import { formatMoney } from "@/lib/format";
import FileUploader, { type AttachmentFile } from "@/components/FileUploader";

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
  notes?: string;
  broker?: string;
  documents?: string;
}

const CATEGORIES = [
  { id: "kvartiry", label: "Квартиры" },
  { id: "pomescheniya", label: "Помещения" },
  { id: "zemlya", label: "Земельные участки" },
  { id: "doma", label: "Дома" },
];

const CONDITIONS = ["Новое", "Хорошее", "Требует ремонта"];
const LOCATION_LINES = ["1 линия (вдоль главной дороги)", "2 линия (второстепенная дорога, во дворе)"];
const CONTRACT_KINDS = ["Эксклюзивный", "Стандартный"];

const STATUSES = ["Новый собственник", "Оценка объекта", "Заключение договора", "Упаковка + Маркетинг", "Сделка"];

const statusColors: Record<string, string> = {
  "Новый собственник": "bg-violet-100 text-violet-800",
  "Оценка объекта": "bg-sky-100 text-sky-800",
  "Заключение договора": "bg-indigo-100 text-indigo-800",
  "Упаковка + Маркетинг": "bg-teal-100 text-teal-800",
  "Сделка": "bg-green-100 text-green-800",
};

const AUTHORS = ["Айгерим", "Гульнара", "Дина", "Роман"];

function OwnerForm({ owner, category, onClose, onSaved }: { owner: Owner | null; category: string; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!owner;
  const [name, setName] = useState(owner?.name || "");
  const [phone, setPhone] = useState(owner?.phone || "");
  const [district, setDistrict] = useState(owner?.district || "");
  const [address, setAddress] = useState(owner?.address || "");
  const [jk, setJk] = useState(owner?.jk || "");
  const [rooms, setRooms] = useState(owner?.rooms || "");
  const [area, setArea] = useState(owner?.area || "");
  const [areaUnit, setAreaUnit] = useState(owner?.area_unit || "сот");
  const [price, setPrice] = useState(owner?.price ? String(owner.price) : "");
  const [contractType, setContractType] = useState(owner?.contract_type || "");
  const [status, setStatus] = useState(owner?.status || "Новый собственник");
  const [condition, setCondition] = useState(owner?.condition || "");
  const [locationLine, setLocationLine] = useState(owner?.location_line || "");
  const [contractKind, setContractKind] = useState(owner?.contract_kind || "");
  const [houseArea, setHouseArea] = useState(owner?.house_area || "");
  const [landArea, setLandArea] = useState(owner?.land_area || "");
  const [notes, setNotes] = useState(owner?.notes || "");
  const [broker, setBroker] = useState(owner?.broker || "");
  const [documents, setDocuments] = useState<AttachmentFile[]>(() => {
    try {
      const p = JSON.parse(owner?.documents || "[]");
      return Array.isArray(p) ? p : [];
    } catch {
      return owner?.documents ? [{ name: owner.documents, url: owner.documents }] : [];
    }
  });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const body = { name, phone, district, address, jk, rooms, area, area_unit: areaUnit, house_area: houseArea, land_area: landArea, price, contract_type: contractType, contract_kind: contractKind, status, condition, location_line: locationLine, notes, broker, documents: JSON.stringify(documents) };
    const url = isEdit ? `/api/owners/${owner.id}?category=${category}` : `/api/owners?category=${category}`;
    try {
      const res = await fetch(url, { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { onSaved(); onClose(); }
      else { alert(await res.text()); }
    } finally { setLoading(false); }
  };

  const showJk = category === "kvartiry";
  const showRooms = category === "kvartiry";
  const showAreaUnit = category === "zemlya";

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><User className="w-5 h-5 text-blue-600" />{isEdit ? "Редактировать" : "Добавить"} собственника</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2"><label className="text-xs text-gray-500 mb-1 block">Имя *</label><Input value={name} onChange={e => setName(e.target.value)} placeholder="ФИО собственника" required className="text-sm" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Телефон</label><PhoneInput value={phone} onChange={setPhone} className="h-9" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Район</label><select value={district} onChange={e => setDistrict(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Не выбран</option>{SHYMKENT_DISTRICTS.map(d => <option key={d}>{d}</option>)}</select></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Адрес</label><Input value={address} onChange={e => setAddress(e.target.value)} placeholder="ул. ..." className="text-sm" /></div>
        {showJk && <div><label className="text-xs text-gray-500 mb-1 block">ЖК</label><Input value={jk} onChange={e => setJk(e.target.value)} placeholder="ЖК Комфорт" className="text-sm" /></div>}
        {showRooms && <div><label className="text-xs text-gray-500 mb-1 block">Комнаты</label><Input value={rooms} onChange={e => setRooms(e.target.value)} placeholder="2-комн." className="text-sm" /></div>}
        <div><label className="text-xs text-gray-500 mb-1 block">Площадь</label><Input value={area} onChange={e => setArea(e.target.value)} placeholder="65" className="text-sm" /></div>
        {showAreaUnit && <div><label className="text-xs text-gray-500 mb-1 block">Ед. изм.</label><select value={areaUnit} onChange={e => setAreaUnit(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option>сот</option><option>га</option><option>м²</option></select></div>}
        <div><label className="text-xs text-gray-500 mb-1 block">Цена, ₸</label><MoneyInput value={price} onChange={setPrice} placeholder="20 000 000" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Тип договора</label><Input value={contractType} onChange={e => setContractType(e.target.value)} placeholder="Агентский" className="text-sm" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Вид договора</label><select value={contractKind} onChange={e => setContractKind(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Не выбран</option>{CONTRACT_KINDS.map(k => <option key={k}>{k}</option>)}</select></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Состояние</label><select value={condition} onChange={e => setCondition(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Не указано</option>{CONDITIONS.map(k => <option key={k}>{k}</option>)}</select></div>
        {category === "pomescheniya" && (
          <div><label className="text-xs text-gray-500 mb-1 block">Расположение коммерции</label><select value={locationLine} onChange={e => setLocationLine(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Не указано</option>{LOCATION_LINES.map(k => <option key={k}>{k}</option>)}</select></div>
        )}
        {category === "doma" && (
          <>
            <div><label className="text-xs text-gray-500 mb-1 block">Площадь дома, м²</label><Input value={houseArea} onChange={e => setHouseArea(e.target.value)} placeholder="120" className="text-sm" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Площадь участка, сот</label><Input value={landArea} onChange={e => setLandArea(e.target.value)} placeholder="10" className="text-sm" /></div>
          </>
        )}
        <div><label className="text-xs text-gray-500 mb-1 block">Статус</label><select value={status} onChange={e => setStatus(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm">{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Брокер</label><select value={broker} onChange={e => setBroker(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Не выбран</option>{AUTHORS.map(a => <option key={a}>{a}</option>)}</select></div>
      </div>
      <div><label className="text-xs text-gray-500 mb-1 block">Заметки</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Заметки..." className="w-full rounded-lg border px-3 py-2 text-sm resize-y" /></div>
      <FileUploader title="Документы" files={documents} onChange={setDocuments} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 gap-2">{loading && <><Loader2 className="w-4 h-4 animate-spin" /> </>}{isEdit ? "Сохранить" : "Добавить"}</Button>
      </div>
    </form>
  );
}

export default function OwnersTab() {
  const [category, setCategory] = useState("kvartiry");
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editOwner, setEditOwner] = useState<Owner | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Owner | null>(null);

  const load = async (cat: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/owners?category=${cat}`);
      const d = await res.json();
      if (Array.isArray(d)) setOwners(d);
      else setError(d.error || "Ошибка загрузки");
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; setState происходит после await
  useEffect(() => { load(category); }, [category]);

  const filtered = useMemo(() => {
    let r = owners;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      r = r.filter(o => o.name?.toLowerCase().includes(q) || o.phone?.toLowerCase().includes(q) || o.broker?.toLowerCase().includes(q));
    }
    return r;
  }, [owners, searchQuery]);

  const del = async (o: Owner) => {
    setConfirmDelete(null);
    const res = await fetch(`/api/owners/${o.id}?category=${category}`, { method: "DELETE" });
    if (res.ok) setOwners(prev => prev.filter(x => x.id !== o.id));
  };

  const stats = [
    { label: "Всего", value: owners.length, color: "text-gray-900" },
    ...STATUSES.slice(0, 3).map(s => ({ label: s, value: owners.filter(o => o.status === s).length, color: statusColors[s].split(" ")[1] || "text-gray-900" })),
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center rounded-lg border bg-white p-0.5 w-fit">
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCategory(c.id)} className={"px-3 py-1.5 rounded-md text-sm font-medium transition-colors " + (category === c.id ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100")}>
              {c.label}
            </button>
          ))}
        </div>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />Добавить</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">{s.label}</p><p className={"text-2xl font-bold mt-0.5 " + s.color}>{s.value}</p></div>
        ))}
      </div>

      <div className="relative mb-4 max-w-sm">
        <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск по имени, телефону, брокеру..." className="pl-10 h-9 text-sm bg-white" />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>

      {loading && <div className="bg-white rounded-xl shadow-sm border p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">{error}</div>}

      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="table-scroll overflow-auto max-h-[calc(100vh-280px)]">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3 font-semibold text-left sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Собственник</th>
                  <th className="px-4 py-3 font-semibold text-left sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Объект</th>
                  <th className="px-4 py-3 font-semibold text-left sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">ЖК/Район</th>
                  <th className="px-4 py-3 font-semibold text-left sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Площадь</th>
                  <th className="px-4 py-3 font-semibold text-left sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Цена</th>
                  <th className="px-4 py-3 font-semibold text-left sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Договор</th>
                  <th className="px-4 py-3 font-semibold text-left sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Статус</th>
                  <th className="px-4 py-3 font-semibold text-left sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Брокер</th>
                  <th className="px-4 py-3 font-semibold text-right sticky top-0 bg-gray-100 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gray-300">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">Собственники не найдены</td></tr>
                )}
                {filtered.map(o => (
                  <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{o.name}</p>
                      {o.phone && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{maskKzPhone(o.phone)}</p>}
                      {o.documents?.trim() && ((() => {
                        try {
                          const docs = JSON.parse(o.documents || "[]");
                          if (!Array.isArray(docs) || !docs.length) return null;
                          return (
                            <p className="text-xs text-blue-600 flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                              {docs.map((d: { name: string; url: string }, i: number) => (
                                <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[140px]">{d.name}</a>
                              ))}
                            </p>
                          );
                        } catch {
                          return null;
                        }
                      })())}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {o.rooms && <span className="block">{o.rooms}</span>}
                      {o.address && <span className="block text-xs text-gray-500">{o.address}</span>}
                      {!o.rooms && !o.address && <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {o.jk && <span className="block text-xs font-medium">{o.jk}</span>}
                      {o.district && <span className="block text-xs text-gray-500">{o.district}</span>}
                      {!o.jk && !o.district && <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {category === "doma"
                        ? <>
                          {o.house_area && <span className="block">Дом: {o.house_area} м²</span>}
                          {o.land_area && <span className="block text-xs text-gray-500">Участок: {o.land_area} сот</span>}
                          {!o.house_area && !o.land_area && <span className="text-gray-400">—</span>}
                        </>
                        : (o.area ? o.area + (category === "zemlya" ? " " + (o.area_unit || "сот") : " м²") : "—")}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{o.price ? formatMoney(o.price) : "—"}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {o.contract_type || "—"}
                      {o.contract_kind && <span className="block text-xs text-gray-500">{o.contract_kind}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {o.status && <span className={"text-xs px-2 py-0.5 rounded-full " + (statusColors[o.status] || "bg-gray-100 text-gray-500")}>{o.status}</span>}
                      {o.condition && <span className="block text-xs text-gray-500 mt-1">{o.condition}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{o.broker || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500" onClick={() => setEditOwner(o)}><Edit3 className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setConfirmDelete(o)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-xs text-gray-400 border-t">Показано: {filtered.length} из {owners.length}</div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end mb-2"><Button variant="ghost" size="icon" onClick={() => setShowAdd(false)} className="text-white"><X className="w-5 h-5" /></Button></div>
            <OwnerForm owner={null} category={category} onClose={() => setShowAdd(false)} onSaved={() => load(category)} />
          </div>
        </div>
      )}
      {editOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setEditOwner(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end mb-2"><Button variant="ghost" size="icon" onClick={() => setEditOwner(null)} className="text-white"><X className="w-5 h-5" /></Button></div>
            <OwnerForm owner={editOwner} category={category} onClose={() => setEditOwner(null)} onSaved={() => load(category)} />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Удаление собственника"
        message={`Удалить собственника «${confirmDelete?.name}»?`}
        hint="Действие необратимо."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        onConfirm={() => confirmDelete && del(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}