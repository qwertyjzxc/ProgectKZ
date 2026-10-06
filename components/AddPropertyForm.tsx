"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Combobox from "@/components/Combobox";
import PhoneInput from "@/components/PhoneInput";
import ConfirmDialog from "@/components/ConfirmDialog";
import { getReference } from "@/lib/ref-cache";
import { SHYMKENT_DISTRICTS } from "@/lib/shymkent";
import type { ActivityEntry } from "@/lib/activity";
import { getInitials } from "@/lib/client-types";
import { useProfile } from "@/lib/profile-context";
import { ImagePlus, Loader2, CheckCircle, AlertCircle, History, Trash2 } from "lucide-react";
import MoneyInput from "@/components/MoneyInput";

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr || "";
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const PAYMENT_OPTIONS = ["QR", "Перечисление", "Наличные", "Удаленка"];

export interface Property {
  id: string;
  title?: string;
  price?: number;
  rooms?: number | null;
  address?: string;
  district?: string;
  city?: string;
  building_type?: string;
  complex_name?: string;
  year_built?: number | null;
  area?: number | null;
  bathroom?: string;
  ceiling_height?: number | null;
  description?: string;
  status?: string;
  image_url?: string;
  image_urls?: string[];
  property_type?: string;
  contract_number?: string;
  payment_method?: string;
  contacts?: string;
}

export default function AddPropertyForm({ property, onSuccess }: { property?: Property; onSuccess?: () => void }) {
  const isEdit = !!property;
  const [title, setTitle] = useState(property?.title || "");
  const [price, setPrice] = useState(property?.price ? String(property.price) : "");
  const [propType, setPropType] = useState(property?.property_type || "");
  const [rooms, setRooms] = useState(property?.rooms ? String(property.rooms) : "");
  const [address, setAddress] = useState(property?.address || "");
  const [district, setDistrict] = useState(property?.district || "");
  const [districtOptions, setDistrictOptions] = useState<string[]>(SHYMKENT_DISTRICTS);
  const [city, setCity] = useState(property?.city || "");
  const [bType, setBType] = useState(property?.building_type || "");
  const [complex, setComplex] = useState(property?.complex_name || "");
  const [year, setYear] = useState(property?.year_built ? String(property.year_built) : "");
  const [area, setArea] = useState(property?.area ? String(property.area) : "");
  const [bath, setBath] = useState(property?.bathroom || "");
  const [ceil, setCeil] = useState(property?.ceiling_height ? String(property.ceiling_height) : "");
  const [contractNumber, setContractNumber] = useState(property?.contract_number || "");
  const [paymentMethod, setPaymentMethod] = useState(property?.payment_method || "");
  const [contacts, setContacts] = useState(property?.contacts || "");
  const [desc, setDesc] = useState(property?.description || "");
  const [propStatus, setPropStatus] = useState(property?.status || "Активно");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(property?.image_urls?.length ? property.image_urls : []);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle"|"success"|"error">("idle");
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const btnText = loading ? "Загрузка..." : isEdit ? "Сохранить" : "Добавить";
  // Способ оплаты: старое значение из свободного ввода показываем, чтобы не пропадало
  const paymentOptions = paymentMethod && !PAYMENT_OPTIONS.includes(paymentMethod) ? [...PAYMENT_OPTIONS, paymentMethod] : PAYMENT_OPTIONS;

  // Как в клиентах: справочник районов Шымкента (локальный список + обновления из референсов)
  useEffect(() => {
    getReference("districts").then(d => { if (d.length) setDistrictOptions(d); });
  }, []);

  // Журнал действий объекта (как в карточках клиентов и собственников)
  const { currentProfile } = useProfile();
  const isAdmin = currentProfile?.role === "admin";
  const propertyId = property?.id || "";
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(!!propertyId);
  const [deleteTarget, setDeleteTarget] = useState<ActivityEntry | null>(null);

  const loadActivity = useCallback(() => {
    if (!propertyId) return;
    fetch("/api/activity?client_table=properties&client_id=" + propertyId)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setActivity(data); })
      .catch(() => {})
      .finally(() => setActivityLoading(false));
  }, [propertyId]);

  useEffect(() => { loadActivity(); }, [loadActivity]);

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

  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sel = Array.from(e.target.files || []); if (!sel.length) return;
    setFiles(p => [...p, ...sel]); setPreviews(p => [...p, ...sel.map(f => URL.createObjectURL(f))]);
  };
  const rmFile = (i: number) => { setFiles(p => p.filter((_,j)=>j!==i)); setPreviews(p => p.filter((_,j)=>j!==i)); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!title || !price) return;
    setLoading(true); setStatus("idle");
    const fd = new FormData();
    fd.append("title",title);fd.append("price",price);fd.append("property_type",propType);fd.append("rooms",rooms);
    fd.append("address",address);fd.append("district",district);fd.append("city",city);fd.append("building_type",bType);
    fd.append("complex_name",complex);fd.append("year_built",year);fd.append("area",area);
    fd.append("bathroom",bath);fd.append("ceiling_height",ceil);fd.append("description",desc);fd.append("status",propStatus);
    fd.append("contract_number",contractNumber);fd.append("payment_method",paymentMethod);fd.append("contacts",contacts);
    files.forEach(f=>fd.append("images",f));
    const url = isEdit ? `/api/properties/${property.id}` : "/api/properties";
    try {
      const res = await fetch(url, { method: isEdit ? "PUT" : "POST", body: fd });
      const data = await res.json();
      if (res.ok) { setStatus("success"); setMsg(isEdit ? "Обновлено!" : "Добавлено!"); if (!isEdit) { setTitle(""); setPrice(""); setPropType(""); setRooms(""); setAddress(""); setDistrict(""); setCity(""); setBType(""); setComplex(""); setYear(""); setArea(""); setBath(""); setCeil(""); setContractNumber(""); setPaymentMethod(""); setContacts(""); setDesc(""); setFiles([]); setPreviews([]); if (fileRef.current) fileRef.current.value = ""; } onSuccess?.(); }
      else { setStatus("error"); setMsg(data.error || "Ошибка"); }
    } catch { setStatus("error"); setMsg("Сетевая ошибка"); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm flex overflow-hidden">
      {/* Журнал действий — как в карточке клиента */}
      <div className="w-[320px] shrink-0 border-r bg-gray-50/80 flex flex-col">
        <div className="px-4 py-3 border-b shrink-0">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><History className="w-3.5 h-3.5" />Журнал действий</h3>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {activityLoading ? (
            <div className="text-sm text-gray-400 flex items-center gap-2 py-2"><Loader2 className="w-4 h-4 animate-spin" />Загрузка...</div>
          ) : activity.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">{isEdit ? "Действий пока нет" : "Записи появятся после создания объекта"}</p>
          ) : (
            activity.map(a => (
              <div key={a.id} className="flex items-start gap-2.5 group">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0">{getInitials(a.actor_name)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-800 leading-relaxed">
                    <span className="font-medium">{a.actor_name || "Сотрудник"}</span>{" "}{a.message}
                    {isAdmin && (
                      <button
                        onClick={() => setDeleteTarget(a)}
                        title="Удалить"
                        className="ml-1 p-0.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors align-middle opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
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
      <form onSubmit={submit} className="flex-1 min-w-0 p-6 space-y-4">
      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><ImagePlus className="w-5 h-5 text-blue-600" />{isEdit?"Редактировать":"Добавить объект"}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2"><label className="text-xs text-gray-500 mb-1 block">Название *</label><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="2-к квартира, ЖК Комфорт" required className="text-sm" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Тип объекта</label><select value={propType} onChange={e=>setPropType(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Не выбрано</option><option>Квартира</option><option>Дом</option><option>Участок</option></select></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Номер договора</label><Input value={contractNumber} onChange={e=>setContractNumber(e.target.value)} placeholder="Д-0001" className="text-sm" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Способ оплаты</label><select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Не указано</option>{paymentOptions.map(o=><option key={o}>{o}</option>)}</select></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Контакты</label><PhoneInput value={contacts} onChange={setContacts} /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Цена, ₸ *</label><MoneyInput value={price} onChange={setPrice} placeholder="25 000 000" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Кол-во комнат</label><Input value={rooms} onChange={e=>setRooms(e.target.value)} type="number" placeholder="2" className="text-sm" /></div>
        <div className="md:col-span-2"><label className="text-xs text-gray-500 mb-1 block">Адрес</label><Input value={address} onChange={e=>setAddress(e.target.value)} placeholder="ул. Абая, 42" className="text-sm" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Район</label><Combobox value={district} onChange={setDistrict} options={districtOptions} placeholder="Выберите район Шымкента" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Город</label><Input value={city} onChange={e=>setCity(e.target.value)} placeholder="Алматы" className="text-sm" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Статус</label><select value={propStatus} onChange={e=>setPropStatus(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option>Активно</option><option>Продано</option><option>Сдано</option><option>Неактивно</option></select></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Тип дома</label><select value={bType} onChange={e=>setBType(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Не выбрано</option><option>Кирпичный</option><option>Монолитный</option><option>Панельный</option></select></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Жилой комплекс</label><Input value={complex} onChange={e=>setComplex(e.target.value)} placeholder="ЖК Комфорт" className="text-sm" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Год постройки</label><Input value={year} onChange={e=>setYear(e.target.value)} type="number" placeholder="2020" className="text-sm" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Площадь, м²</label><Input value={area} onChange={e=>setArea(e.target.value)} type="number" placeholder="65" className="text-sm" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Санузел</label><select value={bath} onChange={e=>setBath(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Не выбрано</option><option>Совмещённый</option><option>Раздельный</option></select></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Высота потолков, м</label><Input value={ceil} onChange={e=>setCeil(e.target.value)} type="number" step="0.1" placeholder="2.7" className="text-sm" /></div>
      </div>
      <p className="text-xs text-gray-400 -mt-1">Номер договора, способ оплаты и контакты видны только в системе и не отображаются на странице для клиентов.</p>
      <div><label className="text-xs text-gray-500 mb-1 block">Описание</label><textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3} placeholder="Описание..." className="w-full rounded-lg border px-3 py-2 text-sm resize-y" /></div>
      <div>
        <label className="text-xs text-gray-500 mb-2 block">Фото</label>
        <div className="flex flex-wrap gap-3">
          {previews.map((url,i)=>(
            <div key={i} className="relative w-28 h-28 rounded-xl overflow-hidden border group"><img src={url} alt="" className="w-full h-full object-cover" /><button type="button" onClick={()=>rmFile(i)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 text-xs">✕</button></div>
          ))}
          <label className="flex flex-col items-center justify-center w-28 h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors shrink-0"><ImagePlus className="w-6 h-6 text-gray-400" /><span className="text-xs text-gray-400 mt-1">{previews.length===0?"Добавить":"Ещё"}</span><input ref={fileRef} type="file" accept="image/*" multiple onChange={addFiles} className="hidden" /></label>
        </div>
        <p className="text-xs text-gray-400 mt-2">JPG, PNG, WebP. Можно несколько</p>
      </div>
      {status==="success"&&<div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm"><CheckCircle className="w-4 h-4"/>{msg}</div>}
      {status==="error"&&<div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm"><AlertCircle className="w-4 h-4"/>{msg}</div>}
      <div className="flex justify-end"><Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 gap-2">{loading&&<><Loader2 className="w-4 h-4 animate-spin"/> </>}{btnText}</Button></div>
      </form>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Удаление записи"
        message={deleteTarget ? "Удалить действие из журнала для этого объекта?" : ""}
        hint="Запись будет удалена без возможности восстановления."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        onConfirm={handleDeleteActivity}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

