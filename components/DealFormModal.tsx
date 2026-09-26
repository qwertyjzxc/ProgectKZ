"use client";

import { useState, useEffect } from "react";
import { useEscapeKey } from "@/lib/use-escape";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Combobox from "@/components/Combobox";
import PhoneInput from "@/components/PhoneInput";
import MoneyInput from "@/components/MoneyInput";
import { getReference } from "@/lib/ref-cache";
import { SHYMKENT_DISTRICTS, SHYMKENT_JK } from "@/lib/shymkent";
import { type Deal, type DealFormValues, DEAL_STATUSES } from "@/lib/deal-types";
import { Upload, Trash2, FileText, X } from "lucide-react";

const PAYMENT_OPTIONS = ["Наличные", "Перечисление", "QR", "Удаленка"];

const COMMUNICATIONS_OPTIONS = ["Свет", "Вода", "Газ", "Интернет"];

export default function DealFormModal({ deal, onClose, onSave, dealType, category }: { deal?: Deal; onClose: () => void; onSave: (d: DealFormValues) => void; dealType?: string; category?: string }) {
  const [type, setType] = useState(deal?.type || "Квартира");
  useEscapeKey(onClose);
  const [area, setArea] = useState(deal?.area || "");
  const [areaUnit, setAreaUnit] = useState(deal?.area_unit || "сот");
  const [address, setAddress] = useState(deal?.address || "");
  const [jk, setJk] = useState(deal?.jk || "");
  const [contract, setContract] = useState(deal?.contract || "");
  const [date] = useState(deal?.date || new Date().toLocaleString("ru-RU").replace(",", "").slice(0, 16));
  const [name, setName] = useState(deal?.name || "");
  const [phone, setPhone] = useState(deal?.phone || "");
  const [district, setDistrict] = useState(deal?.district || "");
  const [districtOptions, setDistrictOptions] = useState<string[]>(SHYMKENT_DISTRICTS);
  const [jkOptions, setJkOptions] = useState<string[]>(SHYMKENT_JK);
  const [rooms, setRooms] = useState(deal?.rooms || "");
  const [amount, setAmount] = useState(deal?.amount ? String(deal.amount) : "");
  const [furniture, setFurniture] = useState(deal?.furniture || "");
  const [rentalPeriod, setRentalPeriod] = useState(deal?.rental_period || "");
  const [whoLives, setWhoLives] = useState(deal?.who_lives || "");
  const [peopleCount, setPeopleCount] = useState(deal?.people_count ? String(deal.people_count) : "1");
  const [notes, setNotes] = useState(deal?.notes || "");
  const [completed, setCompleted] = useState(deal?.completed || "В процессе");
  const [completionDate, setCompletionDate] = useState(deal?.completion_date || "");
  const [broker, setBroker] = useState(deal?.broker || "");
  const [layout, setLayout] = useState(deal?.layout || "");
  const [renterType, setRenterType] = useState(deal?.renter_type || "");
  const [payment, setPayment] = useState(deal?.payment || "");
  const [commission, setCommission] = useState(deal?.commission ? String(deal.commission) : "");
  const [ownerName, setOwnerName] = useState(deal?.owner_name || "");
  const [finishing, setFinishing] = useState(deal?.finishing || "");
  const [premiseType, setPremiseType] = useState(deal?.premise_type || "Отдельно стоящее здание");
  const [plotType, setPlotType] = useState(deal?.plot_type || "");
  const [purpose, setPurpose] = useState(deal?.purpose || "");
  const [communications, setCommunications] = useState<string[]>(() => {
    const raw = deal?.communications;
    return raw ? String(raw).split(",").map((s: string) => s.trim()).filter(Boolean) : [];
  });
  const [access, setAccess] = useState(deal?.access || "");
  const [plotShape, setPlotShape] = useState(deal?.plot_shape || "");
  const [relief, setRelief] = useState(deal?.relief || "");
  const [documents, setDocuments] = useState<{ name: string; url: string }[]>(() => {
    const raw = deal?.documents;
    if (!raw) return [];
    try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return raw ? [{ name: raw, url: raw }] : []; }
  });
  const [docUploading, setDocUploading] = useState(false);
  const [restrictions, setRestrictions] = useState(deal?.restrictions || "");
  const dealCategory = deal?.category || category || "arenda";
  const isPomescheniya = (dealType || deal?.dealType) === "pomescheniya";
  const isZemlya = (dealType || deal?.dealType) === "zemlya";

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
    getReference("districts").then(d => { if (d.length) setDistrictOptions(d); });
    getReference("residential-complexes").then(c => { if (c.length) setJkOptions(c); });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      type, area, address, jk, contract, date, name, phone, district, rooms,
      amount: parseInt(amount) || 0, furniture, rental_period: rentalPeriod,
      who_lives: whoLives, people_count: parseInt(peopleCount) || 1, notes, completed, broker,
      layout, renter_type: renterType, payment, commission: parseInt(commission) || 0, owner_name: ownerName, finishing, premise_type: premiseType,
      plot_type: plotType, purpose, communications: communications.join(", "), access, plot_shape: plotShape, relief, documents: JSON.stringify(documents), restrictions,
      area_unit: areaUnit, completion_date: completionDate,
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
            <div><label className="text-xs text-gray-500 mb-1 block">Телефон</label><PhoneInput value={phone} onChange={setPhone} className="h-9" /></div>
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
                  <select value={type} onChange={e => setType(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option>Квартира</option><option>Дома</option><option>Помещение</option></select>
                </div>
              )}
            </div>
            <div><label className="text-xs text-gray-500 mb-1 block">Дата и время обращения</label><Input value={date} readOnly className="text-sm bg-gray-50 cursor-not-allowed" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Район</label><Combobox value={district} onChange={setDistrict} options={districtOptions} placeholder="Выберите район" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Адрес</label><Input value={address} onChange={e => setAddress(e.target.value)} placeholder="ул., дом, кв." className="text-sm" /></div>
            {!isPomescheniya && !isZemlya && <div><label className="text-xs text-gray-500 mb-1 block">Жилой комплекс</label><Combobox value={jk} onChange={setJk} options={jkOptions} placeholder="Выберите жилой комплекс" /></div>}
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
            <div><label className="text-xs text-gray-500 mb-1 block">Сумма сделки, ₸</label><MoneyInput value={amount} onChange={setAmount} placeholder="25000000" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Номер договора</label><Input value={contract} onChange={e => setContract(e.target.value)} placeholder="№ договора" className="text-sm" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Комиссия агентства, ₸</label><MoneyInput value={commission} onChange={setCommission} placeholder="500 000" /></div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Способ оплаты</label>
              <select value={payment} onChange={e => setPayment(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Не указано</option>{PAYMENT_OPTIONS.map(o => <option key={o}>{o}</option>)}</select>
            </div>
            <div><label className="text-xs text-gray-500 mb-1 block">Собственник</label><Input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Имя собственника" className="text-sm" /></div>
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
                  <div><label className="text-xs text-gray-500 mb-1 block">Жилой комплекс</label><Combobox value={jk} onChange={setJk} options={jkOptions} placeholder="Выберите жилой комплекс" /></div>
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
            <div><label className="text-xs text-gray-500 mb-1 block">Дата завершения</label><Input type="date" value={completionDate} onChange={e => setCompletionDate(e.target.value)} className="text-sm" /></div>
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
