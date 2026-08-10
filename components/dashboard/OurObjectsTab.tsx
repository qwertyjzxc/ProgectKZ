"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2, Trash2, Plus, X, Filter, Square, CheckSquare } from "lucide-react";
import AddPropertyForm from "@/components/AddPropertyForm";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Property {
  id: string; title: string; price: number; rooms: number | null;
  address: string; city?: string; building_type?: string; complex_name?: string;
  year_built?: number; area?: number; bathroom?: string; ceiling_height?: number;
  description: string; image_url: string; image_urls?: string[]; status?: string;
}

const statusColors: Record<string, string> = {
  "Активно": "bg-yellow-100 text-yellow-800",
  "Продано": "bg-green-100 text-green-800",
  "Сдано": "bg-purple-100 text-purple-800",
  "Неактивно": "bg-red-100 text-red-800",
};

export default function OurObjectsTab() {
  const [props, setProps] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editProp, setEditProp] = useState<Property | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterBType, setFilterBType] = useState("");
  const [filterRooms, setFilterRooms] = useState("");
  const [filterBath, setFilterBath] = useState("");
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");
  const [filterAreaMin, setFilterAreaMin] = useState("");
  const [filterAreaMax, setFilterAreaMax] = useState("");
  const [filterYearMin, setFilterYearMin] = useState("");
  const [filterYearMax, setFilterYearMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dragRef = useRef(false);

  useEffect(() => {
    const up = () => { dragRef.current = false; };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  const load = async () => {setLoading(true);const r=await window.fetch("/api/properties");const d=await r.json();if(Array.isArray(d))setProps(d);setLoading(false);};
  useEffect(()=>{load();},[]);

  const del=async(id:string)=>{if(!confirm("Удалить?"))return;await window.fetch("/api/properties/"+id,{method:"DELETE"});setProps(p=>p.filter(x=>x.id!==id));};
  const copyLink=async(id:string)=>{await navigator.clipboard.writeText(`${location.origin}/p/${id}`);setCopiedId(id);setTimeout(()=>setCopiedId(null),2000);};
  const hasFilters = filterStatus||filterCity||filterBType||filterRooms||filterBath||filterPriceMin||filterPriceMax||filterAreaMin||filterAreaMax||filterYearMin||filterYearMax;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCardPointerDown = (e: React.PointerEvent, id: string) => {
    if (!deleteMode || e.button !== 0) return;
    e.preventDefault();
    dragRef.current = true;
    toggleSelect(id);
  };

  const handleCardPointerEnter = (id: string) => {
    if (!deleteMode || !dragRef.current) return;
    toggleSelect(id);
  };

  const handleCardContextMenu = (e: React.MouseEvent, id: string) => {
    if (!deleteMode) return;
    e.preventDefault();
    toggleSelect(id);
  };

  const exitDeleteMode = () => {
    setDeleteMode(false);
    setSelectedIds(new Set());
  };

  const filtered = (() => {
    let r = props;
    if (filterStatus) r = r.filter(p => p.status === filterStatus);
    if (filterCity) r = r.filter(p => p.city === filterCity);
    if (filterBType) r = r.filter(p => p.building_type === filterBType);
    if (filterRooms) r = r.filter(p => String(p.rooms) === filterRooms);
    if (filterBath) r = r.filter(p => p.bathroom === filterBath);
    if (filterPriceMin) r = r.filter(p => p.price >= Number(filterPriceMin));
    if (filterPriceMax) r = r.filter(p => p.price <= Number(filterPriceMax));
    if (filterAreaMin) r = r.filter(p => (p.area||0) >= Number(filterAreaMin));
    if (filterAreaMax) r = r.filter(p => (p.area||0) <= Number(filterAreaMax));
    if (filterYearMin) r = r.filter(p => (p.year_built||0) >= Number(filterYearMin));
    if (filterYearMax) r = r.filter(p => (p.year_built||0) <= Number(filterYearMax));
    return r;
  })();

  const allVisibleSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(p.id));
  const handleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) filtered.forEach(p => next.delete(p.id));
      else filtered.forEach(p => next.add(p.id));
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const res = await window.fetch("/api/properties", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [...selectedIds] }) });
      if (res.ok) {
        setProps(prev => prev.filter(p => !selectedIds.has(p.id)));
        exitDeleteMode();
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant={hasFilters?"default":"outline"} size="sm" className="gap-1" onClick={()=>setShowFilters(!showFilters)}><Filter className="w-4 h-4"/> Фильтры</Button>
          {!deleteMode ? (
            <Button variant="outline" size="sm" onClick={() => { setDeleteMode(true); setSelectedIds(new Set()); }} className="gap-1 text-red-600 hover:text-red-700">
              <Trash2 className="w-4 h-4"/>Удалить
            </Button>
          ) : (
            <>
              <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)} disabled={selectedIds.size === 0 || deleting} className="gap-1">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Удалить ({selectedIds.size})
              </Button>
              <Button variant="ghost" size="sm" onClick={exitDeleteMode} className="gap-1 text-gray-500">
                <X className="w-4 h-4"/>Отмена
              </Button>
            </>
          )}
        </div>
        <Button className="gap-2 bg-blue-600" onClick={()=>setShowAdd(true)}><Plus className="w-4 h-4"/>Добавить</Button>
      </div>
      {deleteMode && (
        <div className="mb-4 flex items-center gap-2 text-xs text-gray-500 bg-red-50/60 border border-red-100 rounded-lg px-3 py-2">
          <button onClick={handleSelectAll} className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-medium" title={allVisibleSelected ? "Снять выделение" : "Выделить все"}>
            {allVisibleSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {allVisibleSelected ? "Снять выделение" : "Выделить все"}
          </button>
          <span className="text-gray-400">•</span>
          <span>Режим удаления: клик по карточке — выделить, зажмите кнопку и скролльте — выделить несколько</span>
        </div>
      )}
      {loading&&<div className="bg-white rounded-xl shadow-sm border p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400"/></div>}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <div className="bg-white rounded-xl border p-3 text-center"><p className="text-xs text-gray-500">Всего</p><p className="text-xl font-bold text-gray-900">{props.length}</p></div>
        <div className="bg-white rounded-xl border p-3 text-center"><p className="text-xs text-gray-500">Активно</p><p className="text-xl font-bold text-yellow-600">{props.filter(p=>p.status==="Активно").length}</p></div>
        <div className="bg-white rounded-xl border p-3 text-center"><p className="text-xs text-gray-500">Продано</p><p className="text-xl font-bold text-green-600">{props.filter(p=>p.status==="Продано").length}</p></div>
        <div className="bg-white rounded-xl border p-3 text-center"><p className="text-xs text-gray-500">Сдано</p><p className="text-xl font-bold text-purple-600">{props.filter(p=>p.status==="Сдано").length}</p></div>
        <div className="bg-white rounded-xl border p-3 text-center"><p className="text-xs text-gray-500">Неактивно</p><p className="text-xl font-bold text-red-500">{props.filter(p=>p.status==="Неактивно").length}</p></div>
      </div>

      {/* Filter chips */}
      {showFilters&&(
        <div className="mb-4 p-4 bg-white rounded-xl border space-y-3">
          <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-gray-500 w-16">Статус:</span>{["","Активно","Продано","Сдано","Неактивно"].map(s=>(<button key={s} onClick={()=>setFilterStatus(s)} className={`px-3 py-1 rounded-full text-xs border transition-colors ${filterStatus===s?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{s||"Все"}</button>))}</div>
          <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-gray-500 w-16">Город:</span><select value={filterCity} onChange={e=>setFilterCity(e.target.value)} className="h-8 rounded-lg border px-2 text-xs"><option value="">Все</option>{[...new Set(props.map(p=>p.city).filter(Boolean))].sort().map(c=><option key={c}>{c}</option>)}</select></div>
          <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-gray-500 w-16">Тип дома:</span><select value={filterBType} onChange={e=>setFilterBType(e.target.value)} className="h-8 rounded-lg border px-2 text-xs"><option value="">Все</option>{[...new Set(props.map(p=>p.building_type).filter(Boolean))].sort().map(t=><option key={t}>{t}</option>)}</select></div>
          <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-gray-500 w-16">Комнат:</span>{["1","2","3","4","5+"].map(n=>(<button key={n} onClick={()=>setFilterRooms(filterRooms===n?"":n)} className={`w-8 h-8 rounded-lg text-xs border transition-colors ${filterRooms===n?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{n}</button>))}</div>
          <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-gray-500 w-16">Санузел:</span><select value={filterBath} onChange={e=>setFilterBath(e.target.value)} className="h-8 rounded-lg border px-2 text-xs"><option value="">Все</option><option>Совмещённый</option><option>Раздельный</option></select></div>
          <div className="flex items-center gap-2"><span className="text-xs text-gray-500 w-16">Цена:</span><input value={filterPriceMin} onChange={e=>setFilterPriceMin(e.target.value)} placeholder="От" type="number" className="h-8 w-28 rounded-lg border px-2 text-xs"/><span className="text-xs text-gray-400">—</span><input value={filterPriceMax} onChange={e=>setFilterPriceMax(e.target.value)} placeholder="До" type="number" className="h-8 w-28 rounded-lg border px-2 text-xs"/></div>
          <div className="flex items-center gap-2"><span className="text-xs text-gray-500 w-16">Площадь:</span><input value={filterAreaMin} onChange={e=>setFilterAreaMin(e.target.value)} placeholder="От, м²" type="number" className="h-8 w-28 rounded-lg border px-2 text-xs"/><span className="text-xs text-gray-400">—</span><input value={filterAreaMax} onChange={e=>setFilterAreaMax(e.target.value)} placeholder="До, м²" type="number" className="h-8 w-28 rounded-lg border px-2 text-xs"/></div>
          <div className="flex items-center gap-2"><span className="text-xs text-gray-500 w-16">Год:</span><input value={filterYearMin} onChange={e=>setFilterYearMin(e.target.value)} placeholder="От" type="number" className="h-8 w-28 rounded-lg border px-2 text-xs"/><span className="text-xs text-gray-400">—</span><input value={filterYearMax} onChange={e=>setFilterYearMax(e.target.value)} placeholder="До" type="number" className="h-8 w-28 rounded-lg border px-2 text-xs"/></div>
        </div>
      )}

      {!loading&&(
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p=>{
            const isSelected = selectedIds.has(p.id);
            return (
            <div
              key={p.id}
              onPointerDown={e => handleCardPointerDown(e, p.id)}
              onPointerEnter={() => handleCardPointerEnter(p.id)}
              onContextMenu={e => handleCardContextMenu(e, p.id)}
              onClick={() => { if (!deleteMode) setEditProp(p); }}
              className={
                "bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md cursor-pointer transition-colors relative " +
                (isSelected ? "bg-red-100 ring-2 ring-red-400 border-red-400 " : deleteMode ? "hover:bg-red-50/50 hover:ring-1 hover:ring-red-300 " : "hover:ring-1 hover:ring-blue-200")
              }
            >
              {deleteMode && (
                <div className="absolute top-2 right-2 z-10">
                  <button
                    onPointerDown={e => e.stopPropagation()}
                    onContextMenu={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); toggleSelect(p.id); }}
                    className="w-6 h-6 rounded bg-white shadow-sm border flex items-center justify-center text-gray-500 hover:text-red-600 transition-colors"
                  >
                    {isSelected ? <CheckSquare className="w-4 h-4 text-red-500" /> : <Square className="w-4 h-4" />}
                  </button>
                </div>
              )}
              <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center overflow-hidden">{p.image_url?<img src={p.image_url} alt={p.title} className="w-full h-full object-cover"/>:<span className="text-gray-400 text-sm">Нет фото</span>}</div>
              <div className="p-4 space-y-1.5">
                <h3 className="font-semibold text-gray-900 line-clamp-1">{p.title}</h3>
                <div className="flex items-center justify-between">
                  <p className="text-xl font-bold text-blue-600">{Number(p.price).toLocaleString()} ₸</p>
                  {p.status&&<span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[p.status]||"bg-gray-100 text-gray-500"}`}>{p.status}</span>}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                  {p.rooms!=null&&<span>{p.rooms}-комн.</span>}
                  {p.area!=null&&<span>{p.area} м²</span>}
                  {p.city&&<span>{p.city}</span>}
                  {p.building_type&&<span>{p.building_type}</span>}
                  {p.complex_name&&<span>{p.complex_name}</span>}
                  {p.year_built&&<span>{p.year_built} г.</span>}
                  {p.bathroom&&<span>{p.bathroom}</span>}
                  {p.ceiling_height&&<span>{p.ceiling_height} м</span>}
                  {p.address&&<span className="line-clamp-1 w-full">{p.address}</span>}
                </div>
                {!deleteMode && (
                  <div className="flex gap-1 pt-2">
                    <Button variant="outline" size="icon-sm" className="h-7 w-7" onClick={(e)=>{e.stopPropagation();copyLink(p.id);}}>{copiedId===p.id?<Check className="w-3 h-3 text-green-500"/>:<Copy className="w-3 h-3"/>}</Button>
                    <Button variant="ghost" size="icon-sm" className="h-7 w-7 text-red-500" onClick={(e)=>{e.stopPropagation();del(p.id);}}><Trash2 className="w-3 h-3"/></Button>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
      {showAdd&&(<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={()=>setShowAdd(false)}><div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}><div className="flex justify-end mb-2"><Button variant="ghost" size="icon" onClick={()=>setShowAdd(false)} className="text-white"><X className="w-5 h-5"/></Button></div><AddPropertyForm onSuccess={()=>{load();setShowAdd(false);}}/></div></div>)}
      {editProp&&(<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={()=>setEditProp(null)}><div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}><div className="flex justify-end mb-2"><Button variant="ghost" size="icon" onClick={()=>setEditProp(null)} className="text-white"><X className="w-5 h-5"/></Button></div><AddPropertyForm property={editProp} onSuccess={()=>{load();setEditProp(null);}}/></div></div>)}

      <ConfirmDialog
        open={confirmDelete}
        title="Удаление объектов"
        message={`Удалить ${selectedIds.size} ${selectedIds.size === 1 ? "объект" : selectedIds.size < 5 ? "объекта" : "объектов"}?`}
        hint="Действие необратимо."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
