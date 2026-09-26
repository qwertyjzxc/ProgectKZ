"use client";

import { useState, useEffect, useMemo } from "react";
import { useEscapeKey } from "@/lib/use-escape";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Combobox from "@/components/Combobox";
import DatePicker from "@/components/DatePicker";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import PhoneInput from "@/components/PhoneInput";
import MoneyInput from "@/components/MoneyInput";
import FileUploader, { type AttachmentFile } from "@/components/FileUploader";
import { getReference } from "@/lib/ref-cache";
import {
  type Owner, OWNER_STATUSES, CONDITIONS, LOCATION_LINES,
  PREMISE_TYPES, FINISHING_TYPES, CONTRACT_KINDS,
} from "@/lib/owner-types";
import { SHYMKENT_DISTRICTS, SHYMKENT_JK } from "@/lib/shymkent";
import { useProfile, profileName } from "@/lib/profile-context";
import type { OwnerCategory } from "@/components/dashboard/OwnerCategorySelector";
import { ChevronDown, X } from "lucide-react";

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

export default function OwnerFormModal({ owner, category, onClose, onSave }: { owner?: Owner; category: OwnerCategory; onClose: () => void; onSave: (data: Record<string, unknown>) => void }) {
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
    getReference("districts").then(d => { if (d.length) setDistrictOptions(d); });
    getReference("residential_complexes").then(c => { if (c.length) setJkOptions(c); });
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
