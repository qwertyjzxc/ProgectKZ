"use client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePlus, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function AddPropertyForm({ property, onSuccess }: { property?: any; onSuccess?: () => void }) {
  const isEdit = !!property;
  const [title, setTitle] = useState(property?.title || "");
  const [price, setPrice] = useState(property?.price ? String(property.price) : "");
  const [rooms, setRooms] = useState(property?.rooms ? String(property.rooms) : "");
  const [address, setAddress] = useState(property?.address || "");
  const [city, setCity] = useState(property?.city || "");
  const [bType, setBType] = useState(property?.building_type || "");
  const [complex, setComplex] = useState(property?.complex_name || "");
  const [year, setYear] = useState(property?.year_built ? String(property.year_built) : "");
  const [area, setArea] = useState(property?.area ? String(property.area) : "");
  const [bath, setBath] = useState(property?.bathroom || "");
  const [ceil, setCeil] = useState(property?.ceiling_height ? String(property.ceiling_height) : "");
  const [desc, setDesc] = useState(property?.description || "");
  const [propStatus, setPropStatus] = useState(property?.status || "Активно");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(property?.image_urls?.length ? property.image_urls : []);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle"|"success"|"error">("idle");
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const btnText = loading ? "Загрузка..." : isEdit ? "Сохранить" : "Добавить";

  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sel = Array.from(e.target.files || []); if (!sel.length) return;
    setFiles(p => [...p, ...sel]); setPreviews(p => [...p, ...sel.map(f => URL.createObjectURL(f))]);
  };
  const rmFile = (i: number) => { setFiles(p => p.filter((_,j)=>j!==i)); setPreviews(p => p.filter((_,j)=>j!==i)); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!title || !price) return;
    setLoading(true); setStatus("idle");
    const fd = new FormData();
    fd.append("title",title);fd.append("price",price);fd.append("rooms",rooms);
    fd.append("address",address);fd.append("city",city);fd.append("building_type",bType);
    fd.append("complex_name",complex);fd.append("year_built",year);fd.append("area",area);
    fd.append("bathroom",bath);fd.append("ceiling_height",ceil);fd.append("description",desc);fd.append("status",propStatus);
    files.forEach(f=>fd.append("images",f));
    const url = isEdit ? `/api/properties/${property.id}` : "/api/properties";
    try {
      const res = await fetch(url, { method: isEdit ? "PUT" : "POST", body: fd });
      const data = await res.json();
      if (res.ok) { setStatus("success"); setMsg(isEdit ? "Обновлено!" : "Добавлено!"); if (!isEdit) { setTitle(""); setPrice(""); setRooms(""); setAddress(""); setCity(""); setBType(""); setComplex(""); setYear(""); setArea(""); setBath(""); setCeil(""); setDesc(""); setFiles([]); setPreviews([]); if (fileRef.current) fileRef.current.value = ""; } onSuccess?.(); }
      else { setStatus("error"); setMsg(data.error || "Ошибка"); }
    } catch { setStatus("error"); setMsg("Сетевая ошибка"); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><ImagePlus className="w-5 h-5 text-blue-600" />{isEdit?"Редактировать":"Добавить объект"}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2"><label className="text-xs text-gray-500 mb-1 block">Название *</label><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="2-к квартира, ЖК Комфорт" required className="text-sm" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Цена, ₸ *</label><Input value={price} onChange={e=>setPrice(e.target.value)} type="number" placeholder="25000000" required className="text-sm" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Кол-во комнат</label><Input value={rooms} onChange={e=>setRooms(e.target.value)} type="number" placeholder="2" className="text-sm" /></div>
        <div className="md:col-span-2"><label className="text-xs text-gray-500 mb-1 block">Адрес</label><Input value={address} onChange={e=>setAddress(e.target.value)} placeholder="ул. Абая, 42" className="text-sm" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Статус</label><select value={propStatus} onChange={e=>setPropStatus(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option>Активно</option><option>Продано</option><option>Сдано</option><option>Неактивно</option></select></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Город</label><Input value={city} onChange={e=>setCity(e.target.value)} placeholder="Алматы" className="text-sm" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Тип дома</label><select value={bType} onChange={e=>setBType(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Не выбрано</option><option>Кирпичный</option><option>Монолитный</option><option>Панельный</option></select></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Жилой комплекс</label><Input value={complex} onChange={e=>setComplex(e.target.value)} placeholder="ЖК Комфорт" className="text-sm" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Год постройки</label><Input value={year} onChange={e=>setYear(e.target.value)} type="number" placeholder="2020" className="text-sm" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Площадь, м²</label><Input value={area} onChange={e=>setArea(e.target.value)} type="number" placeholder="65" className="text-sm" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Санузел</label><select value={bath} onChange={e=>setBath(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option value="">Не выбрано</option><option>Совмещённый</option><option>Раздельный</option></select></div>
        <div><label className="text-xs text-gray-500 mb-1 block">Высота потолков, м</label><Input value={ceil} onChange={e=>setCeil(e.target.value)} type="number" step="0.1" placeholder="2.7" className="text-sm" /></div>
      </div>
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
  );
}

